import { WilayaCommuneFields } from '@/components/common/WilayaCommuneFields';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  GROUPES_SANGUINS,
  SITUATION_FAMILIALE_LABELS,
  type GroupeSanguin,
  type SituationFamiliale,
} from '@/shared/types/rh';

const selectCls =
  'mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/10';

export interface EtatCivilFormValues {
  dateNaissance: string;
  sexe: '' | 'M' | 'F';
  lieuNaissanceWilaya: string;
  lieuNaissanceCommune: string;
  nationalite: string;
  nomPere: string;
  prenomPere: string;
  nomMere: string;
  prenomMere: string;
  situationFamiliale: '' | SituationFamiliale;
  numeroActeNaissance: string;
  groupeSanguin: '' | GroupeSanguin;
  conjointPrenom: string;
  conjointNom: string;
  dateMariage: string;
  nombreEnfants: string;
  enfantsScolarises: string;
}

interface Props {
  values: EtatCivilFormValues;
  onChange: (patch: Partial<EtatCivilFormValues>) => void;
  required?: boolean;
}

function showConjoint(situation: EtatCivilFormValues['situationFamiliale']) {
  return situation === 'marie' || situation === 'divorce' || situation === 'veuf';
}

export function EtatCivilFields({ values, onChange, required = false }: Props) {
  const conjointVisible = showConjoint(values.situationFamiliale);

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div>
        <Label>Date de naissance{required && ' *'}</Label>
        <Input
          type="date"
          value={values.dateNaissance}
          required={required}
          onChange={(e) => onChange({ dateNaissance: e.target.value })}
        />
      </div>
      <div>
        <Label>Sexe{required && ' *'}</Label>
        <select
          className={selectCls}
          value={values.sexe}
          required={required}
          onChange={(e) => onChange({ sexe: e.target.value as EtatCivilFormValues['sexe'] })}
        >
          <option value="">— Sélectionner —</option>
          <option value="M">Masculin</option>
          <option value="F">Féminin</option>
        </select>
      </div>
      <WilayaCommuneFields
        wilaya={values.lieuNaissanceWilaya}
        commune={values.lieuNaissanceCommune}
        wilayaLabel="Wilaya de naissance"
        communeLabel="Commune de naissance"
        required={required}
        onWilayaChange={(w) => onChange({ lieuNaissanceWilaya: w })}
        onCommuneChange={(c) => onChange({ lieuNaissanceCommune: c })}
      />
      <div>
        <Label>Nationalité</Label>
        <Input
          value={values.nationalite}
          placeholder="Algérienne"
          onChange={(e) => onChange({ nationalite: e.target.value })}
        />
      </div>
      <div>
        <Label>N° acte de naissance</Label>
        <Input
          value={values.numeroActeNaissance}
          onChange={(e) => onChange({ numeroActeNaissance: e.target.value })}
        />
      </div>
      <div>
        <Label>Groupe sanguin</Label>
        <select
          className={selectCls}
          value={values.groupeSanguin}
          onChange={(e) => onChange({ groupeSanguin: e.target.value as EtatCivilFormValues['groupeSanguin'] })}
        >
          <option value="">—</option>
          {GROUPES_SANGUINS.map((g) => (
            <option key={g} value={g}>{g}</option>
          ))}
        </select>
      </div>
      <div>
        <Label>Situation familiale</Label>
        <select
          className={selectCls}
          value={values.situationFamiliale}
          onChange={(e) =>
            onChange({ situationFamiliale: e.target.value as EtatCivilFormValues['situationFamiliale'] })
          }
        >
          <option value="">—</option>
          {(Object.entries(SITUATION_FAMILIALE_LABELS) as [SituationFamiliale, string][]).map(
            ([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ),
          )}
        </select>
      </div>

      <div className="sm:col-span-2">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Filiation</p>
      </div>
      <div>
        <Label>Prénom du père{required && ' *'}</Label>
        <Input
          value={values.prenomPere}
          required={required}
          onChange={(e) => onChange({ prenomPere: e.target.value })}
        />
      </div>
      <div>
        <Label>Nom du père{required && ' *'}</Label>
        <Input
          value={values.nomPere}
          required={required}
          onChange={(e) => onChange({ nomPere: e.target.value })}
        />
      </div>
      <div>
        <Label>Prénom de la mère{required && ' *'}</Label>
        <Input
          value={values.prenomMere}
          required={required}
          onChange={(e) => onChange({ prenomMere: e.target.value })}
        />
      </div>
      <div>
        <Label>Nom de jeune fille / nom de la mère{required && ' *'}</Label>
        <Input
          value={values.nomMere}
          required={required}
          onChange={(e) => onChange({ nomMere: e.target.value })}
        />
      </div>

      {conjointVisible && (
        <>
          <div className="sm:col-span-2">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Conjoint(e)</p>
          </div>
          <div>
            <Label>Prénom du conjoint</Label>
            <Input
              value={values.conjointPrenom}
              onChange={(e) => onChange({ conjointPrenom: e.target.value })}
            />
          </div>
          <div>
            <Label>Nom du conjoint</Label>
            <Input
              value={values.conjointNom}
              onChange={(e) => onChange({ conjointNom: e.target.value })}
            />
          </div>
          <div>
            <Label>Date de mariage</Label>
            <Input
              type="date"
              value={values.dateMariage}
              onChange={(e) => onChange({ dateMariage: e.target.value })}
            />
          </div>
        </>
      )}

      <div className="sm:col-span-2">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Enfants</p>
      </div>
      <div>
        <Label>Nombre d&apos;enfants à charge (IRG)</Label>
        <Input
          type="number"
          min={0}
          value={values.nombreEnfants}
          onChange={(e) => onChange({ nombreEnfants: e.target.value })}
        />
      </div>
      <div>
        <Label>Enfants scolarisés</Label>
        <Input
          type="number"
          min={0}
          value={values.enfantsScolarises}
          onChange={(e) => onChange({ enfantsScolarises: e.target.value })}
        />
      </div>
    </div>
  );
}

export const emptyEtatCivil = (): EtatCivilFormValues => ({
  dateNaissance: '',
  sexe: '',
  lieuNaissanceWilaya: '',
  lieuNaissanceCommune: '',
  nationalite: 'Algérienne',
  nomPere: '',
  prenomPere: '',
  nomMere: '',
  prenomMere: '',
  situationFamiliale: '',
  numeroActeNaissance: '',
  groupeSanguin: '',
  conjointPrenom: '',
  conjointNom: '',
  dateMariage: '',
  nombreEnfants: '0',
  enfantsScolarises: '0',
});

export function etatCivilFromEmploye(e: {
  dateNaissance?: string | null;
  sexe?: 'M' | 'F' | null;
  lieuNaissanceWilaya?: string | null;
  lieuNaissanceCommune?: string | null;
  nationalite?: string | null;
  nomPere?: string | null;
  prenomPere?: string | null;
  nomMere?: string | null;
  prenomMere?: string | null;
  situationFamiliale?: SituationFamiliale | null;
  numeroActeNaissance?: string | null;
  groupeSanguin?: GroupeSanguin | null;
  conjointPrenom?: string | null;
  conjointNom?: string | null;
  dateMariage?: string | null;
  enfantsCharge?: number;
  enfantsScolarises?: number;
}): EtatCivilFormValues {
  return {
    dateNaissance: e.dateNaissance ?? '',
    sexe: e.sexe ?? '',
    lieuNaissanceWilaya: e.lieuNaissanceWilaya ?? '',
    lieuNaissanceCommune: e.lieuNaissanceCommune ?? '',
    nationalite: e.nationalite ?? 'Algérienne',
    nomPere: e.nomPere ?? '',
    prenomPere: e.prenomPere ?? '',
    nomMere: e.nomMere ?? '',
    prenomMere: e.prenomMere ?? '',
    situationFamiliale: e.situationFamiliale ?? '',
    numeroActeNaissance: e.numeroActeNaissance ?? '',
    groupeSanguin: e.groupeSanguin ?? '',
    conjointPrenom: e.conjointPrenom ?? '',
    conjointNom: e.conjointNom ?? '',
    dateMariage: e.dateMariage ?? '',
    nombreEnfants: String(e.enfantsCharge ?? 0),
    enfantsScolarises: String(e.enfantsScolarises ?? 0),
  };
}

export function etatCivilToPayload(v: EtatCivilFormValues) {
  return {
    dateNaissance: v.dateNaissance.trim() || null,
    sexe: v.sexe || null,
    lieuNaissanceWilaya: v.lieuNaissanceWilaya.trim() || null,
    lieuNaissanceCommune: v.lieuNaissanceCommune.trim() || null,
    nationalite: v.nationalite.trim() || 'Algérienne',
    nomPere: v.nomPere.trim() || null,
    prenomPere: v.prenomPere.trim() || null,
    nomMere: v.nomMere.trim() || null,
    prenomMere: v.prenomMere.trim() || null,
    situationFamiliale: v.situationFamiliale || null,
    numeroActeNaissance: v.numeroActeNaissance.trim() || null,
    groupeSanguin: v.groupeSanguin || null,
    conjointPrenom: v.conjointPrenom.trim() || null,
    conjointNom: v.conjointNom.trim() || null,
    dateMariage: v.dateMariage.trim() || null,
    enfantsCharge: Number(v.nombreEnfants) || 0,
    enfantsScolarises: Number(v.enfantsScolarises) || 0,
  };
}
