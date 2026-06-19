/* eslint-disable */
const FRAME = (active, title, subtitle, content, height) => `
<div class="mockup-body" style="height:${height||420}px">
  <div class="mock-sidebar">
    <div class="mock-logo">HMP Pro</div>
    <div class="mock-nav-section">Pilotage</div>
    <div class="mock-nav-item${active==='dashboard'?' active':''}">Dashboard global</div>
    <div class="mock-nav-item${active==='modules'?' active':''}">Modules</div>
    <div class="mock-nav-item${active==='rapports'?' active':''}">Rapports</div>
    <div class="mock-nav-section">Exploitation</div>
    <div class="mock-nav-item${active==='recettes'?' active':''}">Saisie journalière</div>
    <div class="mock-nav-item${active==='hebergement'?' active':''}">Hébergement</div>
    <div class="mock-nav-item${active==='encaissements'?' active':''}">Encaissements</div>
    <div class="mock-nav-item${active==='facturation'?' active':''}">Facturation</div>
    <div class="mock-nav-item${active==='clients'?' active':''}">Clients</div>
    <div class="mock-nav-section">Opérations</div>
    <div class="mock-nav-item${active==='stocks'?' active':''}">Stocks</div>
    <div class="mock-nav-item${active==='achats'?' active':''}">Achats</div>
    <div class="mock-nav-item${active==='maintenance'?' active':''}">Maintenance</div>
    <div class="mock-nav-section">RH</div>
    <div class="mock-nav-item${active==='rh'?' active':''}">RH & productivité</div>
    <div class="mock-nav-section">PortMaster</div>
    <div class="mock-nav-item${active==='port'?' active':''}">Dashboard port</div>
    <div class="mock-nav-section">Système</div>
    <div class="mock-nav-item${active==='settings'?' active':''}">Paramètres</div>
  </div>
  <div class="mock-main">
    <div class="mock-header">
      <div><h3>${title}</h3><span>${subtitle}</span></div>
      <div class="mock-header-actions">
        <span class="mock-btn">Exporter</span>
        <span class="mock-btn mock-btn-primary">+ Nouveau</span>
      </div>
    </div>
    <div class="mock-content">${content}</div>
  </div>
</div>`;

const KPI = (items) => `<div class="kpi-row">${items.map(i=>`<div class="kpi"><div class="kpi-label">${i.l}</div><div class="kpi-value ${i.c||''}">${i.v}</div></div>`).join('')}</div>`;
const TBL = (headers, rows) => `<table class="mock-table"><thead><tr>${headers.map(h=>`<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.map(r=>`<tr>${r.map(c=>`<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
const CHARTS = () => `<div class="chart-row"><div class="chart-box"><div class="chart-title">Évolution CA</div><div class="line-chart"></div></div><div class="chart-box"><div class="chart-title">Répartition par unité</div><div class="chart-bars"><div class="bar" style="height:45%"></div><div class="bar" style="height:70%"></div><div class="bar" style="height:55%"></div><div class="bar" style="height:85%"></div><div class="bar" style="height:60%"></div></div></div></div>`;

const SECTIONS = [
// ─── AUTHENTIFICATION ───
{
  id: 'login', group: 'Authentification', title: 'Connexion', route: '#/login',
  desc: 'Écran d\'authentification avec e-mail, mot de passe et option « Se souvenir de moi ».',
  tags: ['auth'],
  html: `<div class="login-mock">
    <div class="login-left"><div class="login-left-text"><h2>Hotel Metrics Pro</h2><p>Pilotage hôtelier & portuaire</p></div></div>
    <div class="login-right">
      <h3>Connexion</h3><p>Accédez à votre espace de pilotage.</p>
      <div class="form-field" style="margin-bottom:.5rem"><div class="form-label">Adresse e-mail</div><div class="form-input">direction@hotel.dz</div></div>
      <div class="form-field" style="margin-bottom:.5rem"><div class="form-label">Mot de passe</div><div class="form-input">••••••••</div></div>
      <div style="font-size:.55rem;color:#64748b;margin-bottom:.75rem">☑ Se souvenir de moi</div>
      <div class="mock-btn mock-btn-primary" style="display:block;text-align:center;padding:.4rem">Se connecter</div>
    </div>
  </div>`
},
{
  id: 'change-password', group: 'Authentification', title: 'Changement de mot de passe obligatoire', route: '#/change-password-required',
  desc: 'Affiché à la première connexion ou après réinitialisation administrateur.',
  tags: ['auth'],
  html: `<div class="login-mock">
    <div class="login-left"><div class="login-left-text"><h2>Sécurité</h2><p>Mise à jour requise</p></div></div>
    <div class="login-right">
      <h3>Nouveau mot de passe</h3><p>Veuillez définir un mot de passe personnel.</p>
      <div class="form-field" style="margin-bottom:.5rem"><div class="form-label">Mot de passe actuel</div><div class="form-input">••••••••</div></div>
      <div class="form-field" style="margin-bottom:.5rem"><div class="form-label">Nouveau mot de passe</div><div class="form-input">••••••••</div></div>
      <div class="form-field" style="margin-bottom:.75rem"><div class="form-label">Confirmer</div><div class="form-input">••••••••</div></div>
      <div class="mock-btn mock-btn-primary" style="display:block;text-align:center;padding:.4rem">Valider</div>
    </div>
  </div>`
},

// ─── PILOTAGE ───
{
  id: 'dashboard', group: 'Pilotage', title: 'Dashboard global', route: '#/dashboard',
  desc: 'Tableau de bord directionnel : KPIs CA, occupation, graphiques, alertes et performance par unité.',
  tags: ['op'],
  html: FRAME('dashboard', 'Dashboard global', 'Vue consolidée multi-unités · Juin 2026', `
    <div class="filters"><span class="filter active">2026</span><span class="filter">Toutes unités</span><span class="filter">Mois en cours</span></div>
    ${KPI([{l:'CA période',v:'12,4 M DA',c:'blue'},{l:'Occupation',v:'78 %',c:'green'},{l:'RevPAR',v:'8 200 DA'},{l:'Variation',v:'+12 %',c:'green'}])}
    ${CHARTS()}
    <div class="grid-2">
      <div class="card-block"><h4>Performance par unité</h4>${TBL(['Unité','CA','Occ.','Écart'],[['Hôtel Azur','4,2 M','82%','<span class="badge badge-green">+5%</span>'],['Résidence Palm','3,1 M','71%','<span class="badge badge-amber">-2%</span>'],['Marina Club','5,1 M','79%','<span class="badge badge-green">+8%</span>']])}</div>
      <div class="card-block"><h4>Alertes intelligentes</h4><div class="alert-box">⚠ Baisse CA Hôtel Azur (-15% vs N-1)</div><div class="info-box">ℹ Objectif Q2 atteint à 94%</div></div>
    </div>
  `, 440)
},
{
  id: 'modules', group: 'Pilotage', title: 'Modules de pilotage', route: '#/modules',
  desc: 'Catalogue des 30 modules métier avec statut, groupe et connexions inter-modules.',
  tags: ['op'],
  html: FRAME('modules', 'Modules de pilotage', '30 modules · Configuration activable', `
    <div class="filters"><span class="filter active">Tous</span><span class="filter">Opérationnel</span><span class="filter">Socle</span></div>
    <div class="module-grid">
      ${['Recettes journalières|Finance|Opérationnel','Encaissements|Finance|Opérationnel','Hébergement|Exploitation|Opérationnel','Stocks|Exploitation|Opérationnel','RH|RH|Opérationnel','PortMaster|Spécifique|Opérationnel'].map(m=>{const p=m.split('|');return`<div class="module-card"><h5>${p[0]}</h5><span>${p[1]} · ${p[2]}</span></div>`}).join('')}
    </div>
    <div style="margin-top:.5rem" class="card-block"><h4>Détail module sélectionné</h4><p style="font-size:.55rem;color:#64748b">Connexions : Encaissements, Budget, Tableaux de bord</p></div>
  `)
},
{
  id: 'rapports', group: 'Pilotage', title: 'Rapports & exports', route: '#/rapports',
  desc: 'Génération et export de rapports Excel/PDF par période et unité.',
  tags: ['op'],
  html: FRAME('rapports', 'Rapports & exports', 'Exports automatisés', `
    <div class="form-grid" style="margin-bottom:.6rem">
      <div class="form-field"><div class="form-label">Type de rapport</div><div class="form-input">Synthèse mensuelle CA</div></div>
      <div class="form-field"><div class="form-label">Période</div><div class="form-input">Juin 2026</div></div>
    </div>
    <div style="display:flex;gap:.4rem;margin-bottom:.6rem"><span class="mock-btn mock-btn-primary">Export Excel</span><span class="mock-btn">Export PDF</span><span class="mock-btn">Planifier</span></div>
    ${TBL(['Rapport','Dernière génération','Format','Action'],[
      ['Synthèse CA mensuel','19/06/2026 08:30','Excel','<span class="badge badge-blue">Télécharger</span>'],
      ['Occupation par unité','18/06/2026 17:00','PDF','<span class="badge badge-blue">Télécharger</span>'],
      ['Trésorerie consolidée','17/06/2026 09:15','Excel','<span class="badge badge-blue">Télécharger</span>'],
    ])}
  `)
},

// ─── RECETTES ───
{
  id: 'recettes-journalieres', group: 'Exploitation — Recettes', title: 'Saisie journalière', route: '#/recettes/journalieres',
  desc: 'Saisie des recettes du jour par rubrique et unité hôtelière.',
  tags: ['op'],
  html: FRAME('recettes', 'Saisie journalière', 'Recettes du 19/06/2026', `
    <div class="filters"><span class="filter active">Hôtel Azur</span><span class="filter">19/06/2026</span></div>
    ${TBL(['Rubrique','Montant HT','TVA','Montant TTC',''],[
      ['Hébergement','850 000','153 000','1 003 000','<span class="badge badge-gray">Modifier</span>'],
      ['Restauration','320 000','60 800','380 800','<span class="badge badge-gray">Modifier</span>'],
      ['Bar & loisirs','95 000','18 050','113 050','<span class="badge badge-gray">Modifier</span>'],
      ['Divers','42 000','7 980','49 980','<span class="badge badge-gray">Modifier</span>'],
    ])}
    <div style="margin-top:.5rem;display:flex;justify-content:space-between;align-items:center">
      <span style="font-size:.6rem;font-weight:700">Total : 1 546 830 DA</span>
      <span class="mock-btn mock-btn-primary">Soumettre pour validation</span>
    </div>
  `)
},
{
  id: 'recettes-historique', group: 'Exploitation — Recettes', title: 'Historique recettes', route: '#/recettes/historique',
  desc: 'Consultation de l\'historique des saisies par période et statut.',
  tags: ['op'],
  html: FRAME('recettes', 'Historique recettes', 'Consultation & recherche', `
    <div class="filters"><span class="filter">Unité ▾</span><span class="filter">01/06 — 30/06</span><span class="filter active">Validées</span></div>
    ${TBL(['Date','Unité','Montant TTC','Statut','Saisi par'],[
      ['18/06/2026','Hôtel Azur','1 423 500 DA','<span class="badge badge-green">Validée</span>','M. Benali'],
      ['17/06/2026','Hôtel Azur','1 389 200 DA','<span class="badge badge-green">Validée</span>','M. Benali'],
      ['18/06/2026','Marina Club','2 105 800 DA','<span class="badge badge-green">Validée</span>','S. Khelifi'],
    ])}
  `)
},
{
  id: 'recettes-validation', group: 'Exploitation — Recettes', title: 'Validation recettes', route: '#/recettes/validation',
  desc: 'Workflow de validation N+1 des saisies journalières en attente.',
  tags: ['op'],
  html: FRAME('recettes', 'Validation recettes', '3 en attente', `
    <div class="alert-box">3 saisies en attente de validation</div>
    ${TBL(['Date','Unité','Montant','Écart vs moy.','Action'],[
      ['19/06/2026','Résidence Palm','892 400 DA','+3%','<span class="badge badge-green">Valider</span> <span class="badge badge-red">Rejeter</span>'],
      ['19/06/2026','Hôtel Azur','1 546 830 DA','+8%','<span class="badge badge-green">Valider</span> <span class="badge badge-red">Rejeter</span>'],
      ['19/06/2026','Marina Club','—','—','<span class="badge badge-amber">Incomplète</span>'],
    ])}
  `)
},
{
  id: 'recettes-mensuelles', group: 'Exploitation — Recettes', title: 'Saisie mensuelle', route: '#/recettes/mensuelles',
  desc: 'Consolidation et saisie des recettes au format mensuel.',
  tags: ['op'],
  html: FRAME('recettes', 'Saisie mensuelle', 'Juin 2026', `
    <div class="filters"><span class="filter active">Juin 2026</span><span class="filter">Hôtel Azur</span></div>
    ${TBL(['Semaine','Hébergement','F&B','Autres','Total'],[
      ['S1','3,2 M','1,1 M','280 K','4,58 M'],
      ['S2','3,5 M','1,3 M','310 K','5,11 M'],
      ['S3','—','—','—','—'],
      ['S4','—','—','—','—'],
    ])}
  `)
},
{
  id: 'objectifs', group: 'Exploitation — Recettes', title: 'Objectifs & budget', route: '#/objectifs',
  desc: 'Définition et suivi des objectifs CA par unité et rubrique.',
  tags: ['op'],
  html: FRAME('recettes', 'Objectifs', 'Budget 2026', `
    ${KPI([{l:'Objectif annuel',v:'145 M DA',c:'blue'},{l:'Réalisé',v:'72 M DA'},{l:'Écart',v:'-2,1 %',c:'amber'},{l:'Projection',v:'142 M DA'}])}
    ${CHARTS()}
    ${TBL(['Unité','Objectif','Réalisé','% atteint'],[
      ['Hôtel Azur','48 M','24,1 M','<span class="badge badge-green">50%</span>'],
      ['Résidence Palm','35 M','17,8 M','<span class="badge badge-amber">49%</span>'],
      ['Marina Club','62 M','30,1 M','<span class="badge badge-green">49%</span>'],
    ])}
  `)
},

// ─── HÉBERGEMENT & TARIFS ───
{
  id: 'hebergement', group: 'Exploitation — Hébergement', title: 'Hébergement & occupation', route: '#/hebergement',
  desc: 'Suivi du taux d\'occupation, chambres, réservations et prévisions.',
  tags: ['op'],
  html: FRAME('hebergement', 'Hébergement & occupation', 'Vue temps réel', `
    ${KPI([{l:'Taux occupation',v:'78 %',c:'green'},{l:'Chambres occupées',v:'156/200'},{l:'Arrivées J',v:'42'},{l:'Départs J',v:'38'}])}
    <div class="tabs"><span class="tab active">Plan chambres</span><span class="tab">Réservations</span><span class="tab">Prévisions</span></div>
    <div class="grid-3">${Array.from({length:9},(_,i)=>`<div class="card-block" style="text-align:center;font-size:.55rem;padding:.3rem"><span class="badge ${i%3===0?'badge-red':i%3===1?'badge-green':'badge-amber'}">${i%3===0?'Occupée':i%3===1?'Libre':'Check-out'}</span><br>Ch. ${101+i}</div>`).join('')}</div>
  `)
},
{
  id: 'tarifs', group: 'Exploitation — Hébergement', title: 'Tarifs & conventions', route: '#/tarifs',
  desc: 'Grilles tarifaires, promotions et conventions clients.',
  tags: ['op'],
  html: FRAME('hebergement', 'Tarifs & conventions', 'Grilles et promotions', `
    <div class="tabs"><span class="tab active">Grilles tarifaires</span><span class="tab">Promotions</span><span class="tab">Conventions</span></div>
    ${TBL(['Type chambre','Semaine','Week-end','Haute saison',''],[
      ['Standard','12 000 DA','15 000 DA','18 000 DA','<span class="badge badge-gray">Modifier</span>'],
      ['Supérieure','16 000 DA','19 000 DA','22 000 DA','<span class="badge badge-gray">Modifier</span>'],
      ['Suite','28 000 DA','32 000 DA','38 000 DA','<span class="badge badge-gray">Modifier</span>'],
    ])}
  `)
},

// ─── TRÉSORERIE & FACTURATION ───
{
  id: 'encaissements', group: 'Exploitation — Finance', title: 'Encaissements & trésorerie', route: '#/encaissements',
  desc: 'Tableau de bord trésorerie : soldes, encaissements, journal de caisse et comptes bancaires.',
  tags: ['op'],
  html: FRAME('encaissements', 'Encaissements & trésorerie', 'Vue consolidée', `
    ${KPI([{l:'Solde caisse',v:'2,4 M DA',c:'blue'},{l:'Encaissements J',v:'485 K DA',c:'green'},{l:'En attente',v:'3'},{l:'Comptes bancaires',v:'8,2 M DA'}])}
    <div class="tabs"><span class="tab active">Tableau de bord</span><span class="tab">Liste</span><span class="tab">Journal caisse</span><span class="tab">Comptes</span></div>
    ${TBL(['Date','Référence','Client','Mode','Montant','Statut'],[
      ['19/06','ENC-2026-1842','Sonelgaz','Virement','1 250 000 DA','<span class="badge badge-green">Validé</span>'],
      ['19/06','ENC-2026-1841','Particulier','Espèces','45 000 DA','<span class="badge badge-green">Validé</span>'],
      ['18/06','ENC-2026-1839','Ministère Tourisme','Chèque','890 000 DA','<span class="badge badge-amber">En attente</span>'],
    ])}
  `)
},
{
  id: 'facturation', group: 'Exploitation — Finance', title: 'Facturation', route: '#/facturation',
  desc: 'Émission et suivi des factures clients, tableau de bord et relances.',
  tags: ['op'],
  html: FRAME('facturation', 'Facturation', 'Gestion des factures', `
    ${KPI([{l:'Factures mois',v:'127',c:'blue'},{l:'Montant facturé',v:'18,5 M DA'},{l:'Impayées',v:'12',c:'red'},{l:'En retard',v:'4,2 M DA',c:'amber'}])}
    <div class="tabs"><span class="tab active">Tableau de bord</span><span class="tab">Factures</span><span class="tab">Clients facturation</span></div>
    ${TBL(['N° Facture','Client','Date','Montant TTC','Échéance','Statut'],[
      ['FA-2026-0891','Sonelgaz','15/06','1 488 000 DA','15/07','<span class="badge badge-blue">Émise</span>'],
      ['FA-2026-0887','Air Algérie','10/06','2 340 000 DA','10/07','<span class="badge badge-green">Payée</span>'],
      ['FA-2026-0875','Groupe ABC','01/06','890 000 DA','01/06','<span class="badge badge-red">En retard</span>'],
    ])}
  `)
},
{
  id: 'clients', group: 'Exploitation — Finance', title: 'Clients', route: '#/clients',
  desc: 'Répertoire clients : fiches, historique facturation et encours.',
  tags: ['op'],
  html: FRAME('clients', 'Clients', 'Répertoire clients', `
    <div class="filters"><span class="filter">Rechercher…</span><span class="filter active">Tous</span><span class="filter">Entreprises</span><span class="filter">Particuliers</span></div>
    ${TBL(['Client','Type','NIF','Encours','Dernière facture',''],[
      ['Sonelgaz','Entreprise','0001234567','1,2 M DA','15/06/2026','<span class="badge badge-blue">Voir</span>'],
      ['Air Algérie','Entreprise','0009876543','0 DA','10/06/2026','<span class="badge badge-blue">Voir</span>'],
      ['M. Benali A.','Particulier','—','45 000 DA','18/06/2026','<span class="badge badge-blue">Voir</span>'],
    ])}
  `)
},

// ─── OPÉRATIONS ───
{
  id: 'stocks', group: 'Opérations', title: 'Stocks & consommations', route: '#/stocks',
  desc: 'Suivi des niveaux de stock, alertes rupture et mouvements entrée/sortie.',
  tags: ['op'],
  html: FRAME('stocks', 'Gestion des Stocks', 'Suivi niveaux et mouvements', `
    ${KPI([{l:'Références',v:'248',c:'amber'},{l:'En alerte',v:'7',c:'red'},{l:'Valeur totale',v:'4,8 M DA'},{l:'Mouvements J',v:'23'}])}
    <div class="alert-box">7 produit(s) en rupture de stock</div>
    ${TBL(['Produit','Stock','Seuil','Valeur','Statut'],[
      ['Serviettes bain','120','200','84 000 DA','<span class="badge badge-red">Alerte</span>'],
      ['Produits ménagers','450','100','225 000 DA','<span class="badge badge-green">OK</span>'],
      ['Linge lit DBL','85','150','127 500 DA','<span class="badge badge-amber">Bas</span>'],
    ])}
  `)
},
{
  id: 'achats', group: 'Opérations', title: 'Achats & fournisseurs', route: '#/achats',
  desc: 'Bons de commande, fournisseurs et workflow validation/livraison.',
  tags: ['op'],
  html: FRAME('achats', 'Achats & Fournisseurs', 'Bons de commande', `
    ${KPI([{l:'Total bons',v:'34',c:'blue'},{l:'En attente',v:'5'},{l:'Montant total',v:'12,3 M DA'},{l:'Fournisseurs',v:'18'}])}
    ${TBL(['N° BC','Fournisseur','Date','Montant TTC','Statut'],[
      ['BC-2026-042','Fournitures Hôtelières SA','18/06','890 000 DA','<span class="badge badge-amber">Envoyé</span>'],
      ['BC-2026-041','Équipements Pro','15/06','1 250 000 DA','<span class="badge badge-green">Livré</span>'],
      ['BC-2026-040','Alimentaire DZ','14/06','456 000 DA','<span class="badge badge-gray">Brouillon</span>'],
    ])}
  `)
},
{
  id: 'maintenance', group: 'Opérations', title: 'Maintenance & interventions', route: '#/maintenance',
  desc: 'Gestion des équipements, demandes d\'intervention et suivi des coûts.',
  tags: ['op'],
  html: FRAME('maintenance', 'Maintenance', 'Interventions techniques', `
    ${KPI([{l:'Total',v:'45'},{l:'En cours',v:'8',c:'blue'},{l:'Urgentes',v:'2',c:'red'},{l:'Coût mois',v:'680 K DA'}])}
    ${TBL(['Titre','Priorité','Statut','Technicien'],[
      ['Fuite climatisation','<span class="badge badge-red">Urgente</span>','<span class="badge badge-blue">En cours</span>','K. Amrani'],
      ['Révision ascenseur','<span class="badge badge-amber">Haute</span>','<span class="badge badge-gray">Planifiée</span>','—'],
      ['Remplacement robinet','<span class="badge badge-gray">Normale</span>','<span class="badge badge-green">Terminée</span>','K. Amrani'],
    ])}
  `)
},
{
  id: 'parking', group: 'Opérations', title: 'Parking', route: '#/parking',
  desc: 'Gestion des places de parking, tarification et occupation.',
  tags: ['op'],
  html: FRAME('maintenance', 'Parking', 'Gestion des places', `
    ${KPI([{l:'Places',v:'120'},{l:'Occupées',v:'87',c:'blue'},{l:'Taux',v:'72 %',c:'green'},{l:'Recettes J',v:'34 500 DA'}])}
    <div class="mooring-plan" style="margin-bottom:.5rem">${Array.from({length:12},(_,i)=>`<div class="berth ${i%4===0?'berth-res':i%3===0?'berth-occ':'berth-free'}">P${i+1}</div>`).join('')}</div>
    ${TBL(['Place','Véhicule','Client','Entrée','Tarif'],[['P-042','12345-A-16','M. Khelifi','08:30','500 DA'],['P-015','88291-B-31','Sonelgaz','07:15','800 DA']])}
  `, 460)
},
{
  id: 'plage', group: 'Opérations', title: 'Plage & piscine', route: '#/plage',
  desc: 'Gestion transats, cabines, activités nautiques et billetterie.',
  tags: ['op'],
  html: FRAME('maintenance', 'Plage & piscine', 'Activités & équipements', `
    ${KPI([{l:'Transats',v:'45/60',c:'green'},{l:'Cabines',v:'12/15'},{l:'Recettes J',v:'128 K DA',c:'blue'},{l:'Activités',v:'8'}])}
    <div class="tabs"><span class="tab active">Transats</span><span class="tab">Cabines</span><span class="tab">Activités</span></div>
    ${TBL(['Zone','Capacité','Occupation','Tarif/jour','Recette'],[
      ['Plage A','30','28 (93%)','1 500 DA','42 000 DA'],
      ['Piscine','30','17 (57%)','1 000 DA','17 000 DA'],
      ['Cabines VIP','15','12 (80%)','5 000 DA','60 000 DA'],
    ])}
  `)
},

// ─── QUALITÉ ───
{
  id: 'anomalies', group: 'Qualité & relation client', title: 'Journal des anomalies', route: '#/anomalies',
  desc: 'Enregistrement et suivi des anomalies opérationnelles et financières.',
  tags: ['op'],
  html: FRAME('maintenance', 'Journal des anomalies', 'Détection & résolution', `
    ${KPI([{l:'Ouvertes',v:'12',c:'red'},{l:'En cours',v:'5',c:'amber'},{l:'Résolues mois',v:'28',c:'green'},{l:'Critiques',v:'2',c:'red'}])}
    ${TBL(['Date','Type','Description','Unité','Gravité','Statut'],[
      ['19/06','Financier','Écart caisse -15 000 DA','Hôtel Azur','<span class="badge badge-red">Critique</span>','<span class="badge badge-amber">En cours</span>'],
      ['18/06','Opérationnel','Chambre 204 non nettoyée','Résidence Palm','<span class="badge badge-amber">Moyenne</span>','<span class="badge badge-green">Résolue</span>'],
      ['17/06','Système','Sync échouée poste #3','—','<span class="badge badge-amber">Moyenne</span>','<span class="badge badge-blue">Ouverte</span>'],
    ])}
  `)
},
{
  id: 'reclamations', group: 'Qualité & relation client', title: 'Réclamations clients', route: '#/reclamations',
  desc: 'Gestion des réclamations, suivi de résolution et satisfaction.',
  tags: ['op'],
  html: FRAME('maintenance', 'Réclamations clients', 'Qualité & satisfaction', `
    ${KPI([{l:'Ouvertes',v:'8'},{l:'Délai moyen',v:'2,4 j'},{l:'Résolues',v:'45',c:'green'},{l:'Satisfaction',v:'87 %',c:'blue'}])}
    ${TBL(['Date','Client','Chambre','Motif','Priorité','Statut'],[
      ['19/06','M. Dupont','204','Bruit nocturne','<span class="badge badge-amber">Haute</span>','<span class="badge badge-blue">En traitement</span>'],
      ['18/06','Sonelgaz','Suite 12','Facturation erronée','<span class="badge badge-red">Urgente</span>','<span class="badge badge-amber">En attente</span>'],
      ['17/06','Mme Kaci','118','Climatisation','<span class="badge badge-gray">Normale</span>','<span class="badge badge-green">Résolue</span>'],
    ])}
  `)
},
{
  id: 'decisions', group: 'Qualité & relation client', title: 'Décisions & instructions', route: '#/decisions',
  desc: 'Circulation des décisions de direction et instructions opérationnelles.',
  tags: ['op'],
  html: FRAME('maintenance', 'Décisions & instructions', 'Communication direction', `
    <div class="tabs"><span class="tab active">Décisions</span><span class="tab">Instructions</span><span class="tab">Archives</span></div>
    ${TBL(['Réf.','Titre','Date','Émetteur','Destinataires','Statut'],[
      ['DEC-2026-012','Réorganisation service F&B','15/06','Direction Générale','Tous managers','<span class="badge badge-green">Diffusée</span>'],
      ['INS-2026-034','Procédure check-in renforcé','12/06','D. Exploitation','Réception','<span class="badge badge-blue">En cours</span>'],
      ['DEC-2026-011','Budget Q3 validé','01/06','Conseil Admin.','Direction','<span class="badge badge-green">Archivée</span>'],
    ])}
  `)
},

// ─── COMMERCIAL & GED ───
{
  id: 'commercial', group: 'Commercial & documents', title: 'Commercial & partenariats', route: '#/commercial',
  desc: 'Pipeline commercial, opportunités et gestion des partenaires.',
  tags: ['op'],
  html: FRAME('clients', 'Commercial', 'Pipeline & partenariats', `
    ${KPI([{l:'Partenaires',v:'24',c:'green'},{l:'Opportunités',v:'15'},{l:'Pipeline',v:'45 M DA'},{l:'Conversion',v:'32 %',c:'amber'}])}
    <div class="tabs"><span class="tab active">Opportunités</span><span class="tab">Partenaires</span></div>
    ${TBL(['Titre','Partenaire','Montant est.','Probabilité','Échéance','Statut'],[
      ['Convention groupe Sonatrach','Sonatrach','12 M DA','70%','30/09','<span class="badge badge-amber">Négociation</span>'],
      ['Séminaire Air Algérie','Air Algérie','3,5 M DA','50%','15/08','<span class="badge badge-blue">Proposition</span>'],
      ['Mariage VIP','Particulier','2,8 M DA','80%','20/07','<span class="badge badge-green">Gagné</span>'],
    ])}
  `)
},
{
  id: 'ged', group: 'Commercial & documents', title: 'Gestion documentaire', route: '#/ged',
  desc: 'Archivage, classement et recherche de documents métier.',
  tags: ['op'],
  html: FRAME('clients', 'Gestion documentaire', 'GED — Archives centralisées', `
    <div class="filters"><span class="filter">Rechercher…</span><span class="filter active">Tous</span><span class="filter">Contrats</span><span class="filter">Factures</span><span class="filter">RH</span></div>
    <div class="grid-2">
      <div class="card-block"><h4>Arborescence</h4><div style="font-size:.55rem;color:#64748b;line-height:1.8">📁 Contrats<br>&nbsp;&nbsp;📄 Convention Sonelgaz.pdf<br>&nbsp;&nbsp;📄 Bail commercial 2026.pdf<br>📁 Factures<br>&nbsp;&nbsp;📄 FA-2026-0891.pdf<br>📁 RH<br>&nbsp;&nbsp;📄 Contrat K. Amrani.pdf</div></div>
      <div class="card-block"><h4>Derniers documents</h4>${TBL(['Document','Type','Date','Taille'],[['Convention Sonelgaz.pdf','Contrat','15/06','2,4 Mo'],['FA-2026-0891.pdf','Facture','15/06','156 Ko'],['PV réunion Q2.pdf','Décision','10/06','890 Ko']])}</div>
    </div>
  `)
},

// ─── RH ───
{
  id: 'rh-pilotage', group: 'RH & productivité', title: 'RH — Pilotage & Vision', route: '#/rh/pilotage/dashboard',
  desc: 'Tableau de bord RH : KPIs effectifs, masse salariale, analyses IA et comparatif unités.',
  tags: ['op'],
  html: FRAME('rh', 'RH — Pilotage & Vision', 'Tableau de bord', `
    <div class="rh-hub-tabs"><span class="rh-hub active">Dashboard</span><span class="rh-hub">Analyses IA</span><span class="rh-hub">Prévisions</span><span class="rh-hub">Comparatif</span></div>
    ${KPI([{l:'Effectif',v:'342',c:'blue'},{l:'Masse salariale',v:'28,5 M DA'},{l:'Turnover',v:'8,2 %',c:'amber'},{l:'Absentéisme',v:'3,1 %',c:'green'}])}
    ${CHARTS()}
    ${TBL(['Unité','Effectif','Masse sal.','Productivité'],[['Hôtel Azur','128','10,2 M','98 K'],['Résidence Palm','89','7,1 M','85 K'],['Marina Club','125','11,2 M','112 K']])}
  `)
},
{
  id: 'rh-collaborateurs', group: 'RH & productivité', title: 'RH — Collaborateurs', route: '#/rh/collaborateurs/annuaire',
  desc: 'Annuaire employés, contrats, organigramme et affectations.',
  tags: ['op'],
  html: FRAME('rh', 'RH — Collaborateurs', 'Annuaire', `
    <div class="rh-hub-tabs"><span class="rh-hub active">Annuaire</span><span class="rh-hub">Contrats</span><span class="rh-hub">Organigramme</span><span class="rh-hub">Affectations</span></div>
    ${TBL(['Matricule','Nom','Poste','Unité','Contrat','Statut'],[
      ['EMP-0042','K. Amrani','Technicien','Hôtel Azur','CDI','<span class="badge badge-green">Actif</span>'],
      ['EMP-0087','S. Benali','Réceptionniste','Résidence Palm','CDI','<span class="badge badge-green">Actif</span>'],
      ['EMP-0156','M. Khelifi','Chef réception','Marina Club','CDD','<span class="badge badge-amber">Fin 31/12</span>'],
    ])}
  `)
},
{
  id: 'rh-temps', group: 'RH & productivité', title: 'RH — Temps & Présence', route: '#/rh/temps/planning',
  desc: 'Planning, pointages et gestion des absences/congés.',
  tags: ['op'],
  html: FRAME('rh', 'RH — Temps & Présence', 'Planning', `
    <div class="rh-hub-tabs"><span class="rh-hub active">Planning</span><span class="rh-hub">Pointages</span><span class="rh-hub">Absences</span></div>
    ${TBL(['Employé','Lun','Mar','Mer','Jeu','Ven'],[
      ['S. Benali','M','M','R','M','—'],
      ['M. Khelifi','R','R','R','C','R'],
    ])}
  `)
},
{
  id: 'rh-paie', group: 'RH & productivité', title: 'RH — Paie & Légal DZ', route: '#/rh/paie/prepaie',
  desc: 'Pré-paie CNAS/IRG, DLG et conformité Algérie.',
  tags: ['op'],
  html: FRAME('rh', 'RH — Paie & Légal DZ', 'Pré-paie & DLG', `
    <div class="rh-hub-tabs"><span class="rh-hub active">Pré-paie</span><span class="rh-hub">Registres</span><span class="rh-hub">Conformité DZ</span></div>
    ${KPI([{l:'Bulletins',v:'342'},{l:'Masse brute',v:'32,1 M DA'},{l:'CNAS',v:'6,4 M DA'},{l:'IRG',v:'2,8 M DA'}])}
    ${TBL(['Matricule','Nom','Brut','CNAS','IRG','Net','Statut'],[
      ['EMP-0042','K. Amrani','85 000 DA','8 500 DA','12 400 DA','64 100 DA','<span class="badge badge-green">Validé</span>'],
      ['EMP-0087','S. Benali','62 000 DA','6 200 DA','7 800 DA','48 000 DA','<span class="badge badge-amber">Brouillon</span>'],
    ])}
  `)
},
{
  id: 'rh-talents', group: 'RH & productivité', title: 'RH — Talents', route: '#/rh/talents/recrutements',
  desc: 'Recrutement, formations, compétences et entretiens.',
  tags: ['op'],
  html: FRAME('rh', 'RH — Talents & Développement', 'Recrutements', `
    <div class="rh-hub-tabs"><span class="rh-hub active">Recrutements</span><span class="rh-hub">Formations</span><span class="rh-hub">Compétences</span><span class="rh-hub">Entretiens</span></div>
    ${KPI([{l:'Postes ouverts',v:'5',c:'blue'},{l:'Candidatures',v:'42'},{l:'Formations',v:'8'},{l:'Entretiens Q2',v:'67 %'}])}
    ${TBL(['Poste','Unité','Candidats','Statut'],[
      ['Réceptionniste bilingue','Marina Club','12','<span class="badge badge-blue">Sélection</span>'],
      ['Chef de cuisine','Hôtel Azur','8','<span class="badge badge-amber">Entretiens</span>'],
    ])}
  `)
},
{
  id: 'rh-validations', group: 'RH & productivité', title: 'RH — Centre validations', route: '#/rh/validations/absences',
  desc: 'Approbations N+1 : absences, pointages et documents.',
  tags: ['op'],
  html: FRAME('rh', 'RH — Centre validations', '3 en attente', `
    <div class="alert-box">3 demandes en attente de validation N+1</div>
    ${TBL(['Employé','Type','Du','Au','Action'],[
      ['S. Benali','Congé annuel','01/07','10/07','<span class="badge badge-green">Approuver</span>'],
      ['K. Amrani','Maladie','18/06','20/06','<span class="badge badge-green">Approuver</span>'],
    ])}
  `)
},
{
  id: 'rh-mon-espace', group: 'RH & productivité', title: 'RH — Mon espace', route: '#/rh/mon-espace',
  desc: 'Espace personnel employé : profil, demandes et documents.',
  tags: ['op'],
  html: FRAME('rh', 'Mon espace RH', 'Profil personnel', `
    <div class="grid-2">
      <div class="card-block"><h4>Mon profil</h4><div style="font-size:.55rem;line-height:1.8"><strong>S. Benali</strong><br>EMP-0087 · Réceptionniste<br>Solde congés : 18 jours</div></div>
      <div class="card-block"><h4>Actions</h4><span class="mock-btn">Demander un congé</span> <span class="mock-btn">Mes bulletins</span></div>
    </div>
  `)
},

// ─── PORTMASTER ───
{
  id: 'port-dashboard', group: 'PortMaster', title: 'Dashboard port', route: '#/portmaster',
  desc: 'Vue portuaire : occupation quais, recettes et KPIs marina.',
  tags: ['op'],
  html: FRAME('port', 'Dashboard port', 'Marina Club', `
    ${KPI([{l:'Occupés',v:'78/95',c:'blue'},{l:'Bateaux',v:'62'},{l:'Recettes mois',v:'8,4 M DA',c:'green'},{l:'Occupation',v:'82 %'}])}
    ${CHARTS()}
    <div class="card-block"><h4>Plan d'amarage</h4><div class="mooring-plan">${Array.from({length:18},(_,i)=>`<div class="berth ${i%5===0?'berth-res':i%3===0?'berth-occ':'berth-free'}">Q${i+1}</div>`).join('')}</div></div>
  `, 460)
},
{
  id: 'port-referentiel', group: 'PortMaster', title: 'Référentiel port', route: '#/portmaster/referentiel',
  desc: 'Configuration zones, types d\'emplacements et services.',
  tags: ['socle'],
  html: FRAME('port', 'Référentiel port', 'Configuration', `
    ${TBL(['Zone','Quais','Capacité','Type','Statut'],[
      ['Zone A','Q1-Q30','30','Ponton fixe','<span class="badge badge-green">Actif</span>'],
      ['Zone B','Q31-Q55','25','Flottant','<span class="badge badge-green">Actif</span>'],
    ])}
  `)
},
{
  id: 'port-clients', group: 'PortMaster', title: 'Clients port', route: '#/portmaster/clients',
  desc: 'Répertoire clients portuaires.',
  tags: ['op'],
  html: FRAME('port', 'Clients port', 'Répertoire', `
    ${TBL(['Client','Type','Bateaux','Contrats','Encours'],[
      ['M. Benali','Particulier','2','1','450 000 DA'],
      ['Maritime DZ SA','Entreprise','5','3','2,1 M DA'],
    ])}
  `)
},
{
  id: 'port-bateaux', group: 'PortMaster', title: 'Bateaux', route: '#/portmaster/bateaux',
  desc: 'Fiches bateaux et historique.',
  tags: ['op'],
  html: FRAME('port', 'Bateaux', 'Flotte', `
    ${TBL(['Nom','Immat.','Type','Longueur','Propriétaire','Quai'],[
      ['Azur Dream','123456-A-16','Voilier','12,5 m','M. Benali','Q-042'],
      ['Méditerranée','789012-B-31','Moteur','15,8 m','Maritime DZ','Q-018'],
    ])}
  `)
},
{
  id: 'port-contrats', group: 'PortMaster', title: 'Contrats port', route: '#/portmaster/contrats',
  desc: 'Contrats d\'amarrage annuels et saisonniers.',
  tags: ['op'],
  html: FRAME('port', 'Contrats', 'Amarrage', `
    ${KPI([{l:'Actifs',v:'48',c:'green'},{l:'À renouveler',v:'5',c:'amber'},{l:'Expirés',v:'2',c:'red'},{l:'CA annuel',v:'42 M DA'}])}
    ${TBL(['N°','Client','Bateau','Type','Fin','Montant','Statut'],[
      ['CT-042','M. Benali','Azur Dream','Annuel','31/12/26','480 K DA','<span class="badge badge-green">Actif</span>'],
      ['CT-038','Maritime DZ','Méditerranée','Annuel','28/02/27','720 K DA','<span class="badge badge-green">Actif</span>'],
    ])}
  `)
},
{
  id: 'port-emplacements', group: 'PortMaster', title: 'Emplacements', route: '#/portmaster/emplacements',
  desc: 'Plan des quais et emplacements.',
  tags: ['op'],
  html: FRAME('port', 'Emplacements', 'Plan quais', `
    <div class="mooring-plan">${Array.from({length:18},(_,i)=>`<div class="berth ${i%4===0?'berth-res':i%3===0?'berth-occ':'berth-free'}">Q${i+1}</div>`).join('')}</div>
  `, 400)
},
{
  id: 'port-factures', group: 'PortMaster', title: 'Factures port', route: '#/portmaster/factures',
  desc: 'Facturation portuaire.',
  tags: ['op'],
  html: FRAME('port', 'Factures port', 'Facturation', `
    ${KPI([{l:'Factures',v:'56'},{l:'Montant',v:'4,2 M DA',c:'blue'},{l:'Impayées',v:'8',c:'red'},{l:'En retard',v:'1,1 M DA',c:'amber'}])}
    ${TBL(['N°','Client','Montant','Échéance','Statut'],[
      ['FP-0342','M. Benali','42 000 DA','15/07','<span class="badge badge-blue">Émise</span>'],
      ['FP-0338','Maritime DZ','180 000 DA','15/07','<span class="badge badge-green">Payée</span>'],
    ])}
  `)
},
{
  id: 'port-tarifs', group: 'PortMaster', title: 'Tarifs port', route: '#/portmaster/tarifs',
  desc: 'Grilles tarifaires portuaires.',
  tags: ['op'],
  html: FRAME('port', 'Tarifs port', 'Grilles', `
    ${TBL(['Type','Longueur','Jour','Mois','An'],[
      ['Voilier','< 10 m','800 DA','18 K DA','180 K DA'],
      ['Moteur','15-20 m','1 800 DA','42 K DA','420 K DA'],
    ])}
  `)
},
{
  id: 'port-validations', group: 'PortMaster', title: 'Validations port', route: '#/portmaster/validations',
  desc: 'Validation des opérations portuaires.',
  tags: ['op'],
  html: FRAME('port', 'Validations', '4 en attente', `
    <div class="alert-box">4 opérations en attente</div>
    ${TBL(['Type','Réf.','Client','Montant','Action'],[
      ['Contrat','CT-049','M. Khelifi','360 K DA','<span class="badge badge-green">Valider</span>'],
      ['Facture','FP-0345','Particulier','28 K DA','<span class="badge badge-green">Valider</span>'],
    ])}
  `)
},
{
  id: 'port-mouvements', group: 'PortMaster', title: 'Mouvements', route: '#/portmaster/mouvements',
  desc: 'Journal entrées/sorties bateaux.',
  tags: ['op'],
  html: FRAME('port', 'Mouvements', 'Entrées & sorties', `
    ${TBL(['Date','Bateau','Type','Quai'],[
      ['19/06 08:30','Azur Dream','<span class="badge badge-green">Entrée</span>','Q-042'],
      ['19/06 07:15','Méditerranée','<span class="badge badge-red">Sortie</span>','Q-018'],
    ])}
  `)
},
{
  id: 'port-recouvrement', group: 'PortMaster', title: 'Recouvrement', route: '#/portmaster/recouvrement',
  desc: 'Créances portuaires et relances.',
  tags: ['socle'],
  html: FRAME('port', 'Recouvrement', 'Créances', `
    ${KPI([{l:'Encours',v:'3,8 M DA',c:'red'},{l:'> 30j',v:'1,2 M DA'},{l:'> 90j',v:'450 K DA',c:'red'},{l:'Relances',v:'12'}])}
    ${TBL(['Client','Facture','Montant','Retard'],[
      ['Yacht Club','FP-0325','95 000 DA','34 j'],
      ['Maritime DZ','FP-0310','280 000 DA','18 j'],
    ])}
  `)
},

// ─── ADMINISTRATION ───
{
  id: 'admin-hotels', group: 'Administration', title: 'Hôtels / unités', route: '#/admin/hotels',
  desc: 'Gestion des unités hôtelières et paramètres par établissement.',
  tags: ['socle'],
  html: FRAME('settings', 'Hôtels / unités', 'Unités hôtelières', `
    ${TBL(['Unité','Code','Ville','Chambres','Statut',''],[
      ['Hôtel Azur','HAZ','Alger','80','<span class="badge badge-green">Actif</span>','<span class="badge badge-gray">Modifier</span>'],
      ['Résidence Palm','RPA','Tipaza','45','<span class="badge badge-green">Actif</span>','<span class="badge badge-gray">Modifier</span>'],
      ['Marina Club','MCL','Alger','75','<span class="badge badge-green">Actif</span>','<span class="badge badge-gray">Modifier</span>'],
    ])}
  `)
},
{
  id: 'admin-users', group: 'Administration', title: 'Utilisateurs', route: '#/admin/users',
  desc: 'Gestion des comptes utilisateurs et invitations.',
  tags: ['socle'],
  html: FRAME('settings', 'Utilisateurs', '12 utilisateurs · 2 en attente', `
    <div class="alert-box">2 comptes en attente d'activation</div>
    ${TBL(['Nom','E-mail','Rôle','Unité','Dernière connexion','Statut'],[
      ['A. Direction','direction@hotel.dz','Directeur','Toutes','19/06 08:15','<span class="badge badge-green">Actif</span>'],
      ['M. Benali','m.benali@hotel.dz','Manager','Hôtel Azur','19/06 07:30','<span class="badge badge-green">Actif</span>'],
      ['S. Khelifi','s.khelifi@hotel.dz','Saisie','Marina Club','—','<span class="badge badge-amber">En attente</span>'],
    ])}
  `)
},
{
  id: 'admin-roles', group: 'Administration', title: 'Rôles & permissions', route: '#/admin/roles',
  desc: 'Configuration des rôles et matrices de permissions.',
  tags: ['socle'],
  html: FRAME('settings', 'Rôles & permissions', 'Matrice d\'accès', `
    ${TBL(['Rôle','Utilisateurs','Dashboard','Recettes','Admin','PortMaster'],[
      ['Directeur','2','✓','✓','✓','✓'],
      ['Manager','5','✓','✓','—','—'],
      ['Saisie recettes','8','—','✓','—','—'],
      ['RH Manager','3','✓','—','—','—'],
    ])}
  `)
},
{
  id: 'admin-rubriques', group: 'Administration', title: 'Rubriques recettes', route: '#/admin/rubriques',
  desc: 'Configuration des rubriques de saisie des recettes journalières.',
  tags: ['socle'],
  html: FRAME('settings', 'Rubriques', 'Configuration recettes', `
    ${TBL(['Code','Libellé','Catégorie','TVA','Ordre',''],[
      ['HEB','Hébergement','Exploitation','19%','1','<span class="badge badge-gray">Modifier</span>'],
      ['FB','Restauration','Exploitation','19%','2','<span class="badge badge-gray">Modifier</span>'],
      ['BAR','Bar & loisirs','Exploitation','19%','3','<span class="badge badge-gray">Modifier</span>'],
    ])}
  `)
},

// ─── SYSTÈME ───
{
  id: 'settings', group: 'Système', title: 'Paramètres généraux', route: '#/settings',
  desc: 'Configuration globale de l\'application et préférences métier.',
  tags: ['socle'],
  html: FRAME('settings', 'Paramètres', 'Configuration globale', `
    <div class="grid-2">
      <div class="card-block"><h4>Identité établissement</h4><div class="form-field" style="margin-bottom:.3rem"><div class="form-label">Raison sociale</div><div class="form-input">Groupe Hôtelier Azur SA</div></div><div class="form-field"><div class="form-label">NIF</div><div class="form-input">0001234567890</div></div></div>
      <div class="card-block"><h4>Préférences</h4><div class="form-field" style="margin-bottom:.3rem"><div class="form-label">Devise</div><div class="form-input">Dinar algérien (DA)</div></div><div class="form-field"><div class="form-label">Fuseau horaire</div><div class="form-input">Africa/Algiers (UTC+1)</div></div></div>
    </div>
  `)
},
{
  id: 'settings-interface', group: 'Système', title: 'Interface & thème', route: '#/settings/interface',
  desc: 'Personnalisation de l\'interface : couleur d\'accent, densité d\'affichage.',
  tags: ['socle'],
  html: FRAME('settings', 'Interface & thème', 'Personnalisation', `
    <div class="form-grid">
      <div class="card-block"><h4>Couleur d'accent</h4><div style="display:flex;gap:.4rem;margin-top:.3rem"><div style="width:24px;height:24px;border-radius:50%;background:#2563eb;border:2px solid #1e40af"></div><div style="width:24px;height:24px;border-radius:50%;background:#16a34a"></div><div style="width:24px;height:24px;border-radius:50%;background:#d97706"></div><div style="width:24px;height:24px;border-radius:50%;background:#7c3aed"></div></div></div>
      <div class="card-block"><h4>Densité</h4><div class="tabs" style="margin:0"><span class="tab">Compact</span><span class="tab active">Normal</span><span class="tab">Confort</span></div></div>
    </div>
  `)
},
{
  id: 'settings-notifications', group: 'Système', title: 'Notifications', route: '#/settings/notifications',
  desc: 'Configuration des alertes et notifications automatiques.',
  tags: ['socle'],
  html: FRAME('settings', 'Notifications', 'Alertes & rappels', `
    ${TBL(['Événement','Canal','Destinataires','Actif'],[
      ['Recette non saisie J-1','E-mail + App','Managers','<span class="badge badge-green">Oui</span>'],
      ['Facture en retard','E-mail','Comptabilité','<span class="badge badge-green">Oui</span>'],
      ['Stock en rupture','App','Responsable stocks','<span class="badge badge-green">Oui</span>'],
      ['Validation RH en attente','App','N+1','<span class="badge badge-amber">Oui</span>'],
    ])}
  `)
},
{
  id: 'settings-securite', group: 'Système', title: 'Sécurité & accès', route: '#/settings/securite',
  desc: 'Politique de mots de passe, sessions et authentification.',
  tags: ['socle'],
  html: FRAME('settings', 'Sécurité & accès', 'Politique de sécurité', `
    <div class="grid-2">
      <div class="card-block"><h4>Mot de passe</h4><div style="font-size:.55rem;line-height:1.8">Longueur min. : 8 caractères<br>Expiration : 90 jours<br>Historique : 5 derniers</div></div>
      <div class="card-block"><h4>Sessions</h4><div style="font-size:.55rem;line-height:1.8">Timeout inactivité : 30 min<br>Sessions simultanées : 2 max<br>2FA : Désactivé</div></div>
    </div>
  `)
},
{
  id: 'settings-database', group: 'Système', title: 'Base de données', route: '#/settings/database',
  desc: 'Administration base SQLite : statistiques, maintenance et migrations.',
  tags: ['socle'],
  html: FRAME('settings', 'Base de données', 'Administration DB', `
    ${KPI([{l:'Taille DB',v:'248 Mo'},{l:'Tables',v:'87'},{l:'Migrations',v:'45/45',c:'green'},{l:'Dernière sauvegarde',v:'19/06 02:00'}])}
    <div style="display:flex;gap:.4rem"><span class="mock-btn">VACUUM</span><span class="mock-btn">Analyser</span><span class="mock-btn mock-btn-primary">Exporter schéma</span></div>
  `)
},
{
  id: 'settings-backup', group: 'Système', title: 'Sauvegarde', route: '#/settings/backup',
  desc: 'Sauvegarde et restauration de la base de données.',
  tags: ['socle'],
  html: FRAME('settings', 'Sauvegarde', 'Backup & restauration', `
    <div class="info-box">Dernière sauvegarde automatique : 19/06/2026 à 02:00 — 248 Mo</div>
    <div style="display:flex;gap:.4rem;margin-bottom:.6rem"><span class="mock-btn mock-btn-primary">Sauvegarder maintenant</span><span class="mock-btn">Restaurer</span><span class="mock-btn">Planifier</span></div>
    ${TBL(['Date','Type','Taille','Emplacement',''],[
      ['19/06 02:00','Automatique','248 Mo','./backups/auto/','<span class="badge badge-blue">Restaurer</span>'],
      ['18/06 02:00','Automatique','247 Mo','./backups/auto/','<span class="badge badge-blue">Restaurer</span>'],
      ['15/06 14:30','Manuelle','246 Mo','./backups/manual/','<span class="badge badge-blue">Restaurer</span>'],
    ])}
  `)
},
{
  id: 'audit-logs', group: 'Système', title: 'Journal d\'audit', route: '#/audit/logs',
  desc: 'Traçabilité complète des actions utilisateurs.',
  tags: ['socle'],
  html: FRAME('settings', 'Journal d\'audit', 'Traçabilité', `
    <div class="filters"><span class="filter">Utilisateur ▾</span><span class="filter">Action ▾</span><span class="filter active">7 derniers jours</span></div>
    ${TBL(['Date/Heure','Utilisateur','Action','Module','Détail'],[
      ['19/06 08:32','M. Benali','CREATE','Recettes','Saisie journalière Hôtel Azur'],
      ['19/06 08:15','A. Direction','LOGIN','Auth','Connexion réussie'],
      ['18/06 17:45','S. Khelifi','VALIDATE','Recettes','Validation recettes Marina Club'],
      ['18/06 16:20','Admin','UPDATE','Users','Modification rôle S. Khelifi'],
    ])}
  `)
},
{
  id: 'system-sync', group: 'Système', title: 'Synchronisation multi-postes', route: '#/system/sync',
  desc: 'Synchronisation des données entre postes de travail.',
  tags: ['socle'],
  html: FRAME('settings', 'Synchronisation', 'Multi-postes', `
    ${KPI([{l:'Postes actifs',v:'4',c:'green'},{l:'Dernière sync',v:'08:45'},{l:'En attente',v:'0'},{l:'Conflits',v:'0',c:'green'}])}
    ${TBL(['Poste','IP','Dernière sync','Statut','Données'],[
      ['Poste Direction','192.168.1.10','19/06 08:45','<span class="badge badge-green">Synchronisé</span>','248 Mo'],
      ['Réception Azur','192.168.1.20','19/06 08:42','<span class="badge badge-green">Synchronisé</span>','248 Mo'],
      ['Comptabilité','192.168.1.30','19/06 08:40','<span class="badge badge-green">Synchronisé</span>','248 Mo'],
    ])}
    <div style="margin-top:.4rem"><span class="mock-btn mock-btn-primary">Synchroniser maintenant</span></div>
  `)
},
];
