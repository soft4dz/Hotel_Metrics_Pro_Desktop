$ErrorActionPreference = 'Stop'
$outputDir = Join-Path $PSScriptRoot '..\documentation'
New-Item -ItemType Directory -Force -Path $outputDir | Out-Null
$docxPath = Join-Path $outputDir 'Catalogue_fonctionnel_ERP_Raqmi_System.docx'
$pdfPath = Join-Path $outputDir 'Catalogue_fonctionnel_ERP_Raqmi_System.pdf'

$modules = @(
  @{Name='Pilotage et tableaux de bord'; Purpose='Donner à la direction une vue consolidée, quotidienne et décisionnelle de lʼactivité.'; Features=@('Dashboard global multi-établissements et indicateurs clés','Dashboard PDG : chiffre dʼaffaires, objectifs, occupation, trésorerie, créances, RH, qualité et maintenance','Cockpit DEC avec alertes, priorités et plan dʼactions','Rapports standards, rapports composés, tableaux croisés, exports et studio de reporting','Objectifs budgétaires et opérationnels avec suivi des écarts')},
  @{Name='Hébergement et PMS'; Purpose='Gérer le cycle complet du séjour, de la disponibilité jusquʼà la facturation.'; Features=@('Types de chambres, chambres, états et plan dʼoccupation','Réservations individuelles et groupes avec contrôle de disponibilité','Check-in, check-out, no-show et suivi des statuts','Folio client, lignes de consommation et transformation en facture','Dépôts et acomptes rattachés aux réservations','Connecteurs channel manager et import de réservations externes','Indicateurs dʼoccupation, revenus et prévisions')},
  @{Name='Housekeeping'; Purpose='Coordonner la remise en état des chambres et les interventions des équipes.'; Features=@('Tâches de nettoyage et contrôles par chambre','Affectation aux agents et suivi des échéances','États à faire, en cours, contrôlé et terminé','Liaison avec les réservations et les statuts des chambres','Historique des opérations et observations')},
  @{Name='Tarifs et conventions'; Purpose='Centraliser les règles de prix et fiabiliser la tarification commerciale.'; Features=@('Composants tarifaires, formules et plans','Grilles par période et établissement','Conventions clients et entreprises','Promotions et conditions dʼapplication','Simulateur tarifaire et estimation des séjours')},
  @{Name='Recettes et clôture journalière'; Purpose='Sécuriser la déclaration, la validation et la clôture du chiffre dʼaffaires.'; Features=@('Saisie journalière et mensuelle des recettes','Historique par unité et période','Validation hiérarchique des déclarations','Clôture quotidienne par unité','Contrôle des écarts entre chiffre dʼaffaires, caisse et encaissements','Traçabilité des corrections et validations')},
  @{Name='Clients, facturation et contrats'; Purpose='Gérer les tiers, les documents commerciaux et le cycle de facturation.'; Features=@('Fiches clients, coordonnées et historique','Devis et factures avec lignes, taxes et statuts','Registre de facturation et consultation détaillée','Génération de factures depuis les réservations','Contrats hôtel et conventions commerciales','Suivi des règlements et soldes')},
  @{Name='Trésorerie et encaissements'; Purpose='Centraliser les mouvements financiers et la situation des liquidités.'; Features=@('Saisie et liste des encaissements','Journal de caisse et suivi des modes de règlement','Comptes bancaires et soldes','Tableau de bord de trésorerie','Rapprochement des recettes déclarées avec espèces, TPE, virements, chèques et créances')},
  @{Name='Comptabilité et finance'; Purpose='Couvrir les traitements comptables courants et les contrôles de fin de période.'; Features=@('Plan comptable SCF, journaux, écritures et validation','Grand livre et balance','Lettrage et délettrage des comptes tiers','Rapprochement bancaire','Exercices, périodes et clôture comptable','Budgets, objectifs et analyse des écarts','Créances globales, recouvrement, relances et échéanciers')},
  @{Name='Fiscalité et conformité légale'; Purpose='Préparer les obligations fiscales et réglementaires algériennes.'; Features=@('Registre TVA et calcul des déclarations','Retenues à la source et registre des achats','Liasse fiscale et exports de télédéclaration','Télé-déclaration TVA G50 et suivi des références DGI','Intégration SIFEC pour la facture électronique','Immobilisations et plans dʼamortissement','CASNOS et inventaire légal')},
  @{Name='Points de vente, stocks et achats'; Purpose='Piloter les ventes opérationnelles, les consommations et les approvisionnements.'; Features=@('POS avec panier, règlements, sessions de caisse et clôture Z','Prise en charge de la caisse matérielle et des périphériques','KDS pour la préparation cuisine','Produits, catégories, niveaux de stocks et mouvements','Gestion des lots, dates et traçabilité','Inventaires physiques et traitement des écarts','Demandes, commandes, réceptions et fournisseurs','Fiches techniques, recettes et ordres de production cuisine')},
  @{Name='Parking, plage et contrôle dʼaccès'; Purpose='Gérer les capacités, réservations, accès et revenus des espaces annexes.'; Features=@('Entrées et sorties des véhicules, calcul de durée et tarification','Capacité, occupation et recettes du parking','Entrées plage/piscine par catégorie de visiteur','Réservations de places, cabanas ou ressources avec détection des conflits','Jetons dʼaccès uniques et contrôle entrée/sortie','Blocage de lʼaccès hors créneau ou en cas de solde impayé','Paiements rattachés aux réservations et historique des contrôles')},
  @{Name='PortMaster'; Purpose='Administrer lʼactivité portuaire, les navires, les emplacements et la facturation.'; Features=@('Référentiel des bassins, quais et emplacements','Clients port, bateaux et caractéristiques nautiques','Contrats dʼamarrage et affectation des places','Tarifs portuaires, simulations et factures','Encaissements, validations, créances et relances','Mouvements dʼentrée et de sortie des navires','Réservations de postes et contrôle dʼaccès','AIS : MMSI, positions, vitesse, cap et statut de navigation','Dashboard portuaire et alertes opérationnelles')},
  @{Name='Ressources humaines'; Purpose='Administrer le parcours salarié, lʼorganisation et les obligations sociales.'; Features=@('Dossier salarié et fiche 360°','Organisation, directions, départements, postes et effectifs cibles','Recrutement, onboarding et affectations','Contrats, absences, congés et workflow de validation','Planning, pointage, pointeuse et réconciliation','Paie, clôture de paie et bulletins','Télédéclarations et registres légaux','Formations, compétences et GPEC','Portail salarié : informations personnelles, demandes et documents','Tableaux de bord RH et analyse assistée')},
  @{Name='GED et conformité ANPDP'; Purpose='Sécuriser le cycle de vie documentaire et la conformité des données personnelles.'; Features=@('Classement, recherche, consultation et confidentialité des documents','Versioning avec historique et version courante','Empreinte SHA-256 et preuve dʼintégrité','OCR, correction, indexation et recherche plein texte','Signature interne traçable ; préparation à la signature qualifiée externe','Archivage légal, politiques de conservation et vérification dʼintégrité','Registre des traitements de données personnelles','Consentements, demandes dʼexercice de droits et incidents','Durées de conservation et obligations ANPDP / loi 18-07','Journalisation des opérations sensibles')},
  @{Name='Commercial et relation client'; Purpose='Suivre les opportunités, la qualité de service et les engagements commerciaux.'; Features=@('Suivi commercial et portefeuille dʼactivités','Réclamations clients, statuts et délais','Anomalies, causes et actions correctives','Décisions et instructions avec accusé de lecture','Créances liées aux entreprises, agences et partenaires','Indicateurs de satisfaction et de traitement')},
  @{Name='Maintenance et contrôle interne'; Purpose='Structurer les interventions, contrôles terrain et plans dʼamélioration.'; Features=@('Équipements, demandes et interventions de maintenance','Priorités, affectations, coûts et statuts','Workflows configurables de soumission, validation, rejet et clôture','Procédures et règles de validation','Checklists DEC, qualité, hygiène et maintenance','Constats, preuves, actions correctives, responsables et échéances')},
  @{Name='Administration et sécurité'; Purpose='Gouverner les accès, le paramétrage et la traçabilité de la plateforme.'; Features=@('Multi-établissements et unités organisationnelles','Utilisateurs, rôles et permissions par module','Changement obligatoire et gestion des mots de passe','Menu utilisateur et préférences de langue','Modules activables selon la licence','Rubriques, paramètres fonctionnels et notifications','Journal dʼaudit et contrôle des actions sensibles')},
  @{Name='Système, synchronisation et continuité'; Purpose='Garantir la disponibilité, la cohérence et la récupérabilité des données.'; Features=@('Synchronisation bidirectionnelle et suivi des statuts','Gestion des conflits et contrats de synchronisation','Sauvegardes contrôlées et restauration','Administration de la base de données','Santé système et diagnostics','Paramètres dʼinterface, thème et localisation','Fonctionnement Electron Desktop avec stockage SQLite local')}
)

$word = New-Object -ComObject Word.Application
$word.Visible = $false
$doc = $word.Documents.Add()
try {
  $section = $doc.Sections.Item(1)
  $section.PageSetup.PaperSize = 2
  $section.PageSetup.TopMargin = 72; $section.PageSetup.BottomMargin = 72
  $section.PageSetup.LeftMargin = 72; $section.PageSetup.RightMargin = 72
  $doc.Styles.Item(-1).Font.Name = 'Calibri'; $doc.Styles.Item(-1).Font.Size = 10.5
  $doc.Styles.Item(-1).ParagraphFormat.SpaceAfter = 6; $doc.Styles.Item(-1).ParagraphFormat.LineSpacingRule = 0
  foreach($styleId in @(-63,-2,-3)){$doc.Styles.Item($styleId).Font.Name='Calibri'}
  $doc.Styles.Item(-63).Font.Size=30; $doc.Styles.Item(-63).Font.Color=0x764B1A
  $doc.Styles.Item(-2).Font.Size=16; $doc.Styles.Item(-2).Font.Color=0x764B1A; $doc.Styles.Item(-2).ParagraphFormat.SpaceBefore=18; $doc.Styles.Item(-2).ParagraphFormat.SpaceAfter=10
  $doc.Styles.Item(-3).Font.Size=12.5; $doc.Styles.Item(-3).Font.Color=0x784F1F; $doc.Styles.Item(-3).ParagraphFormat.SpaceBefore=10; $doc.Styles.Item(-3).ParagraphFormat.SpaceAfter=5

  $header=$section.Headers.Item(1).Range; $header.Text='RAQMI SYSTEM  |  CATALOGUE FONCTIONNEL'; $header.Font.Name='Calibri'; $header.Font.Size=8; $header.Font.Color=0x777777
  $footer=$section.Footers.Item(1).Range; $footer.Text='Document de référence  •  '; $footer.Font.Size=8; $footer.Font.Color=0x777777; $footer.Collapse(0); $footer.Fields.Add($footer,-1,'PAGE') | Out-Null

  $sel=$word.Selection
  $sel.ParagraphFormat.SpaceBefore=100
  $sel.Style=-63; $sel.TypeText('Catalogue fonctionnel de lʼERP'); $sel.TypeParagraph()
  $sel.Font.Name='Calibri'; $sel.Font.Size=16; $sel.Font.Color=0x666666; $sel.TypeText('Raqmi System'); $sel.TypeParagraph()
  $sel.Font.Size=11; $sel.Font.Color=0x777777; $sel.ParagraphFormat.SpaceBefore=20; $sel.TypeText('Inventaire consolidé des fonctionnalités par module'); $sel.TypeParagraph()
  $sel.TypeText(('Édition du {0:dd MMMM yyyy}' -f (Get-Date))); $sel.TypeParagraph()
  $sel.InsertBreak(7)

  $sel.Style=-2; $sel.TypeText('Sommaire'); $sel.TypeParagraph()
  $tocRange=$sel.Range; $doc.TablesOfContents.Add($tocRange,$true,1,2) | Out-Null
  $sel.SetRange($doc.Content.End-1,$doc.Content.End-1); $sel.InsertBreak(7)

  $sel.Style=-2; $sel.TypeText('Vue dʼensemble'); $sel.TypeParagraph()
  $sel.Style=-1; $sel.TypeText("Raqmi System est un ERP hôtelier et multi-activités couvrant lʼexploitation, les finances, les ressources humaines, la conformité, les opérations annexes et la gestion portuaire. La plateforme centralise les données des établissements, applique des circuits de validation et fournit des tableaux de bord adaptés aux fonctions de direction et dʼexploitation."); $sel.TypeParagraph()
  $sel.TypeText("Les fonctions sont organisées autour de $($modules.Count) domaines fonctionnels. Les accès sont contrôlés par rôles et permissions ; les opérations sensibles alimentent le journal dʼaudit."); $sel.TypeParagraph()
  $sel.Style=-3; $sel.TypeText('Principes transverses'); $sel.TypeParagraph()
  foreach($item in @('Architecture desktop Electron avec interface React et base SQLite locale.','Gestion multi-établissements et filtrage par unité.','Workflows de validation, notifications et traçabilité.','Interface multilingue et préférences utilisateur.','Exports, rapports et indicateurs consolidés.','Sécurité par rôles, permissions, audit, sauvegarde et synchronisation.')){$sel.Style=-49;$sel.TypeText($item);$sel.TypeParagraph()}

  $index=1
  foreach($module in $modules){
    $sel.Style=-2; $sel.TypeText("$index. $($module.Name)"); $sel.TypeParagraph()
    $sel.Style=-3; $sel.TypeText('Finalité'); $sel.TypeParagraph()
    $sel.Style=-1; $sel.TypeText($module.Purpose); $sel.TypeParagraph()
    $sel.Style=-3; $sel.TypeText('Fonctionnalités principales'); $sel.TypeParagraph()
    foreach($feature in $module.Features){$sel.Style=-49;$sel.TypeText($feature);$sel.TypeParagraph()}
    $index++
  }

  $sel.Style=-2; $sel.TypeText('Flux transverses majeurs'); $sel.TypeParagraph()
  foreach($flow in @('Réservation → séjour / accès → consommations → facture → encaissement → comptabilité.','Achat → réception → mouvement de stock → consommation / production → contrôle dʼinventaire.','Recette déclarée → validation → rapprochement des encaissements → clôture journalière.','Employé → onboarding → affectation → planning / pointage → paie → télédéclaration.','Document → OCR → version → signature → archivage légal → politique de conservation.','Créance → relance → paiement → lettrage → suivi du recouvrement.')){$sel.Style=-50;$sel.TypeText($flow);$sel.TypeParagraph()}
  $sel.Style=-2; $sel.TypeText('Limites dʼintégration externe'); $sel.TypeParagraph()
  $sel.Style=-1; $sel.TypeText('Certaines fonctions nécessitent un service tiers ou un équipement pour être entièrement automatisées : moteur OCR pour images et PDF scannés, prestataire de signature électronique qualifiée, fournisseur ou récepteur AIS, channel manager, matériel de caisse et services officiels de télédéclaration. Le socle ERP prévoit les workflows et points dʼintégration correspondants.'); $sel.TypeParagraph()

  $doc.TablesOfContents.Item(1).Update()
  $doc.SaveAs2($docxPath,16)
} finally {
  $doc.Close($false)
  $word.Quit()
  [System.Runtime.InteropServices.Marshal]::ReleaseComObject($doc) | Out-Null
  [System.Runtime.InteropServices.Marshal]::ReleaseComObject($word) | Out-Null
}
Write-Output $docxPath
Write-Output $pdfPath
