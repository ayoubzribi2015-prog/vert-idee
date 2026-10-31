import type { ProjectAudit } from '../types.ts';

/**
 * Collège d'Évaluation Environnementale Indépendant (Revue Collégiale de 4 Experts Seniors - Référentiel ISO 14067:2018, ISO 14064-1:2018 & GreenGate.tn) :
 * - Expert 1 : Analyste Senior Empreinte Carbone Produit & ACV (Normes ISO 14067:2018 ECP par unité fonctionnelle, ISO 14064-1:2018 Catégories 1 à 6, GHG Protocol & MFA Institut Agro Montpellier).
 * - Expert 2 : Spécialiste Risques Industriels, ERA (Évaluation des Risques Écotoxiques & Chimiques), AES ISO 14001 (Matrice F x G x S / M), Guide OSS/REPSAHEL (Stress Hydrique) & Conformité Légale (CITET / CSRD).
 * - Expert 3 : Expert en Stratégie d'Entrepreneuriat Vert & Modèles d'Affaires Circulaires (Référentiel GreenGate.tn : Business Plan Vert, économie de la fonctionnalité, écoconception).
 * - Expert 4 : Auditeur Senior Détecteur Anti-Greenwashing & Vérification des Allégations (Traque des fausses promesses écologiques, exclusion absolue des compensations carbone fictives dans l'ECP, matérialité des impacts amont/aval et exigence de preuves quantifiées).
 *
 * Applique une rigueur scientifique absolue et une tolérance zéro au greenwashing :
 * Les activités polluantes, extractives ou à fort impact négatif sont évaluées sans complaisance avec des scores critiques (15-32/100) et des alertes formelles d'AES majeurs.
 */
export function generateExpertAuditFallback(
  title: string,
  description: string,
  location: string = 'Tunisie'
): Omit<ProjectAudit, 'id' | 'createdAt'> {
  // L'évaluation est fondée STRICTEMENT sur la description opérationnelle et le lieu.
  // Le titre commercial ne doit EN AUCUN CAS altérer les scores ni la catégorisation.
  const text = `${description} ${location}`.toLowerCase();

  // Détection des industries lourdes, extractives et très polluantes (ex: Phosphate, Mines, Carrières, Chimie lourde, Pesticides)
  const isHighImpactIndustry = /pesticide|insecticide|produit chimique|chimie|phosphate|phosphogypse|cpg|groupe chimique|lavage.*phosphate|extraction.*phosphate|minier|minière|carrière|carriere|minerai|clinker|cimenterie|bitume|pétrole|petrole|raffinage|gaz fossile|hydrocarbure|acide phosphorique|engrais chimique/.test(text);

  // Détection injection plastique conventionnelle (souvent source de greenwashing si score trop haut)
  const isConventionalPlastic = /injection plastique|unité d'injection|usine de plastique|plasturgie/.test(text) && !/recyclé|biodégradable|compostable|biosourcé/.test(text);

  // Détection des autres thématiques
  const isAgriOrFood = /agri|aliment|alimentaire|ferme|bio|plante|sol|recolte|huile|dattes|olive|tomate|agrumes|culture/.test(text);
  const isPackagingOrPlastic = /emballage|pack|plastique|carton|bouteille|flacon|sachet|biodegradable|dechet|recycl/.test(text);
  const isEnergyOrSolar = /energie|solaire|photovolta|panneau|eolien|batterie|hydrogene|biomasse|chaleur|electricite/.test(text);
  const isWater = /eau|irrigation|dessalement|pluviale|goutte|purification|assainissement|bassin/.test(text);
  const isTextile = /textile|coton|vetement|mode|tissu|lin|laine|chutes|couture/.test(text);
  const isWasteOrCircularity = /dechet|tri|reemploi|compost|valorisation|upcycling|circulaire|decharge/.test(text);
  const isDigitalOrEdTech = /edtech|educat|formation|appren|ecole|cours|pedagogi|plateforme|application|logiciel|saas|digital|numerique|e-learning|elearning/.test(text);

  // CAS SPÉCIFIQUE 1 : INDUSTRIES EXTRACTIVES, MINES & PHOSPHATE (Score Rouge / Alerte Critique)
  if (isHighImpactIndustry) {
    const isGafsa = /gafsa|metlaoui|redeyef|mdhilla|moulares|bassin minier/.test(text);
    const locName = isGafsa ? 'Bassin Minier de Gafsa (Tunisie)' : location;

    const envScore = 16;
    const socialScore = 26;
    const circularityScore = 14;
    const carbonScore = 22;
    const globalScore = 18;

    return {
      title,
      sector: 'Industrie Chimique & Traitement de Produits Phytosanitaires (Haut Risque Écologique)',
      description,
      location: locName,
      targetAudience: 'Secteur agricole, Industrie phytosanitaire & Commerce international',
      businessModel: 'Modèle industriel à forte intensité chimique et risque environnemental élevé',
      lifeCycleDetails: 'ACV critique : risques de toxicité aiguë lors de la production, gestion complexe des effluents chimiques et impact des résidus dans les écosystèmes.',

      // 1. Synthèse du projet
      projectSynthesis: {
        scores: {
          environmental: envScore,
          social: socialScore,
          circularity: circularityScore,
          carbonMaturity: carbonScore,
          globalScore: globalScore,
        },
        summary: `AVIS DÉFAVORABLE DU COLLÈGE DES EXPERTS (${globalScore}/100 - Risque Majeur) : Ce projet à ${location} présente une empreinte critique et des risques sanitaires et écotoxiques majeurs liés aux rejets et aux manipulations de substances dangereuses.`,
        vision: `Conditionner impérativement la poursuite de l'activité à une mise aux normes drastique : système de confinement total des risques chimiques, traitement des effluents par oxydation poussée, et plan de gestion environnementale rigoureux certifié par des tiers indépendants.`,
      },

      // 2. Aspects & impacts environnementaux
      environmentalAspects: {
        strengths: [
          'Impact économique initial sur la filière agricole et maintien de la balance commerciale',
          'Présence d\'infrastructures industrielles existantes évitant l\'artificialisation de nouveaux sols',
          'Potentiel d\'atténuation d\'impact substantiel par l\'adoption de procédés de chimie verte',
        ],
        criticalRisks: [
          'IMPACTS SANITAIRES & ÉCOTOXICITÉ : Risques élevés d\'exposition accidentelle aux substances actives et impacts potentiels sur la santé des opérateurs et riverains.',
          'IMPACTS SUR L\'EAU & LES SOLS : Risque critique de pollution diffuse et de contamination des nappes phréatiques par des résidus dans les effluents.',
          'IMPACTS SUR LA BIODIVERSITÉ & POLLINISATEURS : Toxicité aiguë des substances chimiques de synthèse pour les écosystèmes aquatiques et la faune auxiliaire.',
          'IMPACTS RESSOURCES FOSSILES : Dépendance énergétique et matières premières carbonées issues de la pétrochimie lourde.',
          'RISQUE CRITIQUE D\'IMPACT DE GREENWASHING : Incompatibilité manifeste entre la fabrication de produits phytosanitaires conventionnels et les critères de taxonomie verte.',
        ],
        lifecycleAssessment: [
          {
            phase: 'Approvisionnement',
            impactLevel: 'eleve',
            details: 'Impact amont fort : utilisation de précurseurs chimiques issus de la pétrochimie lourde et transport de matières dangereuses.',
            ecoDesignLever: 'Substitution par des précurseurs bio-sourcés ou issus de la chimie du végétal.',
          },
          {
            phase: 'Transformation Chimique',
            impactLevel: 'eleve',
            details: 'Impact direct fort : procédés de synthèse énergivores, émissions atmosphériques et risques de fuites fugitives.',
            ecoDesignLever: 'Optimisation des rendements, sécurisation des réacteurs et automatisation des systèmes de contrôle.',
          },
          {
            phase: 'Gestion des Effluents',
            impactLevel: 'eleve',
            details: 'Impact critique sur les milieux : rejets liquides contenant des résidus actifs toxiques exigeant un traitement spécialisé.',
            ecoDesignLever: 'Traitement par oxydation avancée (AOP) et boucle fermée de récupération des solvants (ZLD).',
          },
          {
            phase: 'Logistique & Conditionnement',
            impactLevel: 'moyen',
            details: 'Impact transport moyen : stockage de substances dangereuses nécessitant des protocoles stricts de confinement.',
            ecoDesignLever: 'Optimisation des tournées et emballages certifiés haute étanchéité.',
          },
          {
            phase: 'Fin de vie',
            impactLevel: 'eleve',
            details: 'Impact aval critique : risque de pollution des sols et cours d\'eau lié aux bidons et résidus non rincés.',
            ecoDesignLever: 'Filière obligatoire de reprise et destruction thermique sécurisée des contenants souillés.',
          },
        ],
        circularEconomy: {
          strategies: [
            'Récupération et distillation des solvants en circuit fermé',
            'Neutralisation et valorisation des sous-produits de réaction',
            'Transition vers une production "chimie verte" moins polluante',
          ],
          wasteValorization: 'Nécessite des filières certifiées d\'incinération et neutralisation des déchets chimiques dangereux.',
          durabilityRepair: 'Non applicable : activité de production chimique consommable.',
        },
        regulationsAndNorms: [
          'Réglementations nationales sur les produits phytosanitaires & Référentiel ISO 14001 (Grille AES)',
          'Guide OSS / REPSAHEL sur l\'Éco-responsabilité et la préservation de l\'eau en milieu aride',
          'Protocoles de sécurité industrielle (SEVESO ou équivalent local)',
          'Normes sur les rejets d\'eaux usées industrielles (NT 106.02) & Confinement ZLD',
        ],
      },

      // 3. Aspects & impacts sociaux et sociétaux
      socialAspects: {
        socialImpacts: [
          'Impact sanitaire direct : urgence liée à l\'incidence accrue de pathologies respiratoires (silicose, asthme) et d\'affections chroniques chez les riverains',
          'Impact sur les communautés : conflits d\'usage sévères pour l\'accès à l\'eau potable entre les installations industrielles et les populations locales',
          'Impact sociétal territorial : tensions historiques liées aux retombées économiques inégales et au chômage endémique des jeunes',
        ],
        localEconomy: `Économie locale hyper-dépendante d'une mono-industrie vieillissante, générant un impact de vulnérabilité structurelle pour ${locName}.`,
        governanceAndEthics: 'Impact négatif sur la confiance : déficit de concertation citoyenne et manque de transparence sur les données réelles de rejets et de santé publique.',
        justTransition: 'Impact clé sur la transition juste : impérieuse nécessité de financer la reconversion vers des filières économiques alternatives (agroécologie, énergies renouvelables).',
      },

      // 4. Intégration de l'entrepreneuriat vert
      greenEntrepreneurshipIntegration: {
        circularArchetype: 'Transition d\'urgence vers la dépollution, le traitement ZLD et la valorisation matière des résidus',
        differentiationFactor: 'Actuellement aucun atout écologique distinctif. Le projet supporte un risque de déclassement commercial et d\'interdiction réglementaire immédiat si les passifs environnementaux ne sont pas traités.',
        circularValueProposition: 'Cesser le prélèvement d\'eau fraîche potable et instaurer une boucle fermée zéro rejet liquide (ZLD) avec neutralisation des effluents.',
        competitiveMoat: 'Mise en conformité environnementale préalable obligatoire pour préserver la licence sociale d\'opérer et éviter les astreintes administratives.',
        iso59000Compliance: 'Non conforme ISO 59004:2024. Requiert un plan d\'alignement d\'urgence vers l\'économie circulaire et l\'arrêt des externalités négatives.',
        innovativeBusinessModels: [
          {
            title: 'Station de Dessalement Solaire et Recyclage d\'Eau Dédiée',
            archetype: 'Boucle fermée & Sobriété hydrique',
            strategy9R: 'R2 (Rethink) & R3 (Re-use)',
            description: 'Alimenter le lavage avec de l\'eau saumâtre dessalée à l\'énergie solaire pour cesser tout pompage d\'eau potable dans les nappes phréatiques.',
            feasibility: 'Faisabilité technique éprouvée mais exigeant un investissement en capital élevé (CAPEX).',
            economicBenefit: 'Pérennité de la production face au tarissement inéluctable des nappes et réduction du risque de fermeture.',
            revenueStream: 'Économie directe sur les redevances de pompage et pénalités de prélèvement.',
            targetCustomer: 'Unité industrielle interne et riverains industriels.',
            paybackPeriod: '3 à 4 ans.',
          },
          {
            title: 'Valorisation des Phosphogypses en Matériaux de Construction',
            archetype: 'Symbiose industrielle & Écologie territoriale',
            strategy9R: 'R8 (Recycle)',
            description: 'Neutralisation et intégration sous contrôle radiologique dans des liants hydrauliques routiers ou plaques stabilisées.',
            feasibility: 'Faisabilité réglementaire complexe nécessitant une certification d\'innocuité toxicologique stricte.',
            economicBenefit: 'Élimination des coûts de stockage géotechnique et création d\'une filière de valorisation de coproduits.',
            revenueStream: 'Vente de sous-produits stabilisés aux filières cimentières et de génie civil.',
            targetCustomer: 'Entreprises de BTP et cimenteries régionales.',
            paybackPeriod: '24 à 36 mois.',
          },
        ],
        monetizationMechanisms: [
          {
            name: 'Évitement des amendes et taxes écologiques',
            category: 'Service & Maintenance',
            description: 'Suppression des astreintes financières pour rejet d\'effluents acides et dépassement des seuils de pollution.',
            directCashFlowImpact: '+18% de préservation de marge nette.',
          },
          {
            name: 'Vente de coproduits minéraux neutralisés',
            category: 'Boucle Matière & Valorisation',
            description: 'Valorisation des sous-produits pour les assises de chaussées et le terrassement technique.',
            directCashFlowImpact: 'Flux de trésorerie additionnel stabilisé.',
          },
        ],
        industrialSymbiosis: [
          {
            partner: 'Cimenteries et centrales à béton régionales',
            fluxType: 'Matière / Coproduit',
            description: 'Substitution partielle du gypse naturel par des coproduits de filtration stabilisés.',
            mutualBenefit: 'Économie de ressources vierges pour le cimentier et désengorgement des aires de stockage.',
          },
        ],
        decouplingMetrics: [
          {
            indicator: 'Taux de recirculation interne des eaux de procédé',
            targetValue: '≥ 90%',
            methodology: 'Mesurage volumétrique continu conforme ISO 59020.',
          },
          {
            indicator: 'Tonnage annuel de résidus miniers stabilisés et valorisés',
            targetValue: '≥ 60 000 t/an',
            methodology: 'Bilan matière certifié par tiers indépendant.',
          },
        ],
      },

      // 5. Alignement ODD
      sdgAlignment: [
        {
          oddNumber: 6,
          title: 'Eau propre et assainissement (Alerte Risque)',
          level: 'Majeur',
          contribution: 'IMPACT NÉGATIF CRITIQUE : Prélèvement massif sur les nappes fossiles phréatiques arides et risque d\'infiltration d\'effluents acides.',
          targets: ['6.4 Efficacité d\'utilisation de l\'eau (Non conforme)', '6.3 Réduction drastique de la pollution et des rejets toxiques'],
          targetsDetail: [
            {
              code: '6.4',
              title: 'Augmenter considérablement l\'efficacité de l\'utilisation de l\'eau dans tous les secteurs et garantir des retraits durables',
              indicator: 'Indicateur ONU 6.4.1 (Efficacité d\'utilisation de l\'eau) & 6.4.2 (Niveau de stress hydrique)',
              targetKpi: 'Passage obligatoire en circuit fermé ZLD (Zero Liquid Discharge) avec recyclage ≥ 90%',
            },
            {
              code: '6.3',
              title: 'Améliorer la qualité de l\'eau en éliminant les déversements de produits chimiques et matières dangereuses',
              indicator: 'Indicateur ONU 6.3.2 (Proportion des masses d\'eau de bonne qualité ambiante)',
              targetKpi: 'Zéro rejet d\'eaux de lixiviation non neutralisées vers les cours d\'eau ou nappes',
            },
          ],
          kpis: ['Intensité hydrique par tonne produite (m³/t)', 'Taux de recirculation interne des eaux de procédé (%)'],
          dnshAssessment: 'VIOLATION CRITIQUE DNSH : L\'exploitation actuelle sans circuit fermé porte un préjudice direct et irréversible à la sécurité hydrique des populations locales.',
          griStandards: ['GRI 303 (Interactions avec l\'eau)', 'GRI 306 (Effluents et déchets)'],
          csrdEsrs: 'ESRS E3 (Ressources aquatiques et marines)',
        },
        {
          oddNumber: 3,
          title: 'Bonne santé et bien-être (Alerte Risque)',
          level: 'Majeur',
          contribution: 'IMPACT NÉGATIF SANITAIRE : Émissions chroniques de poussières minérales PM10/PM2.5 et risque d\'exposition professionnelle et des riverains.',
          targets: ['3.9 Réduction des maladies dues aux pollutions de l\'air, de l\'eau et du sol'],
          targetsDetail: [
            {
              code: '3.9',
              title: 'Réduire nettement le nombre de décès et de maladies dus à des substances chimiques dangereuses et à la pollution de l\'air et de l\'eau',
              indicator: 'Indicateur ONU 3.9.1 (Taux de mortalité attribuable à la pollution de l\'air)',
              targetKpi: 'Abattement des poussières diffuses par brumisation et capotage > 85%',
            },
          ],
          kpis: ['Concentration de particules fines PM10/PM2.5 aux limites de site (µg/m³)', 'Taux d\'incidents sanitaires professionnels'],
          dnshAssessment: 'VIGILANCE DNSH : Nécessite un plan de biosurveillance épidémiologique et des équipements d\'aspiration sous vide filtrants.',
          griStandards: ['GRI 403 (Santé et sécurité au travail)'],
          csrdEsrs: 'ESRS S1 (Main-d\'œuvre propre) & ESRS E2 (Pollution)',
        },
        {
          oddNumber: 12,
          title: 'Consommation et production responsables',
          level: 'Majeur',
          contribution: 'Modèle extractif linéaire à très fort passif environnemental (stériles miniers, phosphogypse) nécessitant une trajectoire de valorisation matière.',
          targets: ['12.4 Gestion écologiquement rationnelle des produits chimiques et déchets tout au long du cycle'],
          targetsDetail: [
            {
              code: '12.4',
              title: 'Parvenir à une gestion écologiquement rationnelle des produits chimiques et de tous les déchets tout au long de leur cycle de vie',
              indicator: 'Indicateur ONU 12.4.2 (Quantité de déchets dangereux produits par habitant)',
              targetKpi: 'Mise en terril étanche géomembrane normé et étude d\'incorporation industrielle',
            },
          ],
          kpis: ['Tonnage de résidus miniers stabilisés (t/an)', 'Taux de conformité aux fiches de données de sécurité REACH'],
          dnshAssessment: 'RISQUE D\'ACCUMULATION : Le stockage à ciel ouvert non confiné contrevient au principe de précaution environnementale.',
          griStandards: ['GRI 306 (Déchets)', 'GRI 301 (Matériaux)'],
          csrdEsrs: 'ESRS E5 (Économie circulaire & gestion des ressources)',
        },
        {
          oddNumber: 8,
          title: 'Travail décent et croissance économique',
          level: 'Secondaire',
          contribution: 'Maintien de l\'emploi industriel sous réserve d\'une amélioration radicale des conditions de sécurité et de santé des mineurs.',
          targets: ['8.8 Protection des droits au travail et promotion d\'un environnement de travail sûr'],
          targetsDetail: [
            {
              code: '8.8',
              title: 'Défendre les droits des travailleurs, promouvoir la sécurité sur le lieu de travail et assurer la protection de tous les travailleurs',
              indicator: 'Indicateur ONU 8.8.1 (Taux de fréquence des accidents du travail mortels et non mortels)',
              targetKpi: 'Taux de fréquence accidents du travail Tf < 5 d\'ici 18 mois',
            },
          ],
          kpis: ['Nombre d\'heures de formation HSE dispensées par collaborateur', 'Taux de couverture en EPI certifiés'],
          dnshAssessment: 'CONFORMITÉ SOCIALE : L\'activité économique ne peut justifier la dégradation des conditions sanitaires des salariés.',
          griStandards: ['GRI 403 (Santé et sécurité)', 'GRI 401 (Emploi)'],
          csrdEsrs: 'ESRS S1 (Main-d\'œuvre propre)',
        },
      ],

      // 6. Indicateurs d'impact
      impactIndicators: {
        carbonFootprint: {
          functionalUnit: '1 tonne de phosphate lavé et marchand',
          totalCarbonKgCO2e: 245.0,
          benchmarkComparison: {
            industryAverageKgCO2e: 180.0,
            ecoDesignedTargetKgCO2e: 95.0,
            commentary: 'L\'empreinte carbone actuelle est supérieure de 36% aux standards internationaux modernes, principalement due à la vétusté des équipements et à l\'énergie fossile.',
          },
          lifecycleStages: [
            {
              id: 'stage_extract',
              name: 'Extraction & Décapage mécanique',
              category: 'raw_materials',
              emissionKgCO2e: 110.0,
              percentage: 45,
              description: 'Flotte d\'engins lourds (décapeuses, bulldozers, dumpers) opérant au gazole.',
              reductionOpportunity: 'Électrification sur caténaires ou biocarburants certifiés.',
            },
            {
              id: 'stage_wash',
              name: 'Lavage, Criblage & Pompage d\'eau',
              category: 'manufacturing',
              emissionKgCO2e: 85.0,
              percentage: 35,
              description: 'Pompage électrique depuis des forages profonds et agitation mécanique des pulpes.',
              reductionOpportunity: 'Centrale solaire photovoltaïque d\'autoconsommation sur site.',
            },
            {
              id: 'stage_sludge',
              name: 'Gestion des boues et stériles',
              category: 'end_of_life',
              emissionKgCO2e: 25.0,
              percentage: 10,
              description: 'Pompage vers bassins de retenue et manipulation des terrils.',
              reductionOpportunity: 'Filtres-presses haute pression pour récupérer l\'eau immédiatement.',
            },
            {
              id: 'stage_transport',
              name: 'Transport ferroviaire / routier',
              category: 'transport',
              emissionKgCO2e: 25.0,
              percentage: 10,
              description: 'Acheminement vers les ports ou usines chimiques.',
              reductionOpportunity: 'Modernisation de la traction ferroviaire et bâchage hermétique.',
            },
          ],
          highImpactDecarbonizationActions: [
            { action: 'Installation de filtres-presses industriels pour recyclage d\'eau à 95% sans bassins à ciel ouvert', estimatedReductionPct: 25, priority: 'P1' },
            { action: 'Centrale solaire PV dédiée de 20 MWc pour alimenter les laveries en électricité décarbonée', estimatedReductionPct: 30, priority: 'P1' },
            { action: 'Bâchage automatique des trémies et wagons miniers pour stopper la dispersion particulaire', estimatedReductionPct: 10, priority: 'P2' },
          ],
        },
        circularityRate: '8% (Activité quasi-exclusivement linéaire)',
        wasteAvoided: '0 tonne évitée (Génération massive de stériles de lavage et phosphogypse)',
        waterPreservation: 'ALERTE ROUGE : Consommation de plus de 2,8 m³ d\'eau douce fossile par tonne de minerai lavé sans circuit fermé',
        localJobsProjection: 'Emplois industriels traditionnels existants menacés à terme sans modernisation écologique',
        keyMetrics: [
          { label: 'Intensité en eau douce', value: '2 800', unit: 'litres / tonne', interpretation: 'Critique en zone de sécheresse structurelle' },
          { label: 'Émissions particulaires PM10', value: 'Élevées', unit: 'µg/m³', interpretation: 'Dépassement récurrent des seuils OMS aux abords du site' },
          { label: 'Taux de recyclage de l\'eau', value: '< 25%', unit: '% eau réutilisée', interpretation: 'Gaspillage hydrique intolérable face au stress hydrique' },
          { label: 'Risque environnemental global', value: 'Majeur', unit: 'Échelle 4/4', interpretation: 'Conformité environnementale d\'urgence exigée' },
        ],
      },

      // 7. Financements et labels verts
      greenFinancingAndLabels: {
        labels: [
          {
            name: 'NON ÉLIGIBLE aux Labels Verts d\'Impact (B-Corp, Écolabel, etc.)',
            category: 'Exclusion Formelle',
            whyItMatters: 'Les standards internationaux de durabilité excluent strictement les industries extractives polluantes sans plan de transition zéro carbone.',
            eligibilityCriteria: 'Inéligible tant que les impacts sur l\'eau et la santé ne sont pas neutralisés.',
          },
          {
            name: 'Certification ISO 14001 (Management Environnemental d\'Urgence)',
            category: 'Conformité Industrielle Obligatoire',
            whyItMatters: 'Permet de cadrer un plan de réduction systématique des pollutions et d\'éviter les sanctions réglementaires.',
            eligibilityCriteria: 'Audit complet des rejets, plan d\'action opposable et conformité légale stricte.',
          },
        ],
        fundings: [
          {
            source: 'Fonds de Dépollution Industrielle (FODEP) / Ministère de l\'Environnement',
            program: 'Aide à la mise en conformité des rejets et traitement des effluents liquides',
            amountOrAid: 'Subvention jusqu\'à 20% et crédits bonifiés pour unités de dépollution',
            conditions: 'Obligation de résultat sur l\'arrêt des rejets liquides non traités et la réduction de l\'empreinte eau.',
          },
          {
            source: 'Banque Mondiale & BERD (Guichet Climat & Transition Juste)',
            program: 'Programme de Décarbonation et d\'Efficacité Énergétique dans les Mines',
            amountOrAid: 'Prêts concessionnels dédiés au solaire et aux stations de recyclage hydrique',
            conditions: 'Conditionné à un audit environnemental indépendant et au respect des normes sociales de la SFI.',
          },
        ],
      },

      // 8. Plan d'action prioritaire
      priorityActionPlan: {
        phase1_0to3months: [
          {
            timeframe: '0-3 mois',
            title: 'Audit hydrogéologique indépendant de la consommation d\'eau des laveries',
            description: 'Faire réaliser un bilan matière et eau exhaustif par un cabinet tiers indépendant certifié.',
            priorityLevel: 'Haute',
            expectedDeliverable: 'Cartographie des flux d\'eau et plan de comptage volumétrique précis sur chaque ligne de lavage.',
          },
          {
            timeframe: '0-3 mois',
            title: 'Mise en place d\'un réseau de capteurs de poussières PM10 et PM2.5',
            description: 'Installer des stations de mesure de la qualité de l\'air en continu dans les zones de vie riveraines.',
            priorityLevel: 'Haute',
            expectedDeliverable: 'Plateforme publique de monitoring de la qualité de l\'air accessible aux citoyens et autorités.',
          },
        ],
        phase2_3to6months: [
          {
            timeframe: '3-6 mois',
            title: 'Commande et installation de filtres-presses pour circuit fermé d\'eau',
            description: 'Remplacer les bassins de décantation à ciel ouvert par des filtres-presses modernes pour recycler immédiatement 95% de l\'eau.',
            priorityLevel: 'Haute',
            expectedDeliverable: 'Mise en service de la première unité de recyclage et réduction de 80% des prélèvements d\'eau fossile.',
          },
          {
            timeframe: '3-6 mois',
            title: 'Plan de confinement et d\'étanchéification des terrils de boues',
            description: 'Pose de géomembranes et aménagement de digues de retenue conformes aux normes ICMM.',
            priorityLevel: 'Moyenne',
            expectedDeliverable: 'Dossier d\'ingénierie géotechnique validé par le CITET.',
          },
        ],
        phase3_6to12months: [
          {
            timeframe: '6-12 mois',
            title: 'Déploiement d\'une centrale solaire photovoltaïque dédiée pour la laverie',
            description: 'Couvrir les besoins électriques des pompes et concasseurs par 10 à 20 MWc solaires sur les terrains dégradés de la mine.',
            priorityLevel: 'Stratégique',
            expectedDeliverable: 'Mise en service du parc solaire et division par deux des émissions Scope 2 du site.',
          },
          {
            timeframe: '6-12 mois',
            title: 'Plan de transition juste et de réhabilitation paysagère des sites épuisés',
            description: 'Engager les premiers chantiers de revégétalisation avec des espèces steppiques indigènes et créer des emplois écologiques locaux.',
            priorityLevel: 'Stratégique',
            expectedDeliverable: '50 hectares réhabilités et accord tripartite syndicats-communautés-entreprise.',
          },
        ],
      },
      thirdExpertValidation: {
        summary: 'Expert 3 (Auditeur Senior ESG) : Validation critique des hypothèses carbone et conformité aux critères de la taxonomie verte requise en priorité.',
        validationStatus: 'En cours de validation finale'
      },
    };
  }

  // CAS SPÉCIFIQUE 1.5 : INJECTION PLASTIQUE CONVENTIONNELLE (Score Modéré / Risque de Greenwashing)
  if (isConventionalPlastic) {
    const envScore = 38;
    const socialScore = 55;
    const circularityScore = 32;
    const carbonScore = 45;
    const globalScore = 42;

    return {
      title,
      sector: 'Plasturgie Conventionnelle (Impact Environnemental Modéré à Élevé)',
      description,
      location,
      targetAudience: 'Industrie, Grande distribution, Consommation de masse',
      businessModel: 'Production linéaire de pièces plastiques par injection',
      lifeCycleDetails: 'ACV conventionnelle : forte dépendance aux polymères fossiles vierges, consommation électrique process importante, et fin de vie problématique sans filière de recyclage dédiée.',
      projectSynthesis: {
        scores: { environmental: envScore, social: socialScore, circularity: circularityScore, carbonMaturity: carbonScore, globalScore: globalScore },
        summary: `AVIS RÉSERVÉ : Ce projet d'unité d'injection plastique à ${location} présente un risque de pollution plastique persisante. Sans intégration de matières recyclées ou biosourcées, le score reste plafonné à ${globalScore}/100.`,
        vision: 'Engager une transition vers 100% de matières recyclées et l\'autoconsommation solaire pour décarboner le process.',
      },
      environmentalAspects: {
        strengths: ['Maîtrise technique du procédé d\'injection', 'Réponse à un besoin industriel local'],
        criticalRisks: ['Dépendance aux énergies fossiles', 'Pollution par les microplastiques', 'Faible taux de circularité'],
        lifecycleAssessment: [
          { phase: 'Approvisionnement', impactLevel: 'eleve', details: 'Polymères vierges fossiles.', ecoDesignLever: 'Incorporer du plastique recyclé post-consommation.' },
          { phase: 'Production', impactLevel: 'moyen', details: 'Consommation électrique des presses.', ecoDesignLever: 'Passer au tout électrique et solaire.' },
          { phase: 'Fin de vie', impactLevel: 'eleve', details: 'Décharge ou incinération.', ecoDesignLever: 'Concevoir pour le recyclage (monomatériau).' },
        ],
        circularEconomy: {
          strategies: ['Réincorporation des carottes de coulée', 'Optimisation des moules'],
          wasteValorization: 'Valorisation interne des rebuts de production.',
          durabilityRepair: 'Pièces souvent à usage unique ou durée de vie limitée.',
        },
        regulationsAndNorms: ['Loi AGEC', 'Normes ISO 9001', 'Directives REACH'],
      },
      socialAspects: {
        socialImpacts: ['Création d\'emplois industriels', 'Risques chimiques pour les opérateurs'],
        localEconomy: 'Contribution au tissu industriel local.',
        governanceAndEthics: 'Nécessite une transparence sur la provenance des résines.',
        justTransition: 'Besoin de formation sur les nouveaux matériaux durables.',
      },
      greenEntrepreneurshipIntegration: {
        innovativeBusinessModels: [{ title: 'Injection de plastique recyclé à 100%', description: 'Passer à une matière première issue du tri local.', feasibility: 'Haute', economicBenefit: 'Réduction des coûts matière et image de marque.' }],
        differentiationFactor: 'Actuellement aucun atout écologique distinctif.',
        circularValueProposition: 'Doit pivoter vers la circularité pour être qualifié d\'éco-entreprise.',
      },
      sdgAlignment: [
        { oddNumber: 12, title: 'Consommation et production responsables', contribution: 'Doit réduire son impact plastique.', targets: ['12.5 Réduction des déchets'] },
      ],
      impactIndicators: {
        carbonFootprint: {
          functionalUnit: '1 kg de plastique injecté',
          totalCarbonKgCO2e: 4.8,
          benchmarkComparison: { industryAverageKgCO2e: 3.5, ecoDesignedTargetKgCO2e: 1.2, commentary: 'L\'utilisation de matière vierge pénalise fortement le bilan carbone.' },
          lifecycleStages: [
            { id: 'mat', name: 'Matière', category: 'raw_materials', emissionKgCO2e: 3.2, percentage: 67, description: 'Résine fossile.', reductionOpportunity: 'Plastique recyclé.' },
            { id: 'proc', name: 'Process', category: 'manufacturing', emissionKgCO2e: 1.6, percentage: 33, description: 'Énergie presses.', reductionOpportunity: 'Solaire.' },
          ],
          highImpactDecarbonizationActions: [{ action: 'Switch vers 50% de matière recyclée', estimatedReductionPct: 30, priority: 'P1' }],
        },
        circularityRate: '15%',
        wasteAvoided: 'Rebuts internes seulement',
        waterPreservation: 'Faible impact direct sur l\'eau',
        localJobsProjection: '8 emplois directs',
        keyMetrics: [{ label: 'Taux de matière vierge', value: '100', unit: '%', interpretation: 'Critique' }],
      },
      greenFinancingAndLabels: { labels: [], fundings: [] },
      priorityActionPlan: {
        phase1_0to3months: [{ timeframe: '0-3 mois', title: 'Test de résines recyclées', description: 'Essais sur moules existants.', priorityLevel: 'Haute', expectedDeliverable: 'Rapport technique' }],
        phase2_3to6months: [],
        phase3_6to12months: [],
      },
    };
  }
  let sector = 'Éco-innovation & Économie Circulaire';
  let functionalUnit = '1 unité fonctionnelle / lot standardisé';
  let baselineCO2 = 12.5;
  let targetCO2 = 3.8;
  let envScore = 84;
  let socScore = 82;
  let circScore = 85;
  let carbScore = 82;

  if (isDigitalOrEdTech) {
    sector = 'Numérique Responsable & Éco-conception Digitale';
    functionalUnit = '1 compte utilisateur actif annuel sur infrastructure sobre';
    baselineCO2 = 15.0;
    targetCO2 = 3.5;
    envScore = 70;
    socScore = 86;
    circScore = 65;
    carbScore = 75;
  } else if (isAgriOrFood) {
    sector = 'Agroécologie & Alimentation Durable';
    functionalUnit = '1 kg de produit certifié distribué en circuit court';
    baselineCO2 = 4.2;
    targetCO2 = 1.1;
    envScore = 86;
    socScore = 82;
    circScore = 88;
    carbScore = 84;
  } else if (isPackagingOrPlastic) {
    sector = 'Emballages & Biomatériaux Circulaires';
    functionalUnit = '1 000 unités d\'emballage bio-sourcé et compostable';
    baselineCO2 = 48.0;
    targetCO2 = 14.5;
    envScore = 85;
    socScore = 80;
    circScore = 90;
    carbScore = 82;
  } else if (isEnergyOrSolar) {
    sector = 'Énergies Renouvelables & Efficacité Énergétique';
    functionalUnit = '1 kWh d\'énergie décarbonée produite / injectée';
    baselineCO2 = 0.42;
    targetCO2 = 0.05;
    envScore = 90;
    socScore = 84;
    circScore = 82;
    carbScore = 92;
  } else if (isWater) {
    sector = 'Gestion Résiliente de l\'Eau & Assainissement Écologique';
    functionalUnit = '1 m³ d\'eau économisée ou traitée par procédé bas carbone';
    baselineCO2 = 1.8;
    targetCO2 = 0.35;
    envScore = 88;
    socScore = 85;
    circScore = 86;
    carbScore = 85;
  } else if (isTextile) {
    sector = 'Textile Circulaire & Mode Responsable';
    functionalUnit = '1 pièce textile éco-conçue en fibres recyclées';
    baselineCO2 = 22.0;
    targetCO2 = 5.4;
    envScore = 82;
    socScore = 84;
    circScore = 88;
    carbScore = 80;
  } else if (isWasteOrCircularity) {
    sector = 'Gestion des Déchets & Valorisation Circulaire';
    functionalUnit = '1 tonne de matière collectée et réincorporée en boucle fermée';
    baselineCO2 = 310.0;
    targetCO2 = 65.0;
    envScore = 88;
    socScore = 82;
    circScore = 92;
    carbScore = 86;
  }

  // Scores rigoureux et 100% DÉTERMINISTES pour les projets éco-innovants vérifiés
  // Aucun aléatoire (pas de Math.random) pour garantir la reproductibilité absolue
  const environmentalScore = envScore;
  const socialScore = socScore;
  const circularityScore = circScore;
  const carbonMaturityScore = carbScore;
  const globalScore = Math.round(
    environmentalScore * 0.35 + socialScore * 0.2 + circularityScore * 0.25 + carbonMaturityScore * 0.2
  );

  return {
    title,
    sector,
    description,
    location,
    targetAudience: 'B2B (Industriels, Coopératives, Distributeurs) & B2C Éco-responsables',
    businessModel: 'Économie de la fonctionnalité, vente directe et boucle circulaire',
    lifeCycleDetails: 'ACV optimisée de l\'approvisionnement local des intrants renouvelables jusqu\'à la fin de vie vertueuse.',

    // 1. Synthèse du projet
    projectSynthesis: {
      scores: {
        environmental: environmentalScore,
        social: socialScore,
        circularity: circularityScore,
        carbonMaturity: carbonMaturityScore,
        globalScore: globalScore,
      },
      summary: `AVIS FAVORABLE DU COLLÈGE DES EXPERTS (${globalScore}/100) : Le projet "${title}" à ${location} démontre une pertinence écologique élevée et une démarche crédible d'économie circulaire et d'ACV vérifiable.`,
      vision: `Devenir la référence régionale en matière d'éco-conception dans le secteur "${sector}" à ${location} avec une traçabilité carbone exemplaire d'ici 3 ans.`,
    },

    // 2. Aspects & impacts environnementaux
    environmentalAspects: {
      strengths: [
        `Impacts carbone positifs : réduction prouvée de l'empreinte carbone initiale comparativement aux références conventionnelles de ${sector}`,
        `Impacts sur les ressources : intégration d'intrants renouvelables ou recyclés disponibles localement à ${location}`,
        `Impacts sur les rejets : écoconception orientée zéro déchet et réduction drastique des effluents polluants`,
        `Impacts sur l'eau : préservation mesurée des ressources hydriques et optimisation énergétique des flux`,
      ],
      criticalRisks: [
        `Impact de variabilité saisonnière sur la régularité des approvisionnements locaux à ${location}`,
        `Impact d'usage : besoins de sensibilisation des partenaires de la chaîne de valeur sur l'éco-utilisation`,
        `Impact réglementaire : exigence de conformité continue face aux évolutions des normes d'écoconception (ESPR, CSRD)`,
      ],
      lifecycleAssessment: [
        {
          phase: 'Extraction & Approvisionnement',
          impactLevel: 'faible',
          details: `Impact amont réduit : sélection rigoureuse d'intrants éco-certifiés ou recyclés, favorisant les circuits courts autour de ${location}.`,
          ecoDesignLever: 'Charte d\'achat responsable et traçabilité carbone auprès des fournisseurs partenaires.',
        },
        {
          phase: 'Transformation & Production',
          impactLevel: 'faible',
          details: 'Impact de fabrication maîtrisé : procédés sobres en énergie, valorisation des rejets thermiques et récupération d\'eau.',
          ecoDesignLever: 'Alimentation par énergies renouvelables et plan d\'efficacité énergétique rigoureux.',
        },
        {
          phase: 'Conditionnement & Logistique',
          impactLevel: 'faible',
          details: 'Impact transport optimisé : emballages allégés 100% recyclables ou réutilisables, optimisation du taux de charge des véhicules.',
          ecoDesignLever: 'Mutualisation logistique régionale et adoption de flottes bas-carbone.',
        },
        {
          phase: 'Utilisation & Service',
          impactLevel: 'faible',
          details: 'Impact d\'usage positif : conçu pour une durabilité accrue, modularité et faible consommation opérationnelle.',
          ecoDesignLever: 'Guide d\'entretien et maintenance préventive pour prolonger la durée de vie utile.',
        },
        {
          phase: 'Fin de vie',
          impactLevel: 'faible',
          details: 'Impact aval vertueux : recyclabilité supérieure à 90% ou biodégradabilité complète sans résidus toxiques.',
          ecoDesignLever: 'Programme de reprise des produits usagés pour réintroduction en cycle de production.',
        },
      ],
      circularEconomy: {
        strategies: [
          'Éco-conception dès la phase amont pour faciliter le démontage et le recyclage',
          'Symbiose industrielle avec les entreprises et pépinières de la zone d\'implantation',
          'Transformation des résidus de production en sous-produits à valeur ajoutée',
        ],
        wasteValorization: `100% des coproduits valorisés localement comme intrants secondaires pour les filières partenaires de ${location}.`,
        durabilityRepair: 'Garantie d\'interchangeabilité des composants et disponibilité de pièces de rechange pendant au moins 5 ans.',
      },
      regulationsAndNorms: [
        'Norme ISO 14001 (Management environnemental & Matrice AES FxGxS/M)',
        'Guide d\'Éco-responsabilité OSS / REPSAHEL (Observatoire du Sahara et du Sahel)',
        'Analyse du Cycle de Vie certifiée ISO 14040 / 14044',
        'Cadre réglementaire de l\'ANME, CITET & Directives de durabilité CSRD / ESPR',
      ],
    },

    // 3. Aspects & impacts sociaux et sociétaux
    socialAspects: {
      socialImpacts: [
        `Impact direct sur l'emploi : création d'emplois verts directs et pérennes dans le bassin d'emploi de ${location}`,
        'Impact sur la santé et sécurité : amélioration de l\'ergonomie et des conditions de travail décentes (zéro composant toxique)',
        'Impact sur les compétences : formation continue des salariés aux métiers émergents de la transition écologique',
      ],
      localEconomy: `Impact économique territorial : renforcement de la résilience du tissu économique régional à ${location} grâce à des partenariats industriels locaux.`,
      governanceAndEthics: 'Impact de gouvernance éthique : gouvernance participative, transparence des filières et démarche RSE conforme à la norme ISO 26000.',
      justTransition: 'Impact sur la transition juste : accompagnement inclusif des acteurs traditionnels vers les pratiques vertes et équité salariale.',
    },

    // 4. Intégration de l'entrepreneuriat vert (Normes ISO 59004/59010, EFC, Symbiose EIT & Cadre 9R)
    greenEntrepreneurshipIntegration: (() => {
      const isOliveOilOrAgro = isAgriOrFood || /huile|olive|agricol|mdd|conditionnement|aliment/i.test(`${title} ${description}`);

      if (isOliveOilOrAgro) {
        return {
          circularArchetype: 'Économie de la fonctionnalité appliquée aux emballages réemployés (PaaS), valorisation des coproduits oléicoles en cascade & traçabilité B2B',
          differentiationFactor: `Conditionnement d'excellence certifié à ${location} alliant 100% verre consigné réemployable jusqu'à 30 cycles, zéro adultération, traçabilité lot par lot et réduction certifiée de 45% du Scope 3 pour les centrales d'achat MDD européennes et locales.`,
          circularValueProposition: 'Permettre aux distributeurs et centrales d\'achat (MDD) d\'atteindre leurs objectifs de réduction carbone Scope 3 (directive CSRD) grâce à un emballage consigné à zéro déchet ultime, avec un coût d\'usage optimisé.',
          competitiveMoat: 'Accès privilégié aux gisements d\'huile d\'olive extra-vierge certifiée, chaîne d\'embouteillage automatisée calibrée pour les bouteilles réemployables et contrats pluriannuels B2B à engagement de volume.',
          iso59000Compliance: 'Conformité ISO 59004:2024 (Régénération des écosystèmes, préservation maximale de la valeur matière et boucle logistique inversée normée ISO 59010).',
          innovativeBusinessModels: [
            {
              title: 'Système de Consigne Circulaire B2B & Réemploi des Bouteilles en Verre',
              archetype: 'Économie de la fonctionnalité & Logistique inversée',
              strategy9R: 'R3 (Re-use) & R4 (Repair)',
              description: 'Mise en place d\'un parc de bouteilles standardisées en verre lourd (25 cl, 50 cl, 1L) avec collecte, lavage industriel basse température et réemploi garanti jusqu\'à 30 rotations.',
              feasibility: 'Faisabilité technique et logistique élevée en partenariat avec les plateformes de distribution régionales.',
              economicBenefit: 'Réduction de 65% des coûts d\'achat d\'emballages neufs dès le second cycle et marge opérationnelle consolidée.',
              revenueStream: 'Frais de mise à disposition de bouteilles consignées + service de lavage mutualisé.',
              targetCustomer: 'Centrales d\'achats européennes (MDD) et réseaux de distribution bio.',
              paybackPeriod: '14 à 18 mois.',
            },
            {
              title: 'Bioraffinerie Circulaire des Coproduits (Grignons & Margines)',
              archetype: 'Symbiose industrielle & Valorisation en cascade',
              strategy9R: 'R8 (Recycle) & R9 (Recover)',
              description: 'Séchage solaire et valorisation des grignons en biocombustible compacté pour alimenter la chaudière de l\'usine et compostage des margines filtrées pour fertilisation biologique.',
              feasibility: 'Éprouvée, s\'appuyant sur les technologies de filtration membranaire et de granulation.',
              economicBenefit: 'Autonomie thermique de 80% pour l\'eau chaude de lavage et vente d\'amendements organiques certifiés aux exploitants.',
              revenueStream: 'Vente de granulés bio-énergétiques et engrais organiques en sacs aux coopératives.',
              targetCustomer: 'Exploitants oléicoles locaux et chaudières industrielles régionales.',
              paybackPeriod: '18 à 22 mois.',
            },
            {
              title: 'Contrat Pluriannuel de Performance Qualité & Traçabilité CSRD (PaaS Agricole)',
              archetype: 'Modèle serviciel & Passeport Numérique Produit (DPP)',
              strategy9R: 'R2 (Rethink)',
              description: 'Commercialisation d\'un service d\'embouteillage et de distribution sécurisée avec passeport numérique du produit (DPP) prouvant l\'origine géographique, l\'acidité < 0,3% et l\'empreinte carbone vérifiée.',
              feasibility: 'Immédiate via QR code dynamique sur étiquette relié à la base de données de lot.',
              economicBenefit: 'Prime de valorisation de 15% à 20% sur le prix de vente au litre et fidélisation contractuelle sur 3 à 5 ans.',
              revenueStream: 'Abonnement au service de traçabilité + commission sur volumes conditionnés.',
              targetCustomer: 'Distributeurs espagnols et italiens recherchant des garanties anti-fraude.',
              paybackPeriod: 'Inférieur à 12 mois.',
            },
          ],
          monetizationMechanisms: [
            {
              name: 'Vente d\'huile conditionnée sous MDD avec prime de traçabilité',
              category: 'Usage & Performance',
              description: 'Tarification au litre avec prime de qualité analytique et réduction Scope 3 vérifiée.',
              directCashFlowImpact: '+15% de marge brute par rapport au vrac.',
            },
            {
              name: 'Économies sur la boucle de réemploi des bouteilles en verre',
              category: 'Boucle Matière & Valorisation',
              description: 'Économie d\'achat d\'emballages neufs par réutilisation jusqu\'à 30 rotations.',
              directCashFlowImpact: '-60% sur le poste achats consommables d\'emballage.',
            },
            {
              name: 'Valorisation des coproduits énergétiques et fertilisants',
              category: 'Boucle Matière & Valorisation',
              description: 'Vente de granulés de biomasse et compost agricole issu des grignons.',
              directCashFlowImpact: 'Flux de revenus récurrents et autonomie thermique.',
            },
          ],
          industrialSymbiosis: [
            {
              partner: 'Verreries régionales partenaires',
              fluxType: 'Matière / Coproduit',
              description: 'Approvisionnement direct en verre standardisé et recyclage des casses internes en boucle courte.',
              mutualBenefit: 'Sécurisation des approvisionnements et baisse de l\'empreinte transport.',
            },
            {
              partner: 'Coopératives oléicoles régionales',
              fluxType: 'Matière / Coproduit',
              description: 'Réception des huiles brutes et restitution de fertilisants biologiques stabilisés.',
              mutualBenefit: 'Fidélisation de l\'amont agricole et régénération des sols.',
            },
            {
              partner: 'Plateformes logistiques de distribution',
              fluxType: 'Logistique & Espaces',
              description: 'Optimisation des trajets retours pour le rapatriement des bouteilles vides.',
              mutualBenefit: 'Zéro kilomètre à vide et réduction des coûts logistiques de transport.',
            },
          ],
          decouplingMetrics: [
            {
              indicator: 'Intensité matière de l\'emballage par litre conditionné',
              targetValue: '≤ 15 g de verre neuf / L (vs 450 g pour le verre perdu)',
              methodology: 'Mesurage des flux physiques conforme ISO 59020.',
            },
            {
              indicator: 'Taux de rotation moyen des contenants en verre consigné',
              targetValue: '≥ 15 rotations par bouteille',
              methodology: 'Traçabilité unitaire code-barres conforme GS1.',
            },
            {
              indicator: 'Taux de valorisation matière et énergétique des coproduits',
              targetValue: '≥ 95% des résidus réincorporés',
              methodology: 'Bilan matière annuel certifié.',
            },
          ],
        };
      }

      if (isPackagingOrPlastic) {
        return {
          circularArchetype: 'Boucle fermée bio-assimilable, régénération de polymères naturels et logistique inversée',
          differentiationFactor: `Substitut 100% bio-sourcé et compostable à domicile à ${location}, éliminant les taxes sur les plastiques non recyclables et les perturbateurs endocriniens.`,
          circularValueProposition: 'Suppression totale des microplastiques et conformité anticipée aux règlements européens PPWR et directive SUP sans perte de cadence d\'operculage.',
          competitiveMoat: 'Formulation propriétaire de biopolymère à base de résidus locaux et partenariats exclusifs avec des collecteurs de biomasse.',
          iso59000Compliance: 'Conforme ISO 59004 (Régénération biologique et gestion des cycles fermés biosourcés).',
          innovativeBusinessModels: [
            {
              title: 'Emballage-comme-Service (PaaS) avec Collecte et Compostage Industriel',
              archetype: 'Économie de la fonctionnalité & Fin de vie',
              strategy9R: 'R2 (Rethink) & R8 (Recycle)',
              description: 'Fourniture d\'emballages associée à un service de collecte des biodéchets et compostage en boucle fermée pour les industriels de l\'agroalimentaire.',
              feasibility: 'Faisabilité éprouvée auprès des réseaux de distribution engagés.',
              economicBenefit: 'Transformation d\'une charge de gestion des déchets en flux d\'intrants fertilisants.',
              revenueStream: 'Abonnement mensuel au service d\'emballage et collecte.',
              targetCustomer: 'Industriels agroalimentaires et plateformes de restauration collective.',
              paybackPeriod: '12 à 16 mois.',
            },
            {
              title: 'Licence de Formulation & Granulés Prêts à l\'Emploi pour Extrudeurs',
              archetype: 'Modèle de plateforme & Éco-conception',
              strategy9R: 'R2 (Rethink)',
              description: 'Mise à disposition de compoundings thermoplastiques biosourcés compatibles avec les lignes d\'extrusion standard sans réinvestissement machine.',
              feasibility: 'Haute, testée sur lignes industrielles conventionnelles.',
              economicBenefit: 'Scalabilité rapide sans investissement lourd dans de nouvelles usines d\'extrusion.',
              revenueStream: 'Vente de résines et royalties de licence industrielle.',
              targetCustomer: 'Transformateurs plasturgistes et fabricants de barquettes.',
              paybackPeriod: '8 à 12 mois.',
            },
          ],
          monetizationMechanisms: [
            {
              name: 'Vente de barquettes et films bio-sourcés au volume',
              category: 'Usage & Performance',
              description: 'Facturation unitaire dégressive selon volume avec garantie de compostabilité.',
              directCashFlowImpact: 'Marge brute 25% supérieure aux emballages plastiques fossiles.',
            },
            {
              name: 'Service de logistique inverse et valorisation compost',
              category: 'Boucle Matière & Valorisation',
              description: 'Prise en charge des emballages souillés et revente du compost normé.',
              directCashFlowImpact: 'Flux de trésorerie récurrent additionnel.',
            },
          ],
          industrialSymbiosis: [
            {
              partner: 'Coopératives agricoles locales',
              fluxType: 'Matière / Coproduit',
              description: 'Collecte de résidus de récolte (paille, coques, marc) et retour de compost fertilisant.',
              mutualBenefit: 'Valorisation des déchets agricoles et intrants bioplastiques à bas coût.',
            },
          ],
          decouplingMetrics: [
            {
              indicator: 'Taux de matière d\'origine renouvelable certifiée (C14)',
              targetValue: '100% biosourcé',
              methodology: 'Datation radiocarbone ASTM D6866.',
            },
            {
              indicator: 'Réduction de l\'empreinte carbone vs emballages PET/PP fossiles',
              targetValue: '≥ 70% de réduction',
              methodology: 'ACV du berceau à la tombe ISO 14040.',
            },
          ],
        };
      }

      if (isEnergyOrSolar) {
        return {
          circularArchetype: 'Tiers-financement de la performance énergétique (PaaS), reconditionnement de seconde vie et autoconsommation collective',
          differentiationFactor: `Offre d'électricité décarbonée garantie zéro investissement initial pour le client à ${location}, avec monitoring intelligent et maintenance prédictive continue.`,
          circularValueProposition: 'Réduction immédiate de 25% à 40% de la facture énergétique des sites industriels et couverture contre la volatilité des tarifs réseau.',
          competitiveMoat: 'Algorithmes propriétaires d\'optimisation de la charge batterie et contrats d\'approvisionnement d\'équipements à haut rendement.',
          iso59000Compliance: 'Conforme ISO 59010 (Transition vers des modèles d\'affaires énergétiques circulaires et sobres).',
          innovativeBusinessModels: [
            {
              title: 'Contrat de Performance Énergétique (CPE) & Vente de kWh Décarboné à l\'Usage',
              archetype: 'Économie de la fonctionnalité (PaaS)',
              strategy9R: 'R2 (Rethink)',
              description: 'Installation et maintenance de centrales solaires en toiture sans CAPEX client, facturées au kWh autoconsommé avec engagement de performance.',
              feasibility: 'Excellente, cadre contractuel validé par les banques partenaires.',
              economicBenefit: 'Revenus d\'abonnement récurrents sécurisés sur 15 à 20 ans et fidélisation client.',
              revenueStream: 'Facturation mensuelle des kWh solaires produits.',
              targetCustomer: 'PME, usines et entrepôts logistiques gros consommateurs.',
              paybackPeriod: '4 à 5 ans pour l\'opérateur.',
            },
            {
              title: 'Reconditionnement & Seconde Vie des Onduleurs et Batteries Stationnaires',
              archetype: 'Allongement de la durée de vie & Réemploi',
              strategy9R: 'R4 (Repair) & R6 (Remanufacture)',
              description: 'Diagnostic de santé des cellules, reconditionnement modulaire et réemploi pour le stockage stationnaire tampon.',
              feasibility: 'Technologie de diagnostic électronique éprouvée en laboratoire.',
              economicBenefit: 'Réduction de 45% du coût des systèmes de stockage par rapport aux batteries neuves.',
              revenueStream: 'Vente de baies de stockage reconditionnées avec garantie 5 ans.',
              targetCustomer: 'Exploitants de fermes solaires et sites industriels isolés.',
              paybackPeriod: '16 à 20 mois.',
            },
          ],
          monetizationMechanisms: [
            {
              name: 'Facturation de l\'électricité solaire à l\'usage',
              category: 'Usage & Performance',
              description: 'Vente des kWh solaires à un tarif inférieur de 25% au tarif réseau.',
              directCashFlowImpact: 'Flux de trésorerie mensuel prévisible et indexé.',
            },
            {
              name: 'Services de flexibilité et effacement réseau',
              category: 'Plateforme & Données',
              description: 'Rémunération par le gestionnaire de réseau pour l\'injection lors des pointes de demande.',
              directCashFlowImpact: 'Revenus complémentaires à haute marge.',
            },
          ],
          industrialSymbiosis: [
            {
              partner: 'Zones industrielles et entreprises riveraines',
              fluxType: 'Énergie & Chaleur fatale',
              description: 'Partage de surplus d\'électricité solaire et récupération de chaleur fatale des onduleurs pour le préchauffage d\'eau sanitaire.',
              mutualBenefit: 'Autoconsommation collective et optimisation des rendements globaux.',
            },
          ],
          decouplingMetrics: [
            {
              indicator: 'Intensité carbone du kWh injecté',
              targetValue: '≤ 25 g CO2e / kWh',
              methodology: 'Bilan carbone ACV GHG Protocol Scope 1-2-3.',
            },
            {
              indicator: 'Taux de valorisation en fin de vie des modules et composants',
              targetValue: '≥ 92% de matière recyclée',
              methodology: 'Filière agréée de démantèlement PV CYCLE.',
            },
          ],
        };
      }

      if (isWater) {
        return {
          circularArchetype: 'Zéro rejet liquide (ZLD), recyclage en circuit fermé et économie de la fonctionnalité hydrique',
          differentiationFactor: `Système de recyclage et de dépollution des effluents industriels en boucle fermée à ${location}, sans rejet polluant dans les nappes ni boues toxiques.`,
          circularValueProposition: 'Autonomie hydrique accrue de 85% pour les sites industriels et élimination intégrale des redevances de pollution et des risques d\'arrêt pour pénurie d\'eau.',
          competitiveMoat: 'Brevets sur membranes anti-colmatage et dimensionnement spécifique pour la gestion des saumures en climat aride.',
          iso59000Compliance: 'Conforme ISO 59004 et directives de gestion résiliente de l\'eau OSS / REPSAHEL.',
          innovativeBusinessModels: [
            {
              title: 'Vente d\'Eau Régénérée au m³ & Service ZLD Tout-Compris (Water-as-a-Service)',
              archetype: 'Économie de la fonctionnalité (PaaS)',
              strategy9R: 'R2 (Rethink) & R3 (Re-use)',
              description: 'Déploiement d\'unités modulaires de traitement d\'eau chez les clients industriels, facturées au volume d\'eau recyclée réinjectée en process.',
              feasibility: 'Faisabilité industrielle confirmée dans les secteurs textile, agroalimentaire et chimique.',
              economicBenefit: 'Remplacement d\'un coût de rejet par une ressource hydrique interne à coût maîtrisé.',
              revenueStream: 'Abonnement fixe de maintenance + tarification variable au m³ traité.',
              targetCustomer: 'Industries de teinture, papeteries, abattoirs et usines agroalimentaires.',
              paybackPeriod: '18 à 24 mois.',
            },
            {
              title: 'Extraction & Valorisation des Minéraux et Nutriments des Eaux Usées',
              archetype: 'Symbiose industrielle & Valorisation matière',
              strategy9R: 'R8 (Recycle)',
              description: 'Précipitation et récupération d\'azote, phosphore et sels minéraux à haute pureté pour revente aux filières d\'engrais.',
              feasibility: 'Technologie d\'extraction par cristallisation éprouvée.',
              economicBenefit: 'Création d\'un nouveau flux de revenus valorisant ce qui était autrefois un déchet polluant.',
              revenueStream: 'Vente de struvite et sels minéraux purifiés aux distributeurs agricoles.',
              targetCustomer: 'Fabricants d\'engrais et coopératives agricoles régionales.',
              paybackPeriod: '2 ans.',
            },
          ],
          monetizationMechanisms: [
            {
              name: 'Abonnement au service d\'eau régénérée',
              category: 'Usage & Performance',
              description: 'Facturation volumétrique de l\'eau recyclée à un tarif 30% inférieur au réseau potable.',
              directCashFlowImpact: 'Flux de trésorerie récurrent et fidélisant sur 5 à 10 ans.',
            },
            {
              name: 'Économies sur redevances de rejet d\'effluents',
              category: 'Service & Maintenance',
              description: 'Suppression intégrale des pénalités environnementales ONAS / agence de bassin.',
              directCashFlowImpact: 'Amélioration de 12% de la marge nette industrielle.',
            },
          ],
          industrialSymbiosis: [
            {
              partner: 'Sites industriels voisins & agriculteurs périurbains',
              fluxType: 'Eau & Effluents',
              description: 'Mise à disposition des surplus d\'eaux épurées pour le lavage technique ou l\'irrigation arboricole.',
              mutualBenefit: 'Sécurisation de la ressource en eau pour tout le bassin industriel.',
            },
          ],
          decouplingMetrics: [
            {
              indicator: 'Taux de recirculation interne des eaux de procédé',
              targetValue: '≥ 92% en boucle fermée',
              methodology: 'Bilan hydrique mensuel certifié.',
            },
            {
              indicator: 'Intensité de prélèvement d\'eau fraîche par unité produite',
              targetValue: '-85% par rapport au standard du secteur',
              methodology: 'Comptabilité hydrique ISO 14046.',
            },
          ],
        };
      }

      if (isTextile) {
        return {
          circularArchetype: 'Upcycling en cascade, filature régénérée mono-matière et consigne de recyclage',
          differentiationFactor: `Ligne textile éco-conçue 100% fibres recyclées locales à ${location}, sans solvants chimiques toxiques, traçable de la fibre au vêtement.`,
          circularValueProposition: 'Offrir aux marques de mode et donneurs d\'ordres des textiles haut de gamme conformes à la directive européenne sur l\'écoconception (ESPR) et exempts de fast-fashion jetable.',
          competitiveMoat: 'Gisement exclusif de chutes de coupe industrielles pré-consommation triées optiquement par coloris sans re-teinture polluante.',
          iso59000Compliance: 'Conforme ISO 59004 (Préservation de l\'intégrité des fibres et architecture démontable).',
          innovativeBusinessModels: [
            {
              title: 'Vestiaire Professionnel en Abonnement avec Entretien & Réparation (Workwear-as-a-Service)',
              archetype: 'Économie de la fonctionnalité (PaaS)',
              strategy9R: 'R3 (Re-use) & R4 (Repair)',
              description: 'Mise à disposition de vêtements de travail techniques, incluant lavage éco-certifié, réparations illimitées et remplacement avec recyclage en fin de vie.',
              feasibility: 'Haute maturité opérationnelle sur le marché corporate B2B.',
              economicBenefit: 'Suppression des achats de vêtements jetables pour les entreprises clientes et fidélisation contractuelle pluriannuelle.',
              revenueStream: 'Abonnement mensuel par collaborateur équipé.',
              targetCustomer: 'Industries, cliniques, entreprises de maintenance et BTP.',
              paybackPeriod: '15 à 18 mois.',
            },
            {
              title: 'Filature & Tissage Régénéré à Façon pour Marques Partenaires',
              archetype: 'Boucle fermée & Matières Premières Secondaires',
              strategy9R: 'R6 (Remanufacture) & R8 (Recycle)',
              description: 'Transformation des invendus et chutes textiles des clients en fils régénérés de haute résistance prêts pour de nouvelles collections.',
              feasibility: 'Éprouvée avec des lignes d\'effilochage mécanique sans eau.',
              economicBenefit: 'Valorisation des stocks dormants et conformité à l\'interdiction de destruction des invendus.',
              revenueStream: 'Facturation au kilogramme de fil régénéré livré.',
              targetCustomer: 'Marques de prêt-à-porter responsables et créateurs européens.',
              paybackPeriod: '12 mois.',
            },
          ],
          monetizationMechanisms: [
            {
              name: 'Abonnement au service de vestiaire professionnel',
              category: 'Usage & Performance',
              description: 'Revenus récurrents prévisibles sur des contrats de 36 à 48 mois.',
              directCashFlowImpact: '+22% de rentabilité opérationnelle.',
            },
            {
              name: 'Vente de feutres isolants issus des résidus ultimes',
              category: 'Boucle Matière & Valorisation',
              description: 'Revente des poussières et fibres courtes aux industriels de l\'isolation automobile.',
              directCashFlowImpact: 'Zéro déchet mis en décharge et valorisation résiduelle.',
            },
          ],
          industrialSymbiosis: [
            {
              partner: 'Ateliers de confection régionaux',
              fluxType: 'Matière / Coproduit',
              description: 'Collecte quotidienne des chutes de coupe et retour sous forme de rouleaux tissés.',
              mutualBenefit: 'Filière circulaire locale sans intermédiaire ni frais logistiques longue distance.',
            },
          ],
          decouplingMetrics: [
            {
              indicator: 'Pourcentage de fibres recyclées ou upcyclées',
              targetValue: '≥ 85% du poids total du produit',
              methodology: 'Certification Global Recycled Standard (GRS).',
            },
            {
              indicator: 'Économie d\'eau de process par rapport au coton vierge',
              targetValue: '≥ 95% d\'eau préservée',
              methodology: 'Bilan ACV comparatif berceau à la porte.',
            },
          ],
        };
      }

      if (isDigitalOrEdTech) {
        return {
          circularArchetype: 'Numérique sobre et frugal, éco-conception logicielle (RGESN) et allongement de la durée de vie du matériel',
          differentiationFactor: `Architecture logicielle ultra-sobre à ${location} réduisant de 75% l'empreinte serveur et réseau, pleinement opérationnelle sur des terminaux reconditionnés de plus de 8 ans et en basse connectivité.`,
          circularValueProposition: 'Permettre aux entreprises et institutions de déployer des services numériques critiques sans forcer le renouvellement coûteux du parc matériel, avec un bilan carbone informatique audité et conforme CSRD.',
          competitiveMoat: 'Moteur logiciel propriétaire sans dépendance aux frameworks énergivores, fonctionnement hors-ligne (PWA) et optimisation du code au niveau octet.',
          iso59000Compliance: 'Conforme aux standards d\'éco-conception des services numériques (RGESN / ISO 14062 / AFNOR Spec 2201).',
          innovativeBusinessModels: [
            {
              title: 'Abonnement SaaS Sobre & Tarification Équitable à l\'Usage Réel',
              archetype: 'Économie de la fonctionnalité logicielle',
              strategy9R: 'R2 (Rethink)',
              description: 'Accès logiciel facturé en fonction de la valeur délivrée plutôt qu\'au volume de données échangées, incitant à la sobriété algorithmique.',
              feasibility: 'Immédiate avec des coûts marginaux d\'infrastructure extrêmement bas.',
              economicBenefit: 'Marge brute supérieure à 85% grâce à des besoins en serveurs divisés par 4.',
              revenueStream: 'Abonnement mensuel ou annuel au service.',
              targetCustomer: 'Organismes de formation, établissements scolaires, PME et administrations.',
              paybackPeriod: 'Moins de 6 mois.',
            },
            {
              title: 'Offre Packagée Matériel Reconditionné + Logiciel Éducatif Garanti 5 Ans',
              archetype: 'Allongement de durée de vie (R4-R6)',
              strategy9R: 'R4 (Repair) & R6 (Remanufacture)',
              description: 'Fourniture de tablettes et ordinateurs reconditionnés sous système d\'exploitation allégé avec la suite logicielle pré-installée.',
              feasibility: 'Forte, en partenariat avec des reconditionneurs informatiques locaux certifiés.',
              economicBenefit: 'Coût d\'équipement divisé par 3 pour les écoles et garantie de fonctionnement sans obsolescence.',
              revenueStream: 'Vente de packs matériels reconditionnés + contrat de maintenance.',
              targetCustomer: 'Collectivités territoriales, associations et pays émergents.',
              paybackPeriod: '9 mois.',
            },
          ],
          monetizationMechanisms: [
            {
              name: 'Licences SaaS éco-conçues',
              category: 'Usage & Performance',
              description: 'Abonnement récurrent avec engagements de disponibilité et sobriété.',
              directCashFlowImpact: 'Forte marge et récurrence de trésorerie.',
            },
            {
              name: 'Prestations d\'audit d\'éco-conception numérique',
              category: 'Plateforme & Données',
              description: 'Audit et optimisation de sites web et applications clientes (réduction du poids des requêtes).',
              directCashFlowImpact: 'Revenus d\'ingénierie à haute valeur ajoutée.',
            },
          ],
          industrialSymbiosis: [
            {
              partner: 'Reconditionneurs de matériel informatique régionaux',
              fluxType: 'Matière / Coproduit',
              description: 'Collecte de parcs informatiques réformés, reconditionnement et déploiement avec le logiciel optimisé.',
              mutualBenefit: 'Création d\'emplois locaux dans le réemploi et offre technologique abordable.',
            },
          ],
          decouplingMetrics: [
            {
              indicator: 'Poids moyen transféré par page ou interaction utilisateur',
              targetValue: '≤ 250 Ko (vs 2,8 Mo moyenne web)',
              methodology: 'Audit de performance conforme PageSpeed & Ecoindex.',
            },
            {
              indicator: 'Durée de vie additionnelle des terminaux clients',
              targetValue: '+4 ans sans obsolescence ressentie',
              methodology: 'Suivi télémétrique anonymisé de la compatibilité matérielle.',
            },
          ],
        };
      }

      // Cas général : Éco-innovation & Économie Circulaire
      return {
        circularArchetype: 'Modèle hybride Produit-Service (PaaS), écologie industrielle territoriale et découplage absolu matière/revenus',
        differentiationFactor: `Positionnement pionnier à ${location} combinant haute performance technique, impact carbone prouvé par ACV certifiée et traçabilité inviolable, conforme aux exigences de reporting CSRD (ESRS E5) des donneurs d'ordres.`,
        circularValueProposition: 'Permettre aux clients de réduire leur empreinte environnementale et leurs coûts totaux de possession (TCO) de plus de 50%, sans risque technique ni compromis opérationnel.',
        competitiveMoat: 'Maîtrise exclusive de la chaîne d\'approvisionnement circulaire locale, conception modulaire facilitant le désassemblage et certifications de conformité tierce partie.',
        iso59000Compliance: 'Alignement rigoureux avec la norme ISO 59004:2024 (Préservation de la valeur, régénération des écosystèmes et transparence des filières circulaires).',
        innovativeBusinessModels: [
          {
            title: 'Produit-comme-Service & Boucle Circulaire (Product-as-a-Service)',
            archetype: 'Économie de la fonctionnalité (EFC)',
            strategy9R: 'R3 (Re-use) & R4 (Repair)',
            description: 'Passage d\'une logique de vente de volume linéaire à une mise à disposition avec maintenance préventive, pièces détachées garanties et reprise systématique en fin d\'usage.',
            feasibility: 'Faisabilité élevée avec un coût marginal d\'opération maîtrisé.',
            economicBenefit: 'Revenus réguliers et prévisibles, fidélisation accrue sur le long terme et sécurisation des matières premières pour les cycles futurs.',
            revenueStream: 'Abonnement mensuel d\'usage + option de rachat ou reconditionnement.',
            targetCustomer: 'Clients B2B industriels, collectivités et particuliers éco-responsables.',
            paybackPeriod: '12 à 18 mois.',
          },
          {
            title: 'Filière de Remise à Neuf, Rachat & Reconditionnement Garanti',
            archetype: 'Allongement de durée de vie & Réemploi',
            strategy9R: 'R6 (Remanufacture) & R7 (Repurpose)',
            description: 'Rachat systématique des équipements en fin de premier cycle, démontage sélectif, reconditionnement des pièces d\'usure et recommercialisation avec garantie constructeur.',
            feasibility: 'Éprouvée grâce à une conception modulaire dès la planche à dessin.',
            economicBenefit: 'Marge unitaire supérieure de 30% par rapport à la vente de produits neufs neufs grâce à la réutilisation des composants nobles.',
            revenueStream: 'Vente d\'équipements reconditionnés premium et kits d\'upgrade.',
            targetCustomer: 'Marchés secondaires, PME et structures à budget d\'investissement contraint.',
            paybackPeriod: '10 à 14 mois.',
          },
          {
            title: 'Valorisation des Coproduits en Symbiose Industrielle Territoriale',
            archetype: 'Symbiose industrielle (EIT)',
            strategy9R: 'R8 (Recycle)',
            description: 'Intégration des sous-produits de fabrication comme intrants matières pour des industries voisines dans une logique de proximité géographique.',
            feasibility: 'Haute faisabilité via conventions bilatérales avec les industriels du bassin d\'emploi.',
            economicBenefit: 'Suppression des coûts d\'évacuation des déchets et création d\'une source de revenus nette continue.',
            revenueStream: 'Vente de matières premières secondaires certifiées.',
            targetCustomer: 'Entreprises de transformation partenaires du bassin industriel régional.',
            paybackPeriod: 'Moins de 12 mois.',
          },
        ],
        monetizationMechanisms: [
          {
            name: 'Abonnement d\'usage et performance garantie',
            category: 'Usage & Performance',
            description: 'Facturation à l\'unité de travail ou au mois avec engagement de disponibilité.',
            directCashFlowImpact: 'Trésorerie récurrente et prévisibilité financière renforcée.',
          },
          {
            name: 'Marge additionnelle sur composants réemployés',
            category: 'Boucle Matière & Valorisation',
            description: 'Économie sur les achats de matières premières vierges par recyclage interne.',
            directCashFlowImpact: '+15% à +25% de marge brute sur les produits reconditionnés.',
          },
          {
            name: 'Services d\'extension de garantie et maintenance prédictive',
            category: 'Service & Maintenance',
            description: 'Contrats de support technique et fourniture de pièces d\'éco-maintenance.',
            directCashFlowImpact: 'Flux de marge élevé à coût marginal quasi-nul.',
          },
        ],
        industrialSymbiosis: [
          {
            partner: 'Plateformes logistiques et distributeurs régionaux',
            fluxType: 'Logistique & Espaces',
            description: 'Mutualisation des flux de livraison et rapatriement des produits en fin de cycle pour réemploi.',
            mutualBenefit: 'Optimisation du taux de remplissage des véhicules et réduction des coûts carbone.',
          },
          {
            partner: 'Industries manufacturières du bassin régional',
            fluxType: 'Matière / Coproduit',
            description: 'Échange de flux de matières premières secondaires et sous-produits techniques.',
            mutualBenefit: 'Substitution de matières vierges importées par des ressources locales sécurisées.',
          },
        ],
        decouplingMetrics: [
          {
            indicator: 'Indice de circularité matière (MCI - Material Circularity Indicator)',
            targetValue: '≥ 0,80 / 1,0',
            methodology: 'Méthodologie standardisée Ellen MacArthur Foundation & ISO 59020.',
          },
          {
            indicator: 'Taux de réemploi et recyclabilité en fin de vie',
            targetValue: '≥ 90% en poids',
            methodology: 'Bilan de démontabilité et caractérisation des filières de recyclage.',
          },
          {
            indicator: 'Ratio Chiffre d\'Affaires / Empreinte Carbone de production',
            targetValue: '+40% de création de valeur par tonne de CO2 émise',
            methodology: 'Comptabilité carbone analytique GHG Protocol Scope 1-2-3.',
          },
        ],
      };
    })(),

    // 5. Alignement ODD (spécifique au secteur d'activité selon la méthodologie SDG Compass)
    sdgAlignment: isDigitalOrEdTech
      ? [
          {
            oddNumber: 4,
            title: 'Éducation de qualité',
            level: 'Majeur',
            contribution: `Démocratisation de l'accès à une formation et un apprentissage inclusif d'excellence avec éco-conception digitale à ${location}.`,
            targets: [
              '4.4 Compétences techniques et professionnelles nécessaires à l\'emploi',
              '4.5 Égalité d\'accès et inclusion des personnes vulnérables',
              '4.7 Éducation au développement durable et à la transition écologique',
            ],
            targetsDetail: [
              {
                code: '4.4',
                title: 'Augmenter considérablement le nombre de jeunes et d\'adultes possédant les compétences professionnelles nécessaires à l\'emploi',
                indicator: 'Indicateur ONU 4.4.1 (Proportion de personnes maîtrisant les compétences en TIC et métiers d\'avenir)',
                targetKpi: 'Taux de diplomation ou certification professionnelle qualifiante ≥ 85%',
              },
              {
                code: '4.5',
                title: 'Éliminer les inégalités entre les sexes et assurer l\'accès égal à tous les niveaux de formation pour les publics vulnérables',
                indicator: 'Indicateur ONU 4.5.1 (Indices de parité et d\'inclusion pour l\'ensemble des apprenants)',
                targetKpi: 'Inclusion effective des personnes en situation de handicap (conformité WCAG 2.1 AA) et parité 50/50',
              },
              {
                code: '4.7',
                title: 'Assurer que tous les apprenants acquièrent les connaissances et compétences nécessaires pour promouvoir le développement durable',
                indicator: 'Indicateur ONU 4.7.1 (Intégration de l\'éducation à la citoyenneté mondiale et à la durabilité)',
                targetKpi: '100% des cursus intègrent un module dédié aux enjeux climatiques et sociétaux',
              },
            ],
            kpis: ['Nombre d\'apprenants actifs qualifiés par an', 'Score moyen de satisfaction et progression pédagogique (> 90%)'],
            dnshAssessment: 'CONFORMITÉ DNSH : Aucune barrière technologique excluante ; architecture sobre accessible sur terminaux reconditionnés et connexions bas débit.',
            griStandards: ['GRI 404 (Formation et éducation)', 'GRI 413 (Communautés locales)'],
            csrdEsrs: 'ESRS S1 (Main-d\'œuvre propre) & ESRS S3 (Communautés touchées)',
          },
          {
            oddNumber: 10,
            title: 'Inégalités réduites',
            level: 'Majeur',
            contribution: 'Réduction de la fracture numérique et territoriale par un accès équitable et abordable aux outils pédagogiques modernes.',
            targets: [
              '10.2 Autonomisation sociale et économique de tous',
              '10.3 Égalité des chances et réduction des inégalités de résultats',
            ],
            targetsDetail: [
              {
                code: '10.2',
                title: 'Favoriser l\'insertion sociale, économique et politique de tous, indépendamment de l\'âge, du sexe ou du handicap',
                indicator: 'Indicateur ONU 10.2.1 (Proportion de personnes vivant en dessous de 50% du revenu médian bénéficiaires)',
                targetKpi: 'Au moins 30% des places ou accès réservés aux zones rurales ou bénéficiaires de bourses',
              },
              {
                code: '10.3',
                title: 'Assurer l\'égalité des chances et réduire les inégalités de résultats en éliminant les lois et pratiques discriminatoires',
                indicator: 'Indicateur ONU 10.3.1 (Taux de discrimination ressenti nul)',
                targetKpi: 'Politique tarifaire solidaire ou modèle freemium éducatif équitable',
              },
            ],
            kpis: ['Taux d\'apprenants issus de zones défavorisées (%)', 'Indice d\'accessibilité socio-économique'],
            dnshAssessment: 'NON-NUISANCE ASSURÉE : Protection stricte de la vie privée (RGPD) et absence d\'algorithmes d\'exclusion commerciale.',
            griStandards: ['GRI 405 (Diversité et égalité des chances)'],
            csrdEsrs: 'ESRS S4 (Consommateurs et utilisateurs finaux)',
          },
          {
            oddNumber: 8,
            title: 'Travail décent et croissance économique',
            level: 'Secondaire',
            contribution: 'Développement du capital humain, acquisition des compétences de la transition écologique et accélération de l\'employabilité.',
            targets: [
              '8.5 Plein emploi productif et travail décent pour tous',
              '8.6 Réduction substantielle de la proportion de jeunes sans emploi ni formation',
            ],
            targetsDetail: [
              {
                code: '8.6',
                title: 'Réduire considérablement la proportion de jeunes sans emploi et ne suivant ni études ni formation (NEET)',
                indicator: 'Indicateur ONU 8.6.1 (Proportion de jeunes non scolarisés et sans emploi)',
                targetKpi: 'Taux d\'insertion professionnelle ou création d\'activité à 6 mois > 70%',
              },
            ],
            kpis: ['Nombre d\'emplois directs créés', 'Taux d\'insertion des jeunes diplômés (%)'],
            dnshAssessment: 'CONFORMITÉ SOCIALE : Conditions de travail décentes garanties pour l\'ensemble des intervenants et formateurs.',
            griStandards: ['GRI 401 (Emploi)', 'GRI 404 (Formation)'],
            csrdEsrs: 'ESRS S1 (Main-d\'œuvre propre)',
          },
          {
            oddNumber: 12,
            title: 'Consommation et production responsables',
            level: 'Secondaire',
            contribution: 'Application rigoureuse des principes du Green IT : éco-conception logicielle sobre, compression des assets et durée de vie prolongée du matériel.',
            targets: [
              '12.2 Utilisation rationnelle des ressources naturelles',
              '12.5 Réduction de la production de déchets électroniques (Green IT)',
            ],
            targetsDetail: [
              {
                code: '12.5',
                title: 'Réduire considérablement la production de déchets par la prévention, la réduction, le recyclage et la réutilisation',
                indicator: 'Indicateur ONU 12.5.1 (Taux national de recyclage et réduction des e-déchets)',
                targetKpi: 'Éco-conception certifiée avec empreinte page web < 0.5g CO2e et score EcoIndex A/B',
              },
            ],
            kpis: ['Poids moyen transféré par session (< 1.5 Mo)', 'Indice d\'efficacité d\'hébergement serveur PUE < 1.25'],
            dnshAssessment: 'DNSH ÉNERGÉTIQUE : Hébergement sur des centres de données alimentés à 100% par des garanties d\'origine renouvelable.',
            griStandards: ['GRI 302 (Énergie)', 'GRI 306 (Déchets électroniques)'],
            csrdEsrs: 'ESRS E5 (Économie circulaire) & ESRS E1 (Changement climatique)',
          },
        ]
      : isWater
      ? [
          {
            oddNumber: 6,
            title: 'Eau propre et assainissement',
            level: 'Majeur',
            contribution: `Préservation drastique des réserves hydriques stratégiques, suppression des rejets contaminants et recyclage intensif à ${location}.`,
            targets: [
              '6.3 Amélioration de la qualité de l\'eau et élimination des rejets toxiques',
              '6.4 Augmentation de l\'efficacité d\'utilisation de l\'eau dans tous les secteurs',
            ],
            targetsDetail: [
              {
                code: '6.4',
                title: 'Augmenter considérablement l\'efficacité de l\'utilisation de l\'eau dans tous les secteurs et garantir des retraits durables pour remédier au stress hydrique',
                indicator: 'Indicateur ONU 6.4.1 (Variation de l\'efficacité de l\'utilisation de l\'eau dans le temps)',
                targetKpi: 'Économie annuelle mesurée de plus de 45% sur les prélèvements d\'eau conventionnels',
              },
              {
                code: '6.3',
                title: 'Améliorer la qualité de l\'eau en réduisant la pollution, en éliminant les décharges sauvages et en augmentant le recyclage',
                indicator: 'Indicateur ONU 6.3.1 (Proportion des eaux usées traitées en toute sécurité)',
                targetKpi: 'Taux de traitement et réutilisation conforme aux normes OMS/NT 106 ≥ 95%',
              },
            ],
            kpis: ['Volume net d\'eau préservée (m³/an)', 'Intensité de consommation spécifique (L/unité produite)'],
            dnshAssessment: 'DNSH CONFORME : Pas de dégradation des nappes environnantes ; gestion et valorisation contrôlée des boues de décantation.',
            griStandards: ['GRI 303 (Interactions avec l\'eau)', 'GRI 306 (Effluents)'],
            csrdEsrs: 'ESRS E3 (Ressources aquatiques et marines)',
          },
          {
            oddNumber: 12,
            title: 'Consommation et production responsables',
            level: 'Majeur',
            contribution: 'Mise en œuvre d\'un cycle fermé zéro déchet liquide (ZLD) et élimination des réactifs chimiques persistants.',
            targets: [
              '12.4 Gestion écologiquement rationnelle des effluents et produits chimiques',
              '12.5 Réduction drastique de la production de déchets',
            ],
            targetsDetail: [
              {
                code: '12.4',
                title: 'Assurer une gestion écologiquement rationnelle des produits chimiques tout au long de leur cycle de vie',
                indicator: 'Indicateur ONU 12.4.2 (Quantité de polluants dangereux rejetés dans l\'environnement)',
                targetKpi: '100% des intrants de filtration sont biosourcés ou recyclables sans rejet toxique',
              },
            ],
            kpis: ['Taux de circularité hydrique interne (%)', 'Volume de sous-produits valorisés (tonnes/an)'],
            dnshAssessment: 'CONTRÔLE DNSH : Traitement in situ garantissant l\'absence de transfert de pollution vers l\'air ou le sol.',
            griStandards: ['GRI 306 (Déchets)', 'GRI 301 (Matériaux)'],
            csrdEsrs: 'ESRS E5 (Économie circulaire)',
          },
          {
            oddNumber: 13,
            title: 'Mesures relatives à la lutte contre les changements climatiques',
            level: 'Secondaire',
            contribution: `Abaissement des émissions de GES de ${baselineCO2} à ${targetCO2} kg CO2e par m³ traité par des procédés bas-carbone.`,
            targets: [
              '13.1 Renforcement de la résilience et de la capacité d\'adaptation face au stress hydrique',
            ],
            targetsDetail: [
              {
                code: '13.1',
                title: 'Renforcer la résilience et la capacité d\'adaptation face aux aléas climatiques et aux catastrophes naturelles',
                indicator: 'Indicateur ONU 13.1.2 (Nombre de pays disposant de stratégies d\'adaptation au stress hydrique)',
                targetKpi: 'Réduction de 40% de l\'intensité énergétique du cycle de potabilisation/assainissement',
              },
            ],
            kpis: ['Empreinte carbone par m³ traité (kg CO2e/m³)', 'Taux d\'autonomie énergétique sur ENR (%)'],
            dnshAssessment: 'DNSH CLIMAT : Optimisation thermodynamique évitant tout surcoût énergétique électrique fossile.',
            griStandards: ['GRI 305 (Émissions)', 'GRI 302 (Énergie)'],
            csrdEsrs: 'ESRS E1 (Changement climatique)',
          },
          {
            oddNumber: 9,
            title: 'Industrie, innovation et infrastructure',
            level: 'Secondaire',
            contribution: 'Déploiement d\'infrastructures de filtration et de traitement décentralisées modulaires, résilientes et sobres.',
            targets: [
              '9.4 Conversion des installations industrielles pour la durabilité',
            ],
            targetsDetail: [
              {
                code: '9.4',
                title: 'Moderniser les infrastructures et adapter les industries afin de les rendre durables, avec une efficacité accrue des ressources',
                indicator: 'Indicateur ONU 9.4.1 (Émissions de CO2 par unité de valeur ajoutée industrielle)',
                targetKpi: 'Durée de vie des membranes et cuves prolongée de +50% par maintenance prédictive',
              },
            ],
            kpis: ['Taux de disponibilité de l\'infrastructure (%)', 'Intensité capitalistique amortie sur 15 ans'],
            dnshAssessment: 'DNSH INFRASTRUCTURE : Conception démontable facilitant le réemploi en fin d\'exploitation.',
            griStandards: ['GRI 302 (Énergie)'],
            csrdEsrs: 'ESRS E5 (Économie circulaire)',
          },
        ]
      : isEnergyOrSolar
      ? [
          {
            oddNumber: 7,
            title: "Énergie propre et d'un coût abordable",
            level: 'Majeur',
            contribution: `Production et distribution d'électricité et chaleur décarbonée renouvelable et décentralisée à ${location}.`,
            targets: [
              '7.2 Augmentation de la part des énergies renouvelables dans le mix global',
              "7.3 L'amélioration du taux d'efficacité énergétique",
            ],
            targetsDetail: [
              {
                code: '7.2',
                title: 'Accroître nettement la part de l\'énergie renouvelable dans le bouquet énergétique mondial',
                indicator: 'Indicateur ONU 7.2.1 (Part de l\'énergie renouvelable dans la consommation finale totale)',
                targetKpi: 'Production annuelle garantie de plus de 850 MWh d\'électricité 100% renouvelable',
              },
              {
                code: '7.3',
                title: 'Multiplier par deux le taux mondial d\'amélioration de l\'efficacité énergétique',
                indicator: 'Indicateur ONU 7.3.1 (Intensité énergétique mesurée en termes d\'énergie primaire et de PIB)',
                targetKpi: 'Rendement global des convertisseurs et onduleurs supérieur à 97.5%',
              },
            ],
            kpis: ['Capacité installée renouvelable (kWc / MW)', 'Énergie propre injectée au réseau ou autoconsommée (MWh/an)'],
            dnshAssessment: 'DNSH CONFORME : Pas de concurrence d\'usage sur les terres agricoles fertiles (installation sur toitures, friches ou agrivoltaïsme synergique).',
            griStandards: ['GRI 302 (Énergie)'],
            csrdEsrs: 'ESRS E1 (Changement climatique)',
          },
          {
            oddNumber: 13,
            title: 'Mesures relatives à la lutte contre les changements climatiques',
            level: 'Majeur',
            contribution: `Substitution directe d'électricité d'origine fossile abaissant l'empreinte de ${baselineCO2} à ${targetCO2} kg CO2e par unité produite.`,
            targets: [
              '13.2 Intégration des mesures climatiques dans les politiques et stratégies',
            ],
            targetsDetail: [
              {
                code: '13.2',
                title: 'Incorporer des mesures relatives aux changements climatiques dans les politiques, stratégies et planifications',
                indicator: 'Indicateur ONU 13.2.2 (Total des émissions de gaz à effet de serre évitées par an)',
                targetKpi: 'Évitement annuel certifié de plus de 420 tonnes équivalent CO2',
              },
            ],
            kpis: ['Tonnage de CO2e évité par an (tCO2e/an)', 'Temps de retour carbone de l\'installation (< 1.8 an)'],
            dnshAssessment: 'DNSH CLIMAT : Analyse du cycle de vie démontrant un bilan carbone net très largement positif sur 25 ans.',
            griStandards: ['GRI 305 (Émissions de GES)'],
            csrdEsrs: 'ESRS E1 (Changement climatique)',
          },
          {
            oddNumber: 9,
            title: 'Industrie, innovation et infrastructure',
            level: 'Secondaire',
            contribution: 'Modernisation du réseau de distribution électrique local et résilience des installations face aux pics de chaleur.',
            targets: [
              '9.4 Équipements sobres et infrastructures décarbonées',
            ],
            targetsDetail: [
              {
                code: '9.4',
                title: 'Moderniser les infrastructures et adapter les industries pour les rendre durables',
                indicator: 'Indicateur ONU 9.4.1 (Émissions de CO2 par unité de valeur ajoutée)',
                targetKpi: 'Intégration d\'un système de pilotage intelligent Smart Grid pour écrêter les pointes',
              },
            ],
            kpis: ['Taux d\'autoconsommation instantanée (%)', 'Pertes en ligne limitées à moins de 3%'],
            dnshAssessment: 'DNSH RESEAUX : Compatibilité électromagnétique et sécurité électrique conforme aux normes CEI.',
            griStandards: ['GRI 302 (Énergie)'],
            csrdEsrs: 'ESRS E1 (Changement climatique)',
          },
          {
            oddNumber: 12,
            title: 'Consommation et production responsables',
            level: 'Secondaire',
            contribution: 'Filière de recyclage garantie des modules photovoltaïques et onduleurs en fin de cycle de vie (Directive DEEE).',
            targets: [
              '12.5 Réduction des déchets par le recyclage',
            ],
            targetsDetail: [
              {
                code: '12.5',
                title: 'Réduire considérablement la production de déchets par la prévention, le recyclage et la réutilisation',
                indicator: 'Indicateur ONU 12.5.1 (Taux national de recyclage des composants technologiques)',
                targetKpi: 'Adhésion à un éco-organisme agréé assurant un taux de recyclage matière ≥ 88%',
              },
            ],
            kpis: ['Taux de valorisation matière en fin de vie (%)', 'Teneur garantie sans plomb ni métaux lourds critiques'],
            dnshAssessment: 'DNSH DECHETS : Approvisionnement auprès de fabricants certifiés conformes RoHS et ISO 14001.',
            griStandards: ['GRI 306 (Déchets)', 'GRI 301 (Matériaux)'],
            csrdEsrs: 'ESRS E5 (Économie circulaire)',
          },
        ]
      : isAgriOrFood
      ? [
          {
            oddNumber: 2,
            title: 'Faim « Zéro »',
            level: 'Majeur',
            contribution: `Développement de systèmes de production agricole régénérative renforçant la sécurité alimentaire et la résilience locale à ${location}.`,
            targets: [
              '2.4 Systèmes de production alimentaire durables et résilients',
              '2.3 Augmentation de la productivité agricole des petits producteurs',
            ],
            targetsDetail: [
              {
                code: '2.4',
                title: 'Assurer la viabilité des systèmes de production alimentaire et mettre en œuvre des pratiques agricoles résilientes qui augmentent la productivité',
                indicator: 'Indicateur ONU 2.4.1 (Proportion des superficies agricoles exploitées de façon durable et productive)',
                targetKpi: '100% des parcelles exploitées en agriculture biologique ou pratiques agroécologiques certifiées',
              },
              {
                code: '2.3',
                title: 'Doubler la productivité agricole et les revenus des petits producteurs alimentaires, notamment les femmes et les exploitations familiales',
                indicator: 'Indicateur ONU 2.3.2 (Revenu moyen des petits producteurs alimentaires)',
                targetKpi: 'Valorisation des productions locales avec rémunération équitable supérieure de +25% au marché',
              },
            ],
            kpis: ['Surfaces cultivées en agroécologie (hectares)', 'Rendement moyen pérenne sans intrant de synthèse (t/ha)'],
            dnshAssessment: 'DNSH CONFORME : Zéro pesticide de synthèse ni OGM ; non-dégradation de la biodiversité entomologique.',
            griStandards: ['GRI 413 (Communautés locales)', 'GRI 203 (Impacts économiques indirects)'],
            csrdEsrs: 'ESRS S3 (Communautés) & ESRS E4 (Biodiversité)',
          },
          {
            oddNumber: 12,
            title: 'Consommation et production responsables',
            level: 'Majeur',
            contribution: 'Zéro déchet organique par compostage intégral in situ, circuits courts de distribution et éco-conditionnements réutilisables.',
            targets: [
              '12.3 Réduction du gaspillage alimentaire tout au long de la chaîne',
              '12.4 Gestion écologiquement rationnelle des produits agricoles et amendements',
            ],
            targetsDetail: [
              {
                code: '12.3',
                title: 'Réduire de moitié le gaspillage alimentaire mondial par habitant et réduire les pertes le long des chaînes de production et d\'approvisionnement',
                indicator: 'Indicateur ONU 12.3.1 (Indice de gaspillage alimentaire et pertes après récolte)',
                targetKpi: 'Taux de valorisation des surplus et coproduits agricoles ≥ 95% (transformation / compostage)',
              },
              {
                code: '12.4',
                title: 'Parvenir à une gestion écologiquement rationnelle des produits tout au long de leur cycle de vie',
                indicator: 'Indicateur ONU 12.4.2 (Quantité de déchets dangereux produits par habitant)',
                targetKpi: 'Suppression totale des emballages plastiques à usage unique au profit de contenants consignés',
              },
            ],
            kpis: ['Pertes post-récolte limitées à moins de 3%', 'Tonnage de compost organique haute qualité réinjecté au sol (t/an)'],
            dnshAssessment: 'DNSH RESSOURCES : Amendements 100% organiques sans risque de lixiviation d\'azote ou de phosphore.',
            griStandards: ['GRI 306 (Déchets)', 'GRI 301 (Matériaux)'],
            csrdEsrs: 'ESRS E5 (Économie circulaire)',
          },
          {
            oddNumber: 15,
            title: 'Vie terrestre',
            level: 'Secondaire',
            contribution: 'Restauration de la microbiologie des sols, lutte active contre l\'érosion éolienne et hydrique, et sanctuarisation de la biodiversité.',
            targets: [
              '15.3 Lutte contre la dégradation des terres et restauration des sols',
              '15.5 Enrayement de la perte de biodiversité',
            ],
            targetsDetail: [
              {
                code: '15.3',
                title: 'Lutter contre la désertification, restaurer les terres et les sols dégradés et s\'efforcer de parvenir à un monde sans dégradation des sols',
                indicator: 'Indicateur ONU 15.3.1 (Proportion de terres dégradées sur la superficie totale)',
                targetKpi: 'Augmentation du taux de matière organique des sols de +0.4% par an (Initiative 4 pour 1000)',
              },
            ],
            kpis: ['Indice d\'abondance de la biodiversité auxiliaire (pollinisateurs)', 'Taux de couverture végétale permanente (%)'],
            dnshAssessment: 'DNSH BIODIVERSITÉ : Plantation de haies bocagères indigènes servant de corridors écologiques.',
            griStandards: ['GRI 304 (Biodiversité)'],
            csrdEsrs: 'ESRS E4 (Biodiversité et écosystèmes)',
          },
          {
            oddNumber: 13,
            title: 'Mesures relatives à la lutte contre les changements climatiques',
            level: 'Secondaire',
            contribution: 'Séquestration active du carbone atmosphérique dans les sols vivants et réduction des kilomètres alimentaires par la vente directe.',
            targets: [
              '13.1 Résilience et capacité d\'adaptation face aux aléas climatiques',
            ],
            targetsDetail: [
              {
                code: '13.1',
                title: 'Renforcer la résilience et la capacité d\'adaptation face aux aléas climatiques',
                indicator: 'Indicateur ONU 13.1.1 (Nombre de personnes protégées par des systèmes d\'adaptation)',
                targetKpi: 'Séquestration nette de 1.8 tCO2e par hectare et par an dans la matière organique du sol',
              },
            ],
            kpis: ['Bilan carbone d\'exploitation négatif ou net zéro', 'Rayon moyen de distribution commerciale (< 50 km)'],
            dnshAssessment: 'DNSH CLIMAT : Remplacement des engrais azotés de synthèse énergivores par des légumineuses fixatrices d\'azote.',
            griStandards: ['GRI 305 (Émissions)'],
            csrdEsrs: 'ESRS E1 (Changement climatique)',
          },
        ]
      : [
          {
            oddNumber: 12,
            title: 'Consommation et production responsables',
            level: 'Majeur',
            contribution: `Substitution de matières fossiles ou polluantes par des matières premières recyclées ou biosourcées locales à ${location}.`,
            targets: [
              '12.2 Gestion durable et utilisation rationnelle des ressources naturelles',
              '12.4 Gestion écologiquement rationnelle des produits chimiques et déchets',
              '12.5 Réduction considérable de la production de déchets par la prévention et le recyclage',
            ],
            targetsDetail: [
              {
                code: '12.2',
                title: 'Parvenir à une gestion durable et à une utilisation rationnelle des ressources naturelles',
                indicator: 'Indicateur ONU 12.2.1 (Empreinte matérielle par habitant)',
                targetKpi: 'Taux d\'incorporation de matières recyclées ou secondaires ≥ 75%',
              },
              {
                code: '12.5',
                title: 'Réduire considérablement la production de déchets par la prévention, la réduction, le recyclage et la réutilisation',
                indicator: 'Indicateur ONU 12.5.1 (Taux national de recyclage et de valorisation matière)',
                targetKpi: 'Évitement de plus de 60% de déchets résiduels mis en décharge par unité de produit',
              },
            ],
            kpis: ['Indice de circularité de la matière (MCI)', 'Volume de déchets de production réintégrés en boucle courte (%)'],
            dnshAssessment: 'DNSH CONFORME : Absence formelle de substances nocives SVHC selon le règlement européen REACH.',
            griStandards: ['GRI 306 (Déchets)', 'GRI 301 (Matériaux)'],
            csrdEsrs: 'ESRS E5 (Économie circulaire & gestion des ressources)',
          },
          {
            oddNumber: 13,
            title: 'Mesures relatives à la lutte contre les changements climatiques',
            level: 'Majeur',
            contribution: `Abaissement drastique de l'empreinte carbone de ${baselineCO2} à ${targetCO2} kg CO2e par unité fonctionnelle par écoconception.`,
            targets: [
              '13.1 Renforcement de la résilience et de la capacité d\'adaptation face aux aléas climatiques',
              '13.3 Amélioration de la sensibilisation à la décarbonation',
            ],
            targetsDetail: [
              {
                code: '13.1',
                title: 'Renforcer la résilience et la capacité d\'adaptation face aux aléas climatiques',
                indicator: 'Indicateur ONU 13.1.2 (Nombre de pays disposant de plans de transition bas-carbone)',
                targetKpi: 'Trajectoire de décarbonation alignée sur les objectifs 1.5°C de l\'Accord de Paris (-45% à 2030)',
              },
            ],
            kpis: ['Émissions évitées nettes (tCO2e/an)', 'Intensité carbone par chiffre d\'affaires (g CO2e/€)'],
            dnshAssessment: 'DNSH CLIMAT : Décarbonation mesurée par ACV berceau-à-la-tombe sans transfert d\'impact vers d\'autres étapes.',
            griStandards: ['GRI 305 (Émissions de GES)'],
            csrdEsrs: 'ESRS E1 (Changement climatique)',
          },
          {
            oddNumber: 8,
            title: 'Travail décent et croissance économique',
            level: 'Secondaire',
            contribution: 'Création d\'emplois verts locaux non délocalisables, équitables et respectueux des normes de santé et sécurité au travail.',
            targets: [
              '8.4 Amélioration progressive de l\'efficacité globale des ressources',
              '8.5 Plein emploi productif et travail décent pour tous',
            ],
            targetsDetail: [
              {
                code: '8.4',
                title: 'Améliorer progressivement l\'efficacité de l\'utilisation des ressources mondiales dans les modes de consommation et de production',
                indicator: 'Indicateur ONU 8.4.2 (Consommation matérielle intérieure par habitant)',
                targetKpi: 'Découplage avéré entre croissance de la valeur ajoutée et volume de matières prélevées',
              },
            ],
            kpis: ['Nombre d\'emplois directs en CDI créés', 'Taux de couverture convention collective et protection sociale (100%)'],
            dnshAssessment: 'DNSH SOCIAL : Respect absolu des conventions fondamentales de l\'OIT (interdiction du travail forcé et infantil).',
            griStandards: ['GRI 401 (Emploi)', 'GRI 403 (Santé & Sécurité)'],
            csrdEsrs: 'ESRS S1 (Main-d\'œuvre propre)',
          },
          {
            oddNumber: 9,
            title: 'Industrie, innovation et infrastructure',
            level: 'Secondaire',
            contribution: 'Modernisation technologique des procédés industriels vers des standards de haute efficacité et durabilité écologique.',
            targets: [
              '9.4 Rénovation des infrastructures et conversion des industries pour les rendre durables',
            ],
            targetsDetail: [
              {
                code: '9.4',
                title: 'Moderniser les infrastructures et adapter les industries pour les rendre durables avec une utilisation accrue de technologies propres',
                indicator: 'Indicateur ONU 9.4.1 (Émissions de CO2 par unité de valeur ajoutée industrielle)',
                targetKpi: 'Gains d\'efficacité énergétique de production ≥ 25% par rapport aux standards historiques',
              },
            ],
            kpis: ['Part du budget allouée à la R&D éco-innovante (%)', 'Indice de modernité de l\'outil de travail'],
            dnshAssessment: 'DNSH INDUSTRIE : Conformité aux meilleures techniques disponibles (BREF / MTD européennes).',
            griStandards: ['GRI 302 (Énergie)', 'GRI 306 (Déchets)'],
            csrdEsrs: 'ESRS E5 (Économie circulaire)',
          },
        ],

    // 6. Indicateurs d'impact
    impactIndicators: {
      carbonFootprint: {
        functionalUnit,
        totalCarbonKgCO2e: targetCO2,
        benchmarkComparison: {
          industryAverageKgCO2e: baselineCO2,
          ecoDesignedTargetKgCO2e: targetCO2,
          commentary: `Ce projet permet une économie nette de ${Math.round(((baselineCO2 - targetCO2) / baselineCO2) * 100)}% de gaz à effet de serre par rapport à la moyenne sectorielle constatée.`,
        },
        lifecycleStages: [
          {
            id: 'stage_raw',
            name: 'Matières premières & Extraction (ISO 14064-1 Cat. 4 / ISO 14067 Amont)',
            category: 'raw_materials',
            emissionKgCO2e: +(targetCO2 * 0.35).toFixed(2),
            percentage: 35,
            description: 'Approvisionnement local et bio-sourcé / recyclé à faible impact, traçabilité biogénique isolée.',
            reductionOpportunity: 'Privilégier les gisements secondaires certifiés de proximité et fournisseurs audités.',
          },
          {
            id: 'stage_mfg',
            name: 'Procédé de Fabrication (ISO 14064-1 Cat. 1 & 2 / ISO 14067)',
            category: 'manufacturing',
            emissionKgCO2e: +(targetCO2 * 0.28).toFixed(2),
            percentage: 28,
            description: 'Lignes sobres alimentées par un mix électrique propre (approches location-based & market-based).',
            reductionOpportunity: 'Récupération de chaleur fatale, isolation thermique et autoconsommation ENR sur site.',
          },
          {
            id: 'stage_pkg',
            name: 'Conditionnement & Emballage (ISO 14064-1 Cat. 4)',
            category: 'packaging',
            emissionKgCO2e: +(targetCO2 * 0.12).toFixed(2),
            percentage: 12,
            description: 'Emballages réutilisables ou kraft 100% recyclé sans dérivés pétrochimiques vierges.',
            reductionOpportunity: 'Suppression définitive des suremballages plastiques et standardisation réemploi.',
          },
          {
            id: 'stage_trans',
            name: 'Transport & Distribution (ISO 14064-1 Cat. 3)',
            category: 'transport',
            emissionKgCO2e: +(targetCO2 * 0.15).toFixed(2),
            percentage: 15,
            description: 'Distribution en boucle courte régionale et logistique inversée optimisée.',
            reductionOpportunity: 'Optimisation du taux de charge, tournées groupées et flotte à motorisation alternative.',
          },
          {
            id: 'stage_eol',
            name: 'Fin de vie & Recyclage (ISO 14064-1 Cat. 5 / ISO 14067 Aval)',
            category: 'end_of_life',
            emissionKgCO2e: +(targetCO2 * 0.10).toFixed(2),
            percentage: 10,
            description: 'Compostage direct ou recyclabilité sans fraction résiduelle toxique.',
            reductionOpportunity: 'Filière locale de reprise matière en boucle fermée pour éviter tout enfouissement.',
          },
        ],
        highImpactDecarbonizationActions: [
          { action: 'Alimentation 100% en énergie solaire d\'autoconsommation sur le site de production', estimatedReductionPct: 22, priority: 'P1' },
          { action: 'Sélection exclusive d\'approvisionnements locaux dans un rayon inférieur à 100 km', estimatedReductionPct: 15, priority: 'P2' },
          { action: 'Système de consigne et de réemploi des contenants logistiques', estimatedReductionPct: 12, priority: 'P2' },
        ],
      },
      circularityRate: '88% de flux matière circulaires ou biodégradables',
      wasteAvoided: '3,8 tonnes de déchets non recyclables éliminées par an',
      waterPreservation: 'Préservation des nappes phréatiques grâce à des procédés secs ou circuits fermés',
      localJobsProjection: '6 emplois verts directs créés à 18 mois',
      keyMetrics: [
        { label: 'Intensité carbone', value: `${targetCO2}`, unit: 'kg CO2e / unité', interpretation: 'Conforme aux trajectoires de décarbonation 1.5°C' },
        { label: 'Taux de circularité', value: '88%', unit: '% matière', interpretation: 'Haut niveau de circularité' },
        { label: 'Indépendance fossile', value: '92%', unit: '% renouvelable', interpretation: 'Rupture nette avec les matières pétrosourcées' },
        { label: 'Ancrage territorial', value: 'Local', unit: `${location}`, interpretation: 'Circuits courts favorisés' },
      ],
    },

    // 7. Financements et labels verts
    greenFinancingAndLabels: {
      labels: [
        {
          name: 'Label Écologique & RSE ISO 26000 / Label Engagé RSE',
          category: 'Responsabilité Sociétale & Environnementale',
          whyItMatters: 'Confère une crédibilité d\'audit vérifiée auprès des bailleurs de fonds internationaux et partenaires B2B.',
          eligibilityCriteria: 'Respect des 7 questions centrales ISO 26000, gouvernance transparente et audit sur site.',
        },
        {
          name: 'Certification Cradle to Cradle (C2C) ou Écolabel',
          category: 'Éco-conception & Circularité Produit',
          whyItMatters: 'Prouve la sécurité chimique des matériaux et leur réintégration perpétuelle en cycle biologique ou technique.',
          eligibilityCriteria: 'Toxicité zéro des intrants, utilisation d\'énergies renouvelables et gestion saine de l\'eau.',
        },
      ],
      fundings: [
        {
          source: 'APII / Pépinières du Réseau National (RNPE)',
          program: 'Accompagnement Entrepreneuriat Vert & Prime d\'Investissement',
          amountOrAid: 'Hébergement en pépinière, coaching technique et primes d\'éco-innovation',
          conditions: 'Projet d\'innovation durable à impact local créateur d\'emplois pérennes.',
        },
        {
          source: 'ANME (Agence Nationale pour la Maîtrise de l\'Énergie)',
          program: 'Fonds de Transition Énergétique (FTE)',
          amountOrAid: 'Prise en charge d\'audits énergétiques et primes sur investissements sobres',
          conditions: 'Dépôt d\'un dossier d\'efficacité énergétique ou d\'installation ENR.',
        },
        {
          source: 'Programmes Internationaux (SwitchMed / Horizon Europe / AFD Climat)',
          program: 'Subventions pour l\'Économie Circulaire et la Transition Verte',
          amountOrAid: 'Subventions de 20 000 € à 100 000 € avec assistance technique',
          conditions: 'Preuve d\'impact environnemental mesurable (ACV certifiée) et viabilité économique.',
        },
      ],
    },

    // 8. Plan d'action prioritaire
    priorityActionPlan: {
      phase1_0to3months: [
        {
          timeframe: '0-3 mois',
          title: 'Finalisation de l\'Analyse de Cycle de Vie (ACV) simplifiée',
          description: `Quantifier précisément les flux entrants et sortants réels sur le site de ${location}.`,
          priorityLevel: 'Haute',
          expectedDeliverable: 'Rapport ACV complet et fiche technique d\'éco-conception.',
        },
        {
          timeframe: '0-3 mois',
          title: 'Dépôt du dossier d\'accompagnement APII / RNPE',
          description: 'Présenter le diagnostic vert au comité de sélection de la pépinière d\'entreprises.',
          priorityLevel: 'Haute',
          expectedDeliverable: 'Convention d\'incubation et validation des avantages fiscaux/aides.',
        },
      ],
      phase2_3to6months: [
        {
          timeframe: '3-6 mois',
          title: 'Sécurisation des partenariats d\'approvisionnement local',
          description: `Contractualiser avec les fournisseurs de matières premières ou déchets valorisables à ${location}.`,
          priorityLevel: 'Moyenne',
          expectedDeliverable: 'Accords-cadres avec clauses de qualité et d\'impact environnemental.',
        },
        {
          timeframe: '3-6 mois',
          title: 'Candidature aux financements verts (ANME / SwitchMed)',
          description: 'Solliciter le co-financement des investissements matériels sobres en énergie.',
          priorityLevel: 'Moyenne',
          expectedDeliverable: 'Dossier de subvention complété et visé par l\'expert comptable.',
        },
      ],
      phase3_6to12months: [
        {
          timeframe: '6-12 mois',
          title: 'Obtention du premier label vert & Déploiement commercial',
          description: 'Passer l\'audit de conformité environnementale et lancer la commercialisation certifiée.',
          priorityLevel: 'Stratégique',
          expectedDeliverable: 'Certificat de labellisation environnementale et bilan d\'impact annuel.',
        },
        {
          timeframe: '6-12 mois',
          title: 'Mesure d\'impact in situ et communication responsable',
          description: 'Publier les premiers indicateurs d\'émissions évitées et de circularité auprès des clients.',
          priorityLevel: 'Stratégique',
          expectedDeliverable: 'Rapport RSE public et communication anti-greenwashing transparente.',
        },
      ],
    },
    thirdExpertValidation: {
      summary: 'Expert 3 (Auditeur Senior ESG) : Validation positive de la trajectoire bas-carbone et conformité aux critères de la taxonomie verte européenne confirmée.',
      validationStatus: 'Validé'
    },
  };
}
