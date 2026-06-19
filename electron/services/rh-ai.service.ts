import { getDatabase } from '../database/sqlite';
import { assertPermission } from './permissions.service';
import { writeAuditLog } from './audit.service';
import {
  countContratsEcheanceProche,
  getRhDashboard,
  getSuggestionsRenfort,
  listOrganisation,
  listRecrutements,
} from './rh.service';
import {
  getComparatifUnites,
  getPortRhSynthese,
  getPrevisionsEffectif,
  listOnboardingSuivi,
} from './rh-pilotage.service';
import type {
  RhAiAlerte,
  RhAiAnalysisResult,
  RhAiConfig,
  RhAiDecisionContext,
  RhAiProvider,
  RhAiRecommandation,
} from '../../src/shared/types/rh';

function assertRhAi(actorUserId: number): void {
  assertPermission(actorUserId, 'rh.manage');
}

export function getRhAiConfig(actorUserId: number): RhAiConfig {
  assertRhAi(actorUserId);
  const hasGemini = Boolean(process.env.GEMINI_API_KEY?.trim());
  const hasOpenai = Boolean(process.env.OPENAI_API_KEY?.trim());
  let provider: RhAiProvider = 'local';
  if (hasGemini) provider = 'gemini';
  else if (hasOpenai) provider = 'openai';
  return {
    hasGemini,
    hasOpenai,
    provider,
    geminiModel: process.env.GEMINI_MODEL?.trim() || 'gemini-2.0-flash',
    openaiModel: process.env.OPENAI_MODEL?.trim() || 'gpt-4o-mini',
  };
}

export function buildRhDecisionContext(actorUserId: number, hotelId?: number): RhAiDecisionContext {
  assertRhAi(actorUserId);
  const db = getDatabase();
  const dashboard = getRhDashboard(actorUserId, undefined, undefined, hotelId);
  const comparatif = getComparatifUnites(actorUserId);
  const previsions = getPrevisionsEffectif(actorUserId, { hotelId, moisAhead: 3 });
  const organisation = listOrganisation(actorUserId, hotelId);
  const renforts = getSuggestionsRenfort(actorUserId, 80, 14);
  const recrutements = listRecrutements(actorUserId, 'en_cours');
  const onboarding = listOnboardingSuivi(actorUserId, { enCoursOnly: true });
  const port = getPortRhSynthese(actorUserId);

  const certificationsExpire = (
    db.prepare(`
      SELECT COUNT(*) AS c FROM rh_employe_formations
      WHERE statut IN ('obtenu','en_cours') AND date_echeance IS NOT NULL
        AND date_echeance <= date('now', '+90 days')
    `).get() as { c: number }
  ).c;

  const bulletinsBrouillon = (
    db.prepare(`SELECT COUNT(*) AS c FROM rh_bulletins WHERE statut = 'brouillon'`).get() as { c: number }
  ).c;

  const primesMois = (
    db.prepare(`
      SELECT COALESCE(SUM(montant), 0) AS t FROM rh_primes
      WHERE periode = strftime('%Y-%m', 'now')
    `).get() as { t: number }
  ).t;

  const postesManque = organisation.lignes
    .filter((l) => l.statut === 'manque')
    .map((l) => ({
      hotelName: l.hotelName,
      posteNom: l.posteNom,
      ecart: l.ecart,
      responsableNom: l.responsableNom,
    }));

  const previsionsCritiques = previsions.filter((p) => p.delta > 0).slice(0, 6);

  return {
    genereLe: new Date().toISOString(),
    hotelId: hotelId ?? null,
    hotelName: dashboard.hotelName,
    periode: { debut: dashboard.periodeDebut, fin: dashboard.periodeFin },
    dashboard,
    comparatifUnites: hotelId ? comparatif.filter((c) => c.hotelId === hotelId) : comparatif,
    previsionsEffectif: previsionsCritiques,
    organisation: {
      totalManque: organisation.totalManque,
      totalSurplus: organisation.totalSurplus,
      postesEnManque: postesManque.slice(0, 10),
    },
    alertesMetier: {
      contratsCdd60j: countContratsEcheanceProche(actorUserId, 60),
      certifications90j: certificationsExpire,
      absencesAValider: dashboard.absencesEnAttente,
      pointagesAValider: dashboard.pointagesASoumettre,
      comptesEnAttente: dashboard.comptesEnAttente,
      bulletinsBrouillon,
      entretiens30j: dashboard.entretiensPlanifies,
    },
    recrutementsEnCours: recrutements.map((r) => ({
      id: r.id,
      candidat: `${r.candidatPrenom ?? ''} ${r.candidatNom}`.trim(),
      poste: r.posteNom,
      departement: r.departementNom,
    })),
    suggestionsRenfort: renforts.slice(0, 5),
    onboardingEnCours: (() => {
      const map = new Map<number, { employeId: number; nom: string; etapesRestantes: number }>();
      for (const s of onboarding) {
        const cur = map.get(s.employeId) ?? { employeId: s.employeId, nom: s.employeNom, etapesRestantes: 0 };
        if (s.statut === 'a_faire') cur.etapesRestantes += 1;
        map.set(s.employeId, cur);
      }
      return [...map.values()].filter((o) => o.etapesRestantes > 0);
    })(),
    portMaster: port,
    paie: { primesMoisCourant: primesMois },
  };
}

function buildLocalAnalysis(context: RhAiDecisionContext): Omit<RhAiAnalysisResult, 'context' | 'provider' | 'generatedAt'> {
  const alertes: RhAiAlerte[] = [];
  const recommandations: RhAiRecommandation[] = [];

  if (context.organisation.totalManque > 0) {
    alertes.push({
      niveau: 'critique',
      titre: 'Sous-effectif organisationnel',
      description: `${context.organisation.totalManque} poste(s) en manque sur l'organisation.`,
      action: 'Lancer des recrutements ciblés depuis l\'onglet Organisation.',
    });
    recommandations.push({
      priorite: 1,
      domaine: 'recrutement',
      titre: 'Recruter sur les postes en manque',
      detail: context.organisation.postesEnManque.map((p) => `${p.posteNom} (${p.hotelName}): ${p.ecart}`).join(' ; ') || 'Voir Organisation',
      impact: 'Réduction du risque opérationnel et amélioration du service client.',
    });
  }

  if (context.alertesMetier.contratsCdd60j > 0) {
    alertes.push({
      niveau: 'urgent',
      titre: 'Fin de CDD imminente',
      description: `${context.alertesMetier.contratsCdd60j} contrat(s) CDD expirent sous 60 jours.`,
      action: 'Anticiper renouvellement ou remplacement dans Contrats.',
    });
  }

  if (context.alertesMetier.certifications90j > 0) {
    alertes.push({
      niveau: 'urgent',
      titre: 'Certifications à renouveler',
      description: `${context.alertesMetier.certifications90j} certification(s) expirent sous 90 jours.`,
      action: 'Planifier les sessions dans Formations.',
    });
  }

  for (const p of context.previsionsEffectif) {
    if (p.delta > 0) {
      recommandations.push({
        priorite: 2,
        domaine: 'planning',
        titre: `Renfort prévu — ${p.hotelName} (${p.mois})`,
        detail: p.message,
        impact: `Effectif recommandé: ${p.effectifRecommande} vs ${p.effectifActuel} actuel(s).`,
      });
    }
  }

  for (const r of context.suggestionsRenfort) {
    alertes.push({
      niveau: 'attention',
      titre: `Forte occupation — ${r.hotelName}`,
      description: r.message,
      action: 'Ajuster planning et affectations.',
    });
  }

  if (context.alertesMetier.comptesEnAttente > 0) {
    recommandations.push({
      priorite: 2,
      domaine: 'admin',
      titre: 'Activer les comptes en attente',
      detail: `${context.alertesMetier.comptesEnAttente} compte(s) utilisateur à activer après recrutement.`,
      impact: 'Accélère l\'onboarding et l\'autonomie des nouveaux collaborateurs.',
    });
  }

  const meilleur = [...context.comparatifUnites].sort((a, b) => b.recettesParEffectif - a.recettesParEffectif)[0];
  const moinsBon = [...context.comparatifUnites].sort((a, b) => a.recettesParEffectif - b.recettesParEffectif)[0];
  if (meilleur && moinsBon && meilleur.hotelId !== moinsBon.hotelId && context.comparatifUnites.length > 1) {
    recommandations.push({
      priorite: 3,
      domaine: 'productivite',
      titre: 'Benchmark inter-unités',
      detail: `${meilleur.hotelName} affiche la meilleure productivité (${meilleur.recettesParEffectif} recettes/effectif) vs ${moinsBon.hotelName} (${moinsBon.recettesParEffectif}).`,
      impact: 'Partager les bonnes pratiques entre unités.',
    });
  }

  const coutEleve = context.comparatifUnites.find((c) => c.coutMainOeuvreSurCa > 45);
  if (coutEleve) {
    alertes.push({
      niveau: 'attention',
      titre: 'Masse salariale élevée',
      description: `${coutEleve.hotelName} : MS/CA à ${coutEleve.coutMainOeuvreSurCa} % (seuil indicatif 45 %).`,
      action: 'Analyser effectifs, heures sup. et productivité.',
    });
  }

  const synthese = [
    `Effectif actif : ${context.dashboard.effectifActif}. Masse salariale : ${context.dashboard.masseSalariale.toFixed(0)}.`,
    `Turnover ${context.dashboard.tauxTurnover} %, présence ${context.dashboard.tauxPresence} %, absentéisme ${context.dashboard.tauxAbsenteisme} %.`,
    context.organisation.totalManque > 0
      ? `Attention : ${context.organisation.totalManque} poste(s) en manque.`
      : 'Effectifs organisationnels globalement alignés.',
    context.recrutementsEnCours.length > 0
      ? `${context.recrutementsEnCours.length} recrutement(s) en cours.`
      : null,
  ].filter(Boolean).join(' ');

  return {
    synthese,
    alertes,
    recommandations: recommandations.sort((a, b) => a.priorite - b.priorite),
    indicateursCles: [
      { label: 'Effectif actif', valeur: String(context.dashboard.effectifActif) },
      { label: 'Recettes / effectif', valeur: String(context.dashboard.recettesParEffectif) },
      { label: 'Masse salariale', valeur: String(Math.round(context.dashboard.masseSalariale)) },
      { label: 'Manque effectif', valeur: String(context.organisation.totalManque) },
      { label: 'Turnover %', valeur: String(context.dashboard.tauxTurnover) },
    ],
    markdown: undefined,
  };
}

function extractJsonFromText(text: string): Record<string, unknown> | null {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = fenced ? fenced[1].trim() : text.trim();
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    const start = raw.indexOf('{');
    const end = raw.lastIndexOf('}');
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(raw.slice(start, end + 1)) as Record<string, unknown>;
      } catch {
        return null;
      }
    }
    return null;
  }
}

function mapAiResponse(parsed: Record<string, unknown>, fallback: ReturnType<typeof buildLocalAnalysis>): Omit<RhAiAnalysisResult, 'context' | 'provider' | 'generatedAt'> {
  const alertes = Array.isArray(parsed.alertes)
    ? (parsed.alertes as RhAiAlerte[])
    : fallback.alertes;
  const recommandations = Array.isArray(parsed.recommandations)
    ? (parsed.recommandations as RhAiRecommandation[])
    : fallback.recommandations;
  return {
    synthese: typeof parsed.synthese === 'string' ? parsed.synthese : fallback.synthese,
    alertes,
    recommandations,
    indicateursCles: Array.isArray(parsed.indicateursCles)
      ? (parsed.indicateursCles as RhAiAnalysisResult['indicateursCles'])
      : fallback.indicateursCles,
    markdown: typeof parsed.markdown === 'string' ? parsed.markdown : undefined,
  };
}

async function callGemini(context: RhAiDecisionContext, model: string): Promise<string> {
  const key = process.env.GEMINI_API_KEY!.trim();
  const prompt = buildPrompt(context);
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${key}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.3, maxOutputTokens: 4096 },
      }),
    },
  );
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gemini : ${res.status} — ${err.slice(0, 200)}`);
  }
  const data = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
}

async function callOpenai(context: RhAiDecisionContext, model: string): Promise<string> {
  const key = process.env.OPENAI_API_KEY!.trim();
  const prompt = buildPrompt(context);
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.3,
      max_tokens: 4096,
      messages: [
        {
          role: 'system',
          content: 'Tu es un directeur RH et financier expert en hôtellerie. Réponds uniquement en JSON valide.',
        },
        { role: 'user', content: prompt },
      ],
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenAI : ${res.status} — ${err.slice(0, 200)}`);
  }
  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  return data.choices?.[0]?.message?.content ?? '';
}

function buildPrompt(context: RhAiDecisionContext): string {
  return `Analyse les données RH hôtelières ci-dessous et produis un rapport de décision pour le management.

Réponds UNIQUEMENT avec un objet JSON (pas de texte avant/après) de cette forme :
{
  "synthese": "2-4 phrases exécutives en français",
  "alertes": [{"niveau":"critique|urgent|attention|info","titre":"...","description":"...","action":"..."}],
  "recommandations": [{"priorite":1,"domaine":"recrutement|planning|paie|formation|productivite|admin|port","titre":"...","detail":"...","impact":"..."}],
  "indicateursCles": [{"label":"...","valeur":"...","tendance":"hausse|baisse|stable"}],
  "markdown": "rapport détaillé markdown avec sections : Diagnostic, Risques, Actions 7j, Actions 30j, Arbitrages budget"
}

Priorise les décisions opérationnelles concrètes. Croise effectifs, recettes, occupation, paie, formations, PortMaster si pertinent.

DONNÉES :
${JSON.stringify(context, null, 2)}`;
}

export async function generateRhAiAnalysis(
  actorUserId: number,
  opts?: { hotelId?: number; provider?: RhAiProvider },
): Promise<RhAiAnalysisResult> {
  assertRhAi(actorUserId);
  const config = getRhAiConfig(actorUserId);
  const context = buildRhDecisionContext(actorUserId, opts?.hotelId);
  const local = buildLocalAnalysis(context);

  let provider: RhAiProvider = opts?.provider ?? config.provider;
  if (provider === 'gemini' && !config.hasGemini) provider = config.hasOpenai ? 'openai' : 'local';
  if (provider === 'openai' && !config.hasOpenai) provider = config.hasGemini ? 'gemini' : 'local';

  let analysis = local;
  let erreurIa: string | undefined;

  if (provider !== 'local') {
    try {
      const text =
        provider === 'gemini'
          ? await callGemini(context, config.geminiModel)
          : await callOpenai(context, config.openaiModel);
      const parsed = extractJsonFromText(text);
      if (parsed) {
        analysis = mapAiResponse(parsed, local);
      } else {
        analysis = { ...local, markdown: text, synthese: text.slice(0, 500) || local.synthese };
      }
    } catch (e) {
      erreurIa = e instanceof Error ? e.message : 'Erreur IA';
      analysis = {
        ...local,
        synthese: `${local.synthese} (Analyse IA indisponible : ${erreurIa}. Synthèse locale utilisée.)`,
      };
      provider = 'local';
    }
  }

  writeAuditLog({
    userId: actorUserId,
    action: 'READ',
    module: 'rh',
    description: `Analyse IA RH (${provider})${opts?.hotelId ? ` hôtel #${opts.hotelId}` : ''}`,
  });

  return {
    generatedAt: new Date().toISOString(),
    provider,
    context,
    erreurIa,
    ...analysis,
  };
}
