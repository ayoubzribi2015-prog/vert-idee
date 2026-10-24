// server.ts
import express from "express";
import { createServer as createViteServer } from "vite";
import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { GoogleGenAI, Type } from "@google/genai";
import path from "path";
import fs from "fs";
import dotenv from "dotenv";
import mammoth from "mammoth";
import { PDFParse } from "pdf-parse";

// src/utils/fallbackExpertAudit.ts
function generateExpertAuditFallback(title, description, location = "Tunisie / International") {
  const text = `${description} ${location}`.toLowerCase();
  const isHighImpactIndustry = /pesticide|insecticide|produit chimique|chimie|phosphate|phosphogypse|cpg|groupe chimique|lavage.*phosphate|extraction.*phosphate|minier|minière|carrière|carriere|minerai|clinker|cimenterie|bitume|pétrole|petrole|raffinage|gaz fossile|hydrocarbure|acide phosphorique|engrais chimique/.test(text);
  const isConventionalPlastic = /injection plastique|unité d'injection|usine de plastique|plasturgie/.test(text) && !/recyclé|biodégradable|compostable|biosourcé/.test(text);
  const isAgriOrFood = /agri|aliment|alimentaire|ferme|bio|plante|sol|recolte|huile|dattes|olive|tomate|agrumes|culture/.test(text);
  const isPackagingOrPlastic = /emballage|pack|plastique|carton|bouteille|flacon|sachet|biodegradable|dechet|recycl/.test(text);
  const isEnergyOrSolar = /energie|solaire|photovolta|panneau|eolien|batterie|hydrogene|biomasse|chaleur|electricite/.test(text);
  const isWater = /eau|irrigation|dessalement|pluviale|goutte|purification|assainissement|bassin/.test(text);
  const isTextile = /textile|coton|vetement|mode|tissu|lin|laine|chutes|couture/.test(text);
  const isWasteOrCircularity = /dechet|tri|reemploi|compost|valorisation|upcycling|circulaire|decharge/.test(text);
  const isDigitalOrEdTech = /edtech|educat|formation|appren|ecole|cours|pedagogi|plateforme|application|logiciel|saas|digital|numerique|e-learning|elearning/.test(text);
  if (isHighImpactIndustry) {
    const isGafsa = /gafsa|metlaoui|redeyef|mdhilla|moulares|bassin minier/.test(text);
    const locName = isGafsa ? "Bassin Minier de Gafsa (Tunisie)" : location;
    const envScore2 = 16;
    const socialScore2 = 26;
    const circularityScore2 = 14;
    const carbonScore = 22;
    const globalScore2 = 18;
    return {
      title,
      sector: "Industrie Chimique & Traitement de Produits Phytosanitaires (Haut Risque \xC9cologique)",
      description,
      location: locName,
      targetAudience: "Secteur agricole, Industrie phytosanitaire & Commerce international",
      businessModel: "Mod\xE8le industriel \xE0 forte intensit\xE9 chimique et risque environnemental \xE9lev\xE9",
      lifeCycleDetails: "ACV critique : risques de toxicit\xE9 aigu\xEB lors de la production, gestion complexe des effluents chimiques et impact des r\xE9sidus dans les \xE9cosyst\xE8mes.",
      // 1. Synthèse du projet
      projectSynthesis: {
        scores: {
          environmental: envScore2,
          social: socialScore2,
          circularity: circularityScore2,
          carbonMaturity: carbonScore,
          globalScore: globalScore2
        },
        summary: `AVIS D\xC9FAVORABLE DU COLL\xC8GE DES EXPERTS (${globalScore2}/100 - Risque Majeur) : Ce projet \xE0 ${location} pr\xE9sente une empreinte critique et des risques sanitaires et \xE9cotoxiques majeurs li\xE9s aux rejets et aux manipulations de substances dangereuses.`,
        vision: `Conditionner imp\xE9rativement la poursuite de l'activit\xE9 \xE0 une mise aux normes drastique : syst\xE8me de confinement total des risques chimiques, traitement des effluents par oxydation pouss\xE9e, et plan de gestion environnementale rigoureux certifi\xE9 par des tiers ind\xE9pendants.`
      },
      // 2. Aspects & impacts environnementaux
      environmentalAspects: {
        strengths: [
          "Impact \xE9conomique initial sur la fili\xE8re agricole et maintien de la balance commerciale",
          "Pr\xE9sence d'infrastructures industrielles existantes \xE9vitant l'artificialisation de nouveaux sols",
          "Potentiel d'att\xE9nuation d'impact substantiel par l'adoption de proc\xE9d\xE9s de chimie verte"
        ],
        criticalRisks: [
          "IMPACTS SANITAIRES & \xC9COTOXICIT\xC9 : Risques \xE9lev\xE9s d'exposition accidentelle aux substances actives et impacts potentiels sur la sant\xE9 des op\xE9rateurs et riverains.",
          "IMPACTS SUR L'EAU & LES SOLS : Risque critique de pollution diffuse et de contamination des nappes phr\xE9atiques par des r\xE9sidus dans les effluents.",
          "IMPACTS SUR LA BIODIVERSIT\xC9 & POLLINISATEURS : Toxicit\xE9 aigu\xEB des substances chimiques de synth\xE8se pour les \xE9cosyst\xE8mes aquatiques et la faune auxiliaire.",
          "IMPACTS RESSOURCES FOSSILES : D\xE9pendance \xE9nerg\xE9tique et mati\xE8res premi\xE8res carbon\xE9es issues de la p\xE9trochimie lourde.",
          "RISQUE CRITIQUE D'IMPACT DE GREENWASHING : Incompatibilit\xE9 manifeste entre la fabrication de produits phytosanitaires conventionnels et les crit\xE8res de taxonomie verte."
        ],
        lifecycleAssessment: [
          {
            phase: "Approvisionnement",
            impactLevel: "eleve",
            details: "Impact amont fort : utilisation de pr\xE9curseurs chimiques issus de la p\xE9trochimie lourde et transport de mati\xE8res dangereuses.",
            ecoDesignLever: "Substitution par des pr\xE9curseurs bio-sourc\xE9s ou issus de la chimie du v\xE9g\xE9tal."
          },
          {
            phase: "Transformation Chimique",
            impactLevel: "eleve",
            details: "Impact direct fort : proc\xE9d\xE9s de synth\xE8se \xE9nergivores, \xE9missions atmosph\xE9riques et risques de fuites fugitives.",
            ecoDesignLever: "Optimisation des rendements, s\xE9curisation des r\xE9acteurs et automatisation des syst\xE8mes de contr\xF4le."
          },
          {
            phase: "Gestion des Effluents",
            impactLevel: "eleve",
            details: "Impact critique sur les milieux : rejets liquides contenant des r\xE9sidus actifs toxiques exigeant un traitement sp\xE9cialis\xE9.",
            ecoDesignLever: "Traitement par oxydation avanc\xE9e (AOP) et boucle ferm\xE9e de r\xE9cup\xE9ration des solvants (ZLD)."
          },
          {
            phase: "Logistique & Conditionnement",
            impactLevel: "moyen",
            details: "Impact transport moyen : stockage de substances dangereuses n\xE9cessitant des protocoles stricts de confinement.",
            ecoDesignLever: "Optimisation des tourn\xE9es et emballages certifi\xE9s haute \xE9tanch\xE9it\xE9."
          },
          {
            phase: "Fin de vie",
            impactLevel: "eleve",
            details: "Impact aval critique : risque de pollution des sols et cours d'eau li\xE9 aux bidons et r\xE9sidus non rinc\xE9s.",
            ecoDesignLever: "Fili\xE8re obligatoire de reprise et destruction thermique s\xE9curis\xE9e des contenants souill\xE9s."
          }
        ],
        circularEconomy: {
          strategies: [
            "R\xE9cup\xE9ration et distillation des solvants en circuit ferm\xE9",
            "Neutralisation et valorisation des sous-produits de r\xE9action",
            'Transition vers une production "chimie verte" moins polluante'
          ],
          wasteValorization: "N\xE9cessite des fili\xE8res certifi\xE9es d'incin\xE9ration et neutralisation des d\xE9chets chimiques dangereux.",
          durabilityRepair: "Non applicable : activit\xE9 de production chimique consommable."
        },
        regulationsAndNorms: [
          "R\xE9glementations nationales sur les produits phytosanitaires & R\xE9f\xE9rentiel ISO 14001 (Grille AES)",
          "Guide OSS / REPSAHEL sur l'\xC9co-responsabilit\xE9 et la pr\xE9servation de l'eau en milieu aride",
          "Protocoles de s\xE9curit\xE9 industrielle (SEVESO ou \xE9quivalent local)",
          "Normes sur les rejets d'eaux us\xE9es industrielles (NT 106.02) & Confinement ZLD"
        ]
      },
      // 3. Aspects & impacts sociaux et sociétaux
      socialAspects: {
        socialImpacts: [
          "Impact sanitaire direct : urgence li\xE9e \xE0 l'incidence accrue de pathologies respiratoires (silicose, asthme) et d'affections chroniques chez les riverains",
          "Impact sur les communaut\xE9s : conflits d'usage s\xE9v\xE8res pour l'acc\xE8s \xE0 l'eau potable entre les installations industrielles et les populations locales",
          "Impact soci\xE9tal territorial : tensions historiques li\xE9es aux retomb\xE9es \xE9conomiques in\xE9gales et au ch\xF4mage end\xE9mique des jeunes"
        ],
        localEconomy: `\xC9conomie locale hyper-d\xE9pendante d'une mono-industrie vieillissante, g\xE9n\xE9rant un impact de vuln\xE9rabilit\xE9 structurelle pour ${locName}.`,
        governanceAndEthics: "Impact n\xE9gatif sur la confiance : d\xE9ficit de concertation citoyenne et manque de transparence sur les donn\xE9es r\xE9elles de rejets et de sant\xE9 publique.",
        justTransition: "Impact cl\xE9 sur la transition juste : imp\xE9rieuse n\xE9cessit\xE9 de financer la reconversion vers des fili\xE8res \xE9conomiques alternatives (agro\xE9cologie, \xE9nergies renouvelables)."
      },
      // 4. Intégration de l'entrepreneuriat vert
      greenEntrepreneurshipIntegration: {
        innovativeBusinessModels: [
          {
            title: "Station de Dessalement Solaire et Recyclage d'Eau D\xE9di\xE9e",
            description: "Alimenter le lavage avec de l'eau saum\xE2tre dessal\xE9e \xE0 l'\xE9nergie solaire pour cesser tout pompage d'eau potable.",
            feasibility: "Faisabilit\xE9 technique \xE9prouv\xE9e mais exigeant un investissement en capital \xE9lev\xE9 (CAPEX).",
            economicBenefit: "P\xE9rennit\xE9 de la production face au tarissement in\xE9luctable des nappes et r\xE9duction du risque de fermeture."
          },
          {
            title: "Valorisation des Phosphogypses en Mat\xE9riaux de Construction",
            description: "Neutralisation et int\xE9gration sous contr\xF4le radiologique dans des liants hydrauliques routiers ou plaques stabilis\xE9es.",
            feasibility: "Faisabilit\xE9 r\xE9glementaire complexe n\xE9cessitant une certification d'innocuit\xE9 toxicologique stricte.",
            economicBenefit: "\xC9limination des co\xFBts de stockage g\xE9otechnique et cr\xE9ation d'une fili\xE8re de valorisation de coproduits."
          }
        ],
        differentiationFactor: "Actuellement aucun atout \xE9cologique distinctif. Le projet doit op\xE9rer une rupture technologique compl\xE8te pour esp\xE9rer une conformit\xE9 ESG.",
        circularValueProposition: "Cesser le pr\xE9l\xE8vement d'eau fra\xEEche potable et instaurer une boucle ferm\xE9e z\xE9ro rejet liquide (ZLD)."
      },
      // 5. Alignement ODD
      sdgAlignment: [
        {
          oddNumber: 6,
          title: "Eau propre et assainissement (Alerte Risque)",
          contribution: "IMPACT N\xC9GATIF CRITIQUE : Consommation d\xE9mesur\xE9e d'eau souterraine dans une r\xE9gion aride et risque de contamination des nappes.",
          targets: ["6.4 Augmentation de l'efficacit\xE9 d'utilisation de l'eau (Non respect\xE9)", "6.3 R\xE9duction de la pollution des eaux"]
        },
        {
          oddNumber: 3,
          title: "Bonne sant\xE9 et bien-\xEAtre (Alerte Risque)",
          contribution: "IMPACT N\xC9GATIF SANITAIRE : Les poussi\xE8res de phosphate et les effluents g\xE9n\xE8rent des risques respiratoires et \xE9cotoxicologiques d\xE9montr\xE9s.",
          targets: ["3.9 R\xE9duction des maladies dues aux pollutions de l'air, de l'eau et du sol"]
        },
        {
          oddNumber: 12,
          title: "Consommation et production responsables",
          contribution: "Activit\xE9 lin\xE9aire extractif n\xE9cessitant une mise aux normes drastique pour limiter les d\xE9chets miniers et les rejets non trait\xE9s.",
          targets: ["12.4 Gestion \xE9cologiquement rationnelle des produits chimiques et d\xE9chets tout au long du cycle"]
        },
        {
          oddNumber: 8,
          title: "Travail d\xE9cent et croissance \xE9conomique",
          contribution: "Maintien de l'emploi industriel sous r\xE9serve d'une am\xE9lioration radicale des conditions de s\xE9curit\xE9 et de sant\xE9 des mineurs.",
          targets: ["8.8 Protection des droits au travail et promotion d'un environnement de travail s\xFBr"]
        }
      ],
      // 6. Indicateurs d'impact
      impactIndicators: {
        carbonFootprint: {
          functionalUnit: "1 tonne de phosphate lav\xE9 et marchand",
          totalCarbonKgCO2e: 245,
          benchmarkComparison: {
            industryAverageKgCO2e: 180,
            ecoDesignedTargetKgCO2e: 95,
            commentary: "L'empreinte carbone actuelle est sup\xE9rieure de 36% aux standards internationaux modernes, principalement due \xE0 la v\xE9tust\xE9 des \xE9quipements et \xE0 l'\xE9nergie fossile."
          },
          lifecycleStages: [
            {
              id: "stage_extract",
              name: "Extraction & D\xE9capage m\xE9canique",
              category: "raw_materials",
              emissionKgCO2e: 110,
              percentage: 45,
              description: "Flotte d'engins lourds (d\xE9capeuses, bulldozers, dumpers) op\xE9rant au gazole.",
              reductionOpportunity: "\xC9lectrification sur cat\xE9naires ou biocarburants certifi\xE9s."
            },
            {
              id: "stage_wash",
              name: "Lavage, Criblage & Pompage d'eau",
              category: "manufacturing",
              emissionKgCO2e: 85,
              percentage: 35,
              description: "Pompage \xE9lectrique depuis des forages profonds et agitation m\xE9canique des pulpes.",
              reductionOpportunity: "Centrale solaire photovolta\xEFque d'autoconsommation sur site."
            },
            {
              id: "stage_sludge",
              name: "Gestion des boues et st\xE9riles",
              category: "end_of_life",
              emissionKgCO2e: 25,
              percentage: 10,
              description: "Pompage vers bassins de retenue et manipulation des terrils.",
              reductionOpportunity: "Filtres-presses haute pression pour r\xE9cup\xE9rer l'eau imm\xE9diatement."
            },
            {
              id: "stage_transport",
              name: "Transport ferroviaire / routier",
              category: "transport",
              emissionKgCO2e: 25,
              percentage: 10,
              description: "Acheminement vers les ports ou usines chimiques.",
              reductionOpportunity: "Modernisation de la traction ferroviaire et b\xE2chage herm\xE9tique."
            }
          ],
          highImpactDecarbonizationActions: [
            { action: "Installation de filtres-presses industriels pour recyclage d'eau \xE0 95% sans bassins \xE0 ciel ouvert", estimatedReductionPct: 25, priority: "P1" },
            { action: "Centrale solaire PV d\xE9di\xE9e de 20 MWc pour alimenter les laveries en \xE9lectricit\xE9 d\xE9carbon\xE9e", estimatedReductionPct: 30, priority: "P1" },
            { action: "B\xE2chage automatique des tr\xE9mies et wagons miniers pour stopper la dispersion particulaire", estimatedReductionPct: 10, priority: "P2" }
          ]
        },
        circularityRate: "8% (Activit\xE9 quasi-exclusivement lin\xE9aire)",
        wasteAvoided: "0 tonne \xE9vit\xE9e (G\xE9n\xE9ration massive de st\xE9riles de lavage et phosphogypse)",
        waterPreservation: "ALERTE ROUGE : Consommation de plus de 2,8 m\xB3 d'eau douce fossile par tonne de minerai lav\xE9 sans circuit ferm\xE9",
        localJobsProjection: "Emplois industriels traditionnels existants menac\xE9s \xE0 terme sans modernisation \xE9cologique",
        keyMetrics: [
          { label: "Intensit\xE9 en eau douce", value: "2 800", unit: "litres / tonne", interpretation: "Critique en zone de s\xE9cheresse structurelle" },
          { label: "\xC9missions particulaires PM10", value: "\xC9lev\xE9es", unit: "\xB5g/m\xB3", interpretation: "D\xE9passement r\xE9current des seuils OMS aux abords du site" },
          { label: "Taux de recyclage de l'eau", value: "< 25%", unit: "% eau r\xE9utilis\xE9e", interpretation: "Gaspillage hydrique intol\xE9rable face au stress hydrique" },
          { label: "Risque environnemental global", value: "Majeur", unit: "\xC9chelle 4/4", interpretation: "Conformit\xE9 environnementale d'urgence exig\xE9e" }
        ]
      },
      // 7. Financements et labels verts
      greenFinancingAndLabels: {
        labels: [
          {
            name: "NON \xC9LIGIBLE aux Labels Verts d'Impact (B-Corp, \xC9colabel, etc.)",
            category: "Exclusion Formelle",
            whyItMatters: "Les standards internationaux de durabilit\xE9 excluent strictement les industries extractives polluantes sans plan de transition z\xE9ro carbone.",
            eligibilityCriteria: "In\xE9ligible tant que les impacts sur l'eau et la sant\xE9 ne sont pas neutralis\xE9s."
          },
          {
            name: "Certification ISO 14001 (Management Environnemental d'Urgence)",
            category: "Conformit\xE9 Industrielle Obligatoire",
            whyItMatters: "Permet de cadrer un plan de r\xE9duction syst\xE9matique des pollutions et d'\xE9viter les sanctions r\xE9glementaires.",
            eligibilityCriteria: "Audit complet des rejets, plan d'action opposable et conformit\xE9 l\xE9gale stricte."
          }
        ],
        fundings: [
          {
            source: "Fonds de D\xE9pollution Industrielle (FODEP) / Minist\xE8re de l'Environnement",
            program: "Aide \xE0 la mise en conformit\xE9 des rejets et traitement des effluents liquides",
            amountOrAid: "Subvention jusqu'\xE0 20% et cr\xE9dits bonifi\xE9s pour unit\xE9s de d\xE9pollution",
            conditions: "Obligation de r\xE9sultat sur l'arr\xEAt des rejets liquides non trait\xE9s et la r\xE9duction de l'empreinte eau."
          },
          {
            source: "Banque Mondiale & BERD (Guichet Climat & Transition Juste)",
            program: "Programme de D\xE9carbonation et d'Efficacit\xE9 \xC9nerg\xE9tique dans les Mines",
            amountOrAid: "Pr\xEAts concessionnels d\xE9di\xE9s au solaire et aux stations de recyclage hydrique",
            conditions: "Conditionn\xE9 \xE0 un audit environnemental ind\xE9pendant et au respect des normes sociales de la SFI."
          }
        ]
      },
      // 8. Plan d'action prioritaire
      priorityActionPlan: {
        phase1_0to3months: [
          {
            timeframe: "0-3 mois",
            title: "Audit hydrog\xE9ologique ind\xE9pendant de la consommation d'eau des laveries",
            description: "Faire r\xE9aliser un bilan mati\xE8re et eau exhaustif par un cabinet tiers ind\xE9pendant certifi\xE9.",
            priorityLevel: "Haute",
            expectedDeliverable: "Cartographie des flux d'eau et plan de comptage volum\xE9trique pr\xE9cis sur chaque ligne de lavage."
          },
          {
            timeframe: "0-3 mois",
            title: "Mise en place d'un r\xE9seau de capteurs de poussi\xE8res PM10 et PM2.5",
            description: "Installer des stations de mesure de la qualit\xE9 de l'air en continu dans les zones de vie riveraines.",
            priorityLevel: "Haute",
            expectedDeliverable: "Plateforme publique de monitoring de la qualit\xE9 de l'air accessible aux citoyens et autorit\xE9s."
          }
        ],
        phase2_3to6months: [
          {
            timeframe: "3-6 mois",
            title: "Commande et installation de filtres-presses pour circuit ferm\xE9 d'eau",
            description: "Remplacer les bassins de d\xE9cantation \xE0 ciel ouvert par des filtres-presses modernes pour recycler imm\xE9diatement 95% de l'eau.",
            priorityLevel: "Haute",
            expectedDeliverable: "Mise en service de la premi\xE8re unit\xE9 de recyclage et r\xE9duction de 80% des pr\xE9l\xE8vements d'eau fossile."
          },
          {
            timeframe: "3-6 mois",
            title: "Plan de confinement et d'\xE9tanch\xE9ification des terrils de boues",
            description: "Pose de g\xE9omembranes et am\xE9nagement de digues de retenue conformes aux normes ICMM.",
            priorityLevel: "Moyenne",
            expectedDeliverable: "Dossier d'ing\xE9nierie g\xE9otechnique valid\xE9 par le CITET."
          }
        ],
        phase3_6to12months: [
          {
            timeframe: "6-12 mois",
            title: "D\xE9ploiement d'une centrale solaire photovolta\xEFque d\xE9di\xE9e pour la laverie",
            description: "Couvrir les besoins \xE9lectriques des pompes et concasseurs par 10 \xE0 20 MWc solaires sur les terrains d\xE9grad\xE9s de la mine.",
            priorityLevel: "Strat\xE9gique",
            expectedDeliverable: "Mise en service du parc solaire et division par deux des \xE9missions Scope 2 du site."
          },
          {
            timeframe: "6-12 mois",
            title: "Plan de transition juste et de r\xE9habilitation paysag\xE8re des sites \xE9puis\xE9s",
            description: "Engager les premiers chantiers de rev\xE9g\xE9talisation avec des esp\xE8ces steppiques indig\xE8nes et cr\xE9er des emplois \xE9cologiques locaux.",
            priorityLevel: "Strat\xE9gique",
            expectedDeliverable: "50 hectares r\xE9habilit\xE9s et accord tripartite syndicats-communaut\xE9s-entreprise."
          }
        ]
      },
      thirdExpertValidation: {
        summary: "Expert 3 (Auditeur Senior ESG) : Validation critique des hypoth\xE8ses carbone et conformit\xE9 aux crit\xE8res de la taxonomie verte requise en priorit\xE9.",
        validationStatus: "En cours de validation finale"
      }
    };
  }
  if (isConventionalPlastic) {
    const envScore2 = 38;
    const socialScore2 = 55;
    const circularityScore2 = 32;
    const carbonScore = 45;
    const globalScore2 = 42;
    return {
      title,
      sector: "Plasturgie Conventionnelle (Impact Environnemental Mod\xE9r\xE9 \xE0 \xC9lev\xE9)",
      description,
      location,
      targetAudience: "Industrie, Grande distribution, Consommation de masse",
      businessModel: "Production lin\xE9aire de pi\xE8ces plastiques par injection",
      lifeCycleDetails: "ACV conventionnelle : forte d\xE9pendance aux polym\xE8res fossiles vierges, consommation \xE9lectrique process importante, et fin de vie probl\xE9matique sans fili\xE8re de recyclage d\xE9di\xE9e.",
      projectSynthesis: {
        scores: { environmental: envScore2, social: socialScore2, circularity: circularityScore2, carbonMaturity: carbonScore, globalScore: globalScore2 },
        summary: `AVIS R\xC9SERV\xC9 : Ce projet d'unit\xE9 d'injection plastique \xE0 ${location} pr\xE9sente un risque de pollution plastique persisante. Sans int\xE9gration de mati\xE8res recycl\xE9es ou biosourc\xE9es, le score reste plafonn\xE9 \xE0 ${globalScore2}/100.`,
        vision: "Engager une transition vers 100% de mati\xE8res recycl\xE9es et l'autoconsommation solaire pour d\xE9carboner le process."
      },
      environmentalAspects: {
        strengths: ["Ma\xEEtrise technique du proc\xE9d\xE9 d'injection", "R\xE9ponse \xE0 un besoin industriel local"],
        criticalRisks: ["D\xE9pendance aux \xE9nergies fossiles", "Pollution par les microplastiques", "Faible taux de circularit\xE9"],
        lifecycleAssessment: [
          { phase: "Approvisionnement", impactLevel: "eleve", details: "Polym\xE8res vierges fossiles.", ecoDesignLever: "Incorporer du plastique recycl\xE9 post-consommation." },
          { phase: "Production", impactLevel: "moyen", details: "Consommation \xE9lectrique des presses.", ecoDesignLever: "Passer au tout \xE9lectrique et solaire." },
          { phase: "Fin de vie", impactLevel: "eleve", details: "D\xE9charge ou incin\xE9ration.", ecoDesignLever: "Concevoir pour le recyclage (monomat\xE9riau)." }
        ],
        circularEconomy: {
          strategies: ["R\xE9incorporation des carottes de coul\xE9e", "Optimisation des moules"],
          wasteValorization: "Valorisation interne des rebuts de production.",
          durabilityRepair: "Pi\xE8ces souvent \xE0 usage unique ou dur\xE9e de vie limit\xE9e."
        },
        regulationsAndNorms: ["Loi AGEC", "Normes ISO 9001", "Directives REACH"]
      },
      socialAspects: {
        socialImpacts: ["Cr\xE9ation d'emplois industriels", "Risques chimiques pour les op\xE9rateurs"],
        localEconomy: "Contribution au tissu industriel local.",
        governanceAndEthics: "N\xE9cessite une transparence sur la provenance des r\xE9sines.",
        justTransition: "Besoin de formation sur les nouveaux mat\xE9riaux durables."
      },
      greenEntrepreneurshipIntegration: {
        innovativeBusinessModels: [{ title: "Injection de plastique recycl\xE9 \xE0 100%", description: "Passer \xE0 une mati\xE8re premi\xE8re issue du tri local.", feasibility: "Haute", economicBenefit: "R\xE9duction des co\xFBts mati\xE8re et image de marque." }],
        differentiationFactor: "Actuellement aucun atout \xE9cologique distinctif.",
        circularValueProposition: "Doit pivoter vers la circularit\xE9 pour \xEAtre qualifi\xE9 d'\xE9co-entreprise."
      },
      sdgAlignment: [
        { oddNumber: 12, title: "Consommation et production responsables", contribution: "Doit r\xE9duire son impact plastique.", targets: ["12.5 R\xE9duction des d\xE9chets"] }
      ],
      impactIndicators: {
        carbonFootprint: {
          functionalUnit: "1 kg de plastique inject\xE9",
          totalCarbonKgCO2e: 4.8,
          benchmarkComparison: { industryAverageKgCO2e: 3.5, ecoDesignedTargetKgCO2e: 1.2, commentary: "L'utilisation de mati\xE8re vierge p\xE9nalise fortement le bilan carbone." },
          lifecycleStages: [
            { id: "mat", name: "Mati\xE8re", category: "raw_materials", emissionKgCO2e: 3.2, percentage: 67, description: "R\xE9sine fossile.", reductionOpportunity: "Plastique recycl\xE9." },
            { id: "proc", name: "Process", category: "manufacturing", emissionKgCO2e: 1.6, percentage: 33, description: "\xC9nergie presses.", reductionOpportunity: "Solaire." }
          ],
          highImpactDecarbonizationActions: [{ action: "Switch vers 50% de mati\xE8re recycl\xE9e", estimatedReductionPct: 30, priority: "P1" }]
        },
        circularityRate: "15%",
        wasteAvoided: "Rebuts internes seulement",
        waterPreservation: "Faible impact direct sur l'eau",
        localJobsProjection: "8 emplois directs",
        keyMetrics: [{ label: "Taux de mati\xE8re vierge", value: "100", unit: "%", interpretation: "Critique" }]
      },
      greenFinancingAndLabels: { labels: [], fundings: [] },
      priorityActionPlan: {
        phase1_0to3months: [{ timeframe: "0-3 mois", title: "Test de r\xE9sines recycl\xE9es", description: "Essais sur moules existants.", priorityLevel: "Haute", expectedDeliverable: "Rapport technique" }],
        phase2_3to6months: [],
        phase3_6to12months: []
      }
    };
  }
  let sector = "\xC9co-innovation & \xC9conomie Circulaire";
  let functionalUnit = "1 unit\xE9 fonctionnelle / lot standardis\xE9";
  let baselineCO2 = 12.5;
  let targetCO2 = 3.8;
  let envScore = 84;
  let socScore = 82;
  let circScore = 85;
  let carbScore = 82;
  if (isDigitalOrEdTech) {
    sector = "Num\xE9rique Responsable & \xC9co-conception Digitale";
    functionalUnit = "1 compte utilisateur actif annuel sur infrastructure sobre";
    baselineCO2 = 15;
    targetCO2 = 3.5;
    envScore = 70;
    socScore = 86;
    circScore = 65;
    carbScore = 75;
  } else if (isAgriOrFood) {
    sector = "Agro\xE9cologie & Alimentation Durable";
    functionalUnit = "1 kg de produit certifi\xE9 distribu\xE9 en circuit court";
    baselineCO2 = 4.2;
    targetCO2 = 1.1;
    envScore = 86;
    socScore = 82;
    circScore = 88;
    carbScore = 84;
  } else if (isPackagingOrPlastic) {
    sector = "Emballages & Biomat\xE9riaux Circulaires";
    functionalUnit = "1 000 unit\xE9s d'emballage bio-sourc\xE9 et compostable";
    baselineCO2 = 48;
    targetCO2 = 14.5;
    envScore = 85;
    socScore = 80;
    circScore = 90;
    carbScore = 82;
  } else if (isEnergyOrSolar) {
    sector = "\xC9nergies Renouvelables & Efficacit\xE9 \xC9nerg\xE9tique";
    functionalUnit = "1 kWh d'\xE9nergie d\xE9carbon\xE9e produite / inject\xE9e";
    baselineCO2 = 0.42;
    targetCO2 = 0.05;
    envScore = 90;
    socScore = 84;
    circScore = 82;
    carbScore = 92;
  } else if (isWater) {
    sector = "Gestion R\xE9siliente de l'Eau & Assainissement \xC9cologique";
    functionalUnit = "1 m\xB3 d'eau \xE9conomis\xE9e ou trait\xE9e par proc\xE9d\xE9 bas carbone";
    baselineCO2 = 1.8;
    targetCO2 = 0.35;
    envScore = 88;
    socScore = 85;
    circScore = 86;
    carbScore = 85;
  } else if (isTextile) {
    sector = "Textile Circulaire & Mode Responsable";
    functionalUnit = "1 pi\xE8ce textile \xE9co-con\xE7ue en fibres recycl\xE9es";
    baselineCO2 = 22;
    targetCO2 = 5.4;
    envScore = 82;
    socScore = 84;
    circScore = 88;
    carbScore = 80;
  } else if (isWasteOrCircularity) {
    sector = "Gestion des D\xE9chets & Valorisation Circulaire";
    functionalUnit = "1 tonne de mati\xE8re collect\xE9e et r\xE9incorpor\xE9e en boucle ferm\xE9e";
    baselineCO2 = 310;
    targetCO2 = 65;
    envScore = 88;
    socScore = 82;
    circScore = 92;
    carbScore = 86;
  }
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
    targetAudience: "B2B (Industriels, Coop\xE9ratives, Distributeurs) & B2C \xC9co-responsables",
    businessModel: "\xC9conomie de la fonctionnalit\xE9, vente directe et boucle circulaire",
    lifeCycleDetails: "ACV optimis\xE9e de l'approvisionnement local des intrants renouvelables jusqu'\xE0 la fin de vie vertueuse.",
    // 1. Synthèse du projet
    projectSynthesis: {
      scores: {
        environmental: environmentalScore,
        social: socialScore,
        circularity: circularityScore,
        carbonMaturity: carbonMaturityScore,
        globalScore
      },
      summary: `AVIS FAVORABLE DU COLL\xC8GE DES EXPERTS (${globalScore}/100) : Le projet "${title}" \xE0 ${location} d\xE9montre une pertinence \xE9cologique \xE9lev\xE9e et une d\xE9marche cr\xE9dible d'\xE9conomie circulaire et d'ACV v\xE9rifiable.`,
      vision: `Devenir la r\xE9f\xE9rence r\xE9gionale en mati\xE8re d'\xE9co-conception dans le secteur "${sector}" \xE0 ${location} avec une tra\xE7abilit\xE9 carbone exemplaire d'ici 3 ans.`
    },
    // 2. Aspects & impacts environnementaux
    environmentalAspects: {
      strengths: [
        `Impacts carbone positifs : r\xE9duction prouv\xE9e de l'empreinte carbone initiale comparativement aux r\xE9f\xE9rences conventionnelles de ${sector}`,
        `Impacts sur les ressources : int\xE9gration d'intrants renouvelables ou recycl\xE9s disponibles localement \xE0 ${location}`,
        `Impacts sur les rejets : \xE9coconception orient\xE9e z\xE9ro d\xE9chet et r\xE9duction drastique des effluents polluants`,
        `Impacts sur l'eau : pr\xE9servation mesur\xE9e des ressources hydriques et optimisation \xE9nerg\xE9tique des flux`
      ],
      criticalRisks: [
        `Impact de variabilit\xE9 saisonni\xE8re sur la r\xE9gularit\xE9 des approvisionnements locaux \xE0 ${location}`,
        `Impact d'usage : besoins de sensibilisation des partenaires de la cha\xEEne de valeur sur l'\xE9co-utilisation`,
        `Impact r\xE9glementaire : exigence de conformit\xE9 continue face aux \xE9volutions des normes d'\xE9coconception (ESPR, CSRD)`
      ],
      lifecycleAssessment: [
        {
          phase: "Extraction & Approvisionnement",
          impactLevel: "faible",
          details: `Impact amont r\xE9duit : s\xE9lection rigoureuse d'intrants \xE9co-certifi\xE9s ou recycl\xE9s, favorisant les circuits courts autour de ${location}.`,
          ecoDesignLever: "Charte d'achat responsable et tra\xE7abilit\xE9 carbone aupr\xE8s des fournisseurs partenaires."
        },
        {
          phase: "Transformation & Production",
          impactLevel: "faible",
          details: "Impact de fabrication ma\xEEtris\xE9 : proc\xE9d\xE9s sobres en \xE9nergie, valorisation des rejets thermiques et r\xE9cup\xE9ration d'eau.",
          ecoDesignLever: "Alimentation par \xE9nergies renouvelables et plan d'efficacit\xE9 \xE9nerg\xE9tique rigoureux."
        },
        {
          phase: "Conditionnement & Logistique",
          impactLevel: "faible",
          details: "Impact transport optimis\xE9 : emballages all\xE9g\xE9s 100% recyclables ou r\xE9utilisables, optimisation du taux de charge des v\xE9hicules.",
          ecoDesignLever: "Mutualisation logistique r\xE9gionale et adoption de flottes bas-carbone."
        },
        {
          phase: "Utilisation & Service",
          impactLevel: "faible",
          details: "Impact d'usage positif : con\xE7u pour une durabilit\xE9 accrue, modularit\xE9 et faible consommation op\xE9rationnelle.",
          ecoDesignLever: "Guide d'entretien et maintenance pr\xE9ventive pour prolonger la dur\xE9e de vie utile."
        },
        {
          phase: "Fin de vie",
          impactLevel: "faible",
          details: "Impact aval vertueux : recyclabilit\xE9 sup\xE9rieure \xE0 90% ou biod\xE9gradabilit\xE9 compl\xE8te sans r\xE9sidus toxiques.",
          ecoDesignLever: "Programme de reprise des produits usag\xE9s pour r\xE9introduction en cycle de production."
        }
      ],
      circularEconomy: {
        strategies: [
          "\xC9co-conception d\xE8s la phase amont pour faciliter le d\xE9montage et le recyclage",
          "Symbiose industrielle avec les entreprises et p\xE9pini\xE8res de la zone d'implantation",
          "Transformation des r\xE9sidus de production en sous-produits \xE0 valeur ajout\xE9e"
        ],
        wasteValorization: `100% des coproduits valoris\xE9s localement comme intrants secondaires pour les fili\xE8res partenaires de ${location}.`,
        durabilityRepair: "Garantie d'interchangeabilit\xE9 des composants et disponibilit\xE9 de pi\xE8ces de rechange pendant au moins 5 ans."
      },
      regulationsAndNorms: [
        "Norme ISO 14001 (Management environnemental & Matrice AES FxGxS/M)",
        "Guide d'\xC9co-responsabilit\xE9 OSS / REPSAHEL (Observatoire du Sahara et du Sahel)",
        "Analyse du Cycle de Vie certifi\xE9e ISO 14040 / 14044",
        "Cadre r\xE9glementaire de l'ANME, CITET & Directives de durabilit\xE9 CSRD / ESPR"
      ]
    },
    // 3. Aspects & impacts sociaux et sociétaux
    socialAspects: {
      socialImpacts: [
        `Impact direct sur l'emploi : cr\xE9ation d'emplois verts directs et p\xE9rennes dans le bassin d'emploi de ${location}`,
        "Impact sur la sant\xE9 et s\xE9curit\xE9 : am\xE9lioration de l'ergonomie et des conditions de travail d\xE9centes (z\xE9ro composant toxique)",
        "Impact sur les comp\xE9tences : formation continue des salari\xE9s aux m\xE9tiers \xE9mergents de la transition \xE9cologique"
      ],
      localEconomy: `Impact \xE9conomique territorial : renforcement de la r\xE9silience du tissu \xE9conomique r\xE9gional \xE0 ${location} gr\xE2ce \xE0 des partenariats industriels locaux.`,
      governanceAndEthics: "Impact de gouvernance \xE9thique : gouvernance participative, transparence des fili\xE8res et d\xE9marche RSE conforme \xE0 la norme ISO 26000.",
      justTransition: "Impact sur la transition juste : accompagnement inclusif des acteurs traditionnels vers les pratiques vertes et \xE9quit\xE9 salariale."
    },
    // 4. Intégration de l'entrepreneuriat vert
    greenEntrepreneurshipIntegration: {
      innovativeBusinessModels: [
        {
          title: "Produit-comme-Service & Boucle Circulaire",
          description: "Passage d'une logique de vente de volume \xE0 une offre de service durable avec reprise syst\xE9matique en fin de vie.",
          feasibility: "Faisabilit\xE9 \xE9lev\xE9e avec un co\xFBt marginal ma\xEEtris\xE9.",
          economicBenefit: "Revenus r\xE9guliers et pr\xE9visibles, fid\xE9lisation accrue et s\xE9curisation des mati\xE8res premi\xE8res."
        },
        {
          title: "Valorisation des Cr\xE9dits Carbone & \xC9vitement d'\xC9missions",
          description: "Certification de l'\xE9vitement d'\xE9missions carbone et valorisation aupr\xE8s de partenaires institutionnels et RSE.",
          feasibility: "Faisabilit\xE9 moyenne n\xE9cessitant un protocole de mesure certifi\xE9.",
          economicBenefit: "Amortissement acc\xE9l\xE9r\xE9 des investissements d'\xE9co-conception."
        }
      ],
      differentiationFactor: `Positionnement pionnier \xE0 ${location} combinant haute performance technique et impact carbone prouv\xE9 par ACV.`,
      circularValueProposition: "Permettre aux clients de r\xE9duire leur empreinte environnementale de plus de 60% sans surco\xFBt d'usage prohibitif."
    },
    // 5. Alignement ODD
    sdgAlignment: [
      {
        oddNumber: 12,
        title: "Consommation et production responsables",
        contribution: `Substitution de mati\xE8res fossiles ou polluantes par des proc\xE9d\xE9s r\xE9g\xE9n\xE9ratifs circulaires \xE0 ${location}.`,
        targets: [
          "12.2 Gestion durable et utilisation rationnelle des ressources naturelles",
          "12.4 Gestion \xE9cologiquement rationnelle des produits chimiques et d\xE9chets",
          "12.5 R\xE9duction consid\xE9rable de la production de d\xE9chets par la pr\xE9vention et le recyclage"
        ]
      },
      {
        oddNumber: 13,
        title: "Mesures relatives \xE0 la lutte contre les changements climatiques",
        contribution: `Abaissement drastique des \xE9missions de GES de ${baselineCO2} \xE0 ${targetCO2} kg CO2e par unit\xE9 fonctionnelle.`,
        targets: [
          "13.1 Renforcement de la r\xE9silience et de la capacit\xE9 d'adaptation face aux al\xE9as climatiques",
          "13.3 Am\xE9lioration de l'\xE9ducation et de la sensibilisation \xE0 la d\xE9carbonation"
        ]
      },
      {
        oddNumber: 8,
        title: "Travail d\xE9cent et croissance \xE9conomique",
        contribution: "G\xE9n\xE9ration d'emplois verts qualifi\xE9s, non d\xE9localisables et respectueux des normes de sant\xE9 au travail.",
        targets: [
          "8.4 Am\xE9lioration progressive de l'efficacit\xE9 globale des ressources",
          "8.5 Plein emploi productif et travail d\xE9cent pour les jeunes et les femmes"
        ]
      },
      {
        oddNumber: 9,
        title: "Industrie, innovation et infrastructure",
        contribution: "Modernisation des outils de production par des technologies sobres et durables.",
        targets: [
          "9.4 R\xE9novation des infrastructures et conversion des industries pour les rendre durables"
        ]
      }
    ],
    // 6. Indicateurs d'impact
    impactIndicators: {
      carbonFootprint: {
        functionalUnit,
        totalCarbonKgCO2e: targetCO2,
        benchmarkComparison: {
          industryAverageKgCO2e: baselineCO2,
          ecoDesignedTargetKgCO2e: targetCO2,
          commentary: `Ce projet permet une \xE9conomie nette de ${Math.round((baselineCO2 - targetCO2) / baselineCO2 * 100)}% de gaz \xE0 effet de serre par rapport \xE0 la moyenne sectorielle constat\xE9e.`
        },
        lifecycleStages: [
          {
            id: "stage_raw",
            name: "Mati\xE8res premi\xE8res & Extraction (ISO 14064-1 Cat. 4 / ISO 14067 Amont)",
            category: "raw_materials",
            emissionKgCO2e: +(targetCO2 * 0.35).toFixed(2),
            percentage: 35,
            description: "Approvisionnement local et bio-sourc\xE9 / recycl\xE9 \xE0 faible impact, tra\xE7abilit\xE9 biog\xE9nique isol\xE9e.",
            reductionOpportunity: "Privil\xE9gier les gisements secondaires certifi\xE9s de proximit\xE9 et fournisseurs audit\xE9s."
          },
          {
            id: "stage_mfg",
            name: "Proc\xE9d\xE9 de Fabrication (ISO 14064-1 Cat. 1 & 2 / ISO 14067)",
            category: "manufacturing",
            emissionKgCO2e: +(targetCO2 * 0.28).toFixed(2),
            percentage: 28,
            description: "Lignes sobres aliment\xE9es par un mix \xE9lectrique propre (approches location-based & market-based).",
            reductionOpportunity: "R\xE9cup\xE9ration de chaleur fatale, isolation thermique et autoconsommation ENR sur site."
          },
          {
            id: "stage_pkg",
            name: "Conditionnement & Emballage (ISO 14064-1 Cat. 4)",
            category: "packaging",
            emissionKgCO2e: +(targetCO2 * 0.12).toFixed(2),
            percentage: 12,
            description: "Emballages r\xE9utilisables ou kraft 100% recycl\xE9 sans d\xE9riv\xE9s p\xE9trochimiques vierges.",
            reductionOpportunity: "Suppression d\xE9finitive des suremballages plastiques et standardisation r\xE9emploi."
          },
          {
            id: "stage_trans",
            name: "Transport & Distribution (ISO 14064-1 Cat. 3)",
            category: "transport",
            emissionKgCO2e: +(targetCO2 * 0.15).toFixed(2),
            percentage: 15,
            description: "Distribution en boucle courte r\xE9gionale et logistique invers\xE9e optimis\xE9e.",
            reductionOpportunity: "Optimisation du taux de charge, tourn\xE9es group\xE9es et flotte \xE0 motorisation alternative."
          },
          {
            id: "stage_eol",
            name: "Fin de vie & Recyclage (ISO 14064-1 Cat. 5 / ISO 14067 Aval)",
            category: "end_of_life",
            emissionKgCO2e: +(targetCO2 * 0.1).toFixed(2),
            percentage: 10,
            description: "Compostage direct ou recyclabilit\xE9 sans fraction r\xE9siduelle toxique.",
            reductionOpportunity: "Fili\xE8re locale de reprise mati\xE8re en boucle ferm\xE9e pour \xE9viter tout enfouissement."
          }
        ],
        highImpactDecarbonizationActions: [
          { action: "Alimentation 100% en \xE9nergie solaire d'autoconsommation sur le site de production", estimatedReductionPct: 22, priority: "P1" },
          { action: "S\xE9lection exclusive d'approvisionnements locaux dans un rayon inf\xE9rieur \xE0 100 km", estimatedReductionPct: 15, priority: "P2" },
          { action: "Syst\xE8me de consigne et de r\xE9emploi des contenants logistiques", estimatedReductionPct: 12, priority: "P2" }
        ]
      },
      circularityRate: "88% de flux mati\xE8re circulaires ou biod\xE9gradables",
      wasteAvoided: "3,8 tonnes de d\xE9chets non recyclables \xE9limin\xE9es par an",
      waterPreservation: "Pr\xE9servation des nappes phr\xE9atiques gr\xE2ce \xE0 des proc\xE9d\xE9s secs ou circuits ferm\xE9s",
      localJobsProjection: "6 emplois verts directs cr\xE9\xE9s \xE0 18 mois",
      keyMetrics: [
        { label: "Intensit\xE9 carbone", value: `${targetCO2}`, unit: "kg CO2e / unit\xE9", interpretation: "Conforme aux trajectoires de d\xE9carbonation 1.5\xB0C" },
        { label: "Taux de circularit\xE9", value: "88%", unit: "% mati\xE8re", interpretation: "Haut niveau de circularit\xE9" },
        { label: "Ind\xE9pendance fossile", value: "92%", unit: "% renouvelable", interpretation: "Rupture nette avec les mati\xE8res p\xE9trosourc\xE9es" },
        { label: "Ancrage territorial", value: "Local", unit: `${location}`, interpretation: "Circuits courts favoris\xE9s" }
      ]
    },
    // 7. Financements et labels verts
    greenFinancingAndLabels: {
      labels: [
        {
          name: "Label \xC9cologique & RSE ISO 26000 / Label Engag\xE9 RSE",
          category: "Responsabilit\xE9 Soci\xE9tale & Environnementale",
          whyItMatters: "Conf\xE8re une cr\xE9dibilit\xE9 d'audit v\xE9rifi\xE9e aupr\xE8s des bailleurs de fonds internationaux et partenaires B2B.",
          eligibilityCriteria: "Respect des 7 questions centrales ISO 26000, gouvernance transparente et audit sur site."
        },
        {
          name: "Certification Cradle to Cradle (C2C) ou \xC9colabel",
          category: "\xC9co-conception & Circularit\xE9 Produit",
          whyItMatters: "Prouve la s\xE9curit\xE9 chimique des mat\xE9riaux et leur r\xE9int\xE9gration perp\xE9tuelle en cycle biologique ou technique.",
          eligibilityCriteria: "Toxicit\xE9 z\xE9ro des intrants, utilisation d'\xE9nergies renouvelables et gestion saine de l'eau."
        }
      ],
      fundings: [
        {
          source: "APII / P\xE9pini\xE8res du R\xE9seau National (RNPE)",
          program: "Accompagnement Entrepreneuriat Vert & Prime d'Investissement",
          amountOrAid: "H\xE9bergement en p\xE9pini\xE8re, coaching technique et primes d'\xE9co-innovation",
          conditions: "Projet d'innovation durable \xE0 impact local cr\xE9ateur d'emplois p\xE9rennes."
        },
        {
          source: "ANME (Agence Nationale pour la Ma\xEEtrise de l'\xC9nergie)",
          program: "Fonds de Transition \xC9nerg\xE9tique (FTE)",
          amountOrAid: "Prise en charge d'audits \xE9nerg\xE9tiques et primes sur investissements sobres",
          conditions: "D\xE9p\xF4t d'un dossier d'efficacit\xE9 \xE9nerg\xE9tique ou d'installation ENR."
        },
        {
          source: "Programmes Internationaux (SwitchMed / Horizon Europe / AFD Climat)",
          program: "Subventions pour l'\xC9conomie Circulaire et la Transition Verte",
          amountOrAid: "Subventions de 20 000 \u20AC \xE0 100 000 \u20AC avec assistance technique",
          conditions: "Preuve d'impact environnemental mesurable (ACV certifi\xE9e) et viabilit\xE9 \xE9conomique."
        }
      ]
    },
    // 8. Plan d'action prioritaire
    priorityActionPlan: {
      phase1_0to3months: [
        {
          timeframe: "0-3 mois",
          title: "Finalisation de l'Analyse de Cycle de Vie (ACV) simplifi\xE9e",
          description: `Quantifier pr\xE9cis\xE9ment les flux entrants et sortants r\xE9els sur le site de ${location}.`,
          priorityLevel: "Haute",
          expectedDeliverable: "Rapport ACV complet et fiche technique d'\xE9co-conception."
        },
        {
          timeframe: "0-3 mois",
          title: "D\xE9p\xF4t du dossier d'accompagnement APII / RNPE",
          description: "Pr\xE9senter le diagnostic vert au comit\xE9 de s\xE9lection de la p\xE9pini\xE8re d'entreprises.",
          priorityLevel: "Haute",
          expectedDeliverable: "Convention d'incubation et validation des avantages fiscaux/aides."
        }
      ],
      phase2_3to6months: [
        {
          timeframe: "3-6 mois",
          title: "S\xE9curisation des partenariats d'approvisionnement local",
          description: `Contractualiser avec les fournisseurs de mati\xE8res premi\xE8res ou d\xE9chets valorisables \xE0 ${location}.`,
          priorityLevel: "Moyenne",
          expectedDeliverable: "Accords-cadres avec clauses de qualit\xE9 et d'impact environnemental."
        },
        {
          timeframe: "3-6 mois",
          title: "Candidature aux financements verts (ANME / SwitchMed)",
          description: "Solliciter le co-financement des investissements mat\xE9riels sobres en \xE9nergie.",
          priorityLevel: "Moyenne",
          expectedDeliverable: "Dossier de subvention compl\xE9t\xE9 et vis\xE9 par l'expert comptable."
        }
      ],
      phase3_6to12months: [
        {
          timeframe: "6-12 mois",
          title: "Obtention du premier label vert & D\xE9ploiement commercial",
          description: "Passer l'audit de conformit\xE9 environnementale et lancer la commercialisation certifi\xE9e.",
          priorityLevel: "Strat\xE9gique",
          expectedDeliverable: "Certificat de labellisation environnementale et bilan d'impact annuel."
        },
        {
          timeframe: "6-12 mois",
          title: "Mesure d'impact in situ et communication responsable",
          description: "Publier les premiers indicateurs d'\xE9missions \xE9vit\xE9es et de circularit\xE9 aupr\xE8s des clients.",
          priorityLevel: "Strat\xE9gique",
          expectedDeliverable: "Rapport RSE public et communication anti-greenwashing transparente."
        }
      ]
    },
    thirdExpertValidation: {
      summary: "Expert 3 (Auditeur Senior ESG) : Validation positive de la trajectoire bas-carbone et conformit\xE9 aux crit\xE8res de la taxonomie verte europ\xE9enne confirm\xE9e.",
      validationStatus: "Valid\xE9"
    }
  };
}

// server.ts
dotenv.config();
var firebaseConfig = JSON.parse(fs.readFileSync("./firebase-applet-config.json", "utf8"));
if (!getApps().length) {
  initializeApp({
    projectId: firebaseConfig.projectId
  });
}
var firestore = getFirestore(firebaseConfig.firestoreDatabaseId);
var app = express();
var PORT = 3e3;
app.use(express.json({ limit: "10mb" }));
var geminiQuotaExhaustedUntil = 0;
var ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || "",
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build"
    }
  }
});
function promiseWithTimeout(promise, timeoutMs, errorMsg) {
  let timer;
  const timeoutPromise = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(errorMsg)), timeoutMs);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => {
    clearTimeout(timer);
  });
}
async function generateContentWithResilience(options) {
  if (Date.now() < geminiQuotaExhaustedUntil) {
    console.warn("[Gemini Engine] Quota \xE9puis\xE9, passage direct au repli expert.");
    throw new Error("429 - Quota temporairement \xE9puis\xE9");
  }
  const startTime = Date.now();
  const singleTimeout = options.singleAttemptTimeoutMs || 1e4;
  const totalTimeout = options.totalTimeoutMs || 16e3;
  const models = options.preferredModels || [
    "gemini-3.1-flash-lite",
    "gemini-3.5-flash-lite",
    "gemini-3.8-flash"
  ];
  let lastError = null;
  for (const modelName of models) {
    if (Date.now() - startTime >= totalTimeout) {
      console.warn(`[Gemini Engine] Temps limite global (${totalTimeout}ms) atteint avant d'essayer "${modelName}".`);
      break;
    }
    try {
      console.log(`[Gemini Engine] Requ\xEAte sur "${modelName}" (timeout: ${singleTimeout}ms)...`);
      const apiCallPromise = ai.models.generateContent({
        model: modelName,
        contents: options.contents,
        config: options.config
      });
      const response = await promiseWithTimeout(
        apiCallPromise,
        singleTimeout,
        `D\xE9lai d\xE9pass\xE9 (${singleTimeout}ms) pour le mod\xE8le ${modelName}`
      );
      if (response && response.text) {
        console.log(`[Gemini Engine] R\xE9ponse g\xE9n\xE9r\xE9e avec succ\xE8s depuis "${modelName}" en ${Date.now() - startTime}ms !`);
        return { response, modelUsed: modelName };
      }
    } catch (err) {
      lastError = err;
      const errMsg = err?.message || String(err);
      console.warn(`[Gemini Engine] Le mod\xE8le "${modelName}" a renvoy\xE9 : ${errMsg}`);
      if (errMsg.includes("quota") || errMsg.includes("429") || errMsg.includes("Resource has been exhausted")) {
        geminiQuotaExhaustedUntil = Date.now() + 30 * 60 * 1e3;
        break;
      }
    }
  }
  throw lastError || new Error("Les mod\xE8les Gemini ont mis trop de temps ou sont indisponibles.");
}
var GLOBAL_PROJECTS_COLLECTION = "global_projects";
async function readProjects() {
  try {
    const snapshot = await firestore.collection(GLOBAL_PROJECTS_COLLECTION).orderBy("createdAt", "desc").limit(50).get();
    return snapshot.docs.map((doc) => doc.data());
  } catch (err) {
    console.error("Error reading projects from Firestore:", err);
    return [];
  }
}
async function saveProjectToFirestore(project) {
  try {
    await firestore.collection(GLOBAL_PROJECTS_COLLECTION).doc(project.id).set({
      ...project,
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    });
  } catch (err) {
    console.error("Error saving project to Firestore:", err);
  }
}
app.get("/api/projects", async (req, res) => {
  const list = await readProjects();
  res.json({ success: true, data: list });
});
app.get("/api/projects/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const doc = await firestore.collection(GLOBAL_PROJECTS_COLLECTION).doc(id).get();
    if (!doc.exists) {
      res.status(404).json({ success: false, error: "Projet introuvable." });
      return;
    }
    res.json({ success: true, data: doc.data() });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});
app.post("/api/projects", async (req, res) => {
  try {
    const project = req.body;
    if (!project || !project.title) {
      res.status(400).json({ success: false, error: "Donn\xE9es de projet invalides." });
      return;
    }
    const newProject = {
      ...project,
      id: project.id || `proj_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      createdAt: project.createdAt || (/* @__PURE__ */ new Date()).toISOString(),
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    await saveProjectToFirestore(newProject);
    res.json({ success: true, data: newProject });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});
app.put("/api/projects/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    await firestore.collection(GLOBAL_PROJECTS_COLLECTION).doc(id).update({
      ...updates,
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});
app.delete("/api/projects/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await firestore.collection(GLOBAL_PROJECTS_COLLECTION).doc(id).delete();
    res.json({ success: true, message: "Projet supprim\xE9 de l'historique." });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});
app.post("/api/extract-file", async (req, res) => {
  try {
    const { filename, base64Data, mimeType } = req.body;
    if (!base64Data) {
      res.status(400).json({ success: false, error: "Donn\xE9es de fichier manquantes." });
      return;
    }
    const buffer = Buffer.from(base64Data, "base64");
    const ext = path.extname(filename || "").toLowerCase();
    let extractedText = "";
    if (ext === ".pdf" || mimeType === "application/pdf") {
      try {
        const parser = new PDFParse({ data: buffer });
        const parsedResult = await parser.getText();
        extractedText = typeof parsedResult === "string" ? parsedResult : parsedResult?.text || "";
      } catch (pdfErr) {
        console.warn("[File Extract] Erreur pdf-parse:", pdfErr);
      }
      if (!extractedText || extractedText.trim().length < 40) {
        try {
          const aiRes = await ai.models.generateContent({
            model: "gemini-3.1-flash-lite",
            contents: [
              {
                inlineData: {
                  mimeType: "application/pdf",
                  data: base64Data
                }
              },
              {
                text: "Extrais et transcris fid\xE8lement le contenu descriptif de ce projet (probl\xE8me r\xE9solu, solution technique, intrants, proc\xE9d\xE9s, proposition de valeur et aspects environnementaux). Restitue un texte clair et bien structur\xE9 adapt\xE9 pour renseigner la description d'un audit \xE9cologique."
              }
            ]
          });
          if (aiRes && aiRes.text) {
            extractedText = aiRes.text;
          }
        } catch (geminiPdfErr) {
          console.warn("[File Extract] Gemini PDF fallback non disponible:", geminiPdfErr);
        }
      }
    } else if (ext === ".docx" || ext === ".doc" || mimeType?.includes("word")) {
      const mammothResult = await mammoth.extractRawText({ buffer });
      extractedText = mammothResult.value || "";
    } else {
      extractedText = buffer.toString("utf-8");
    }
    extractedText = extractedText.replace(/\r\n/g, "\n").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
    if (!extractedText) {
      res.status(400).json({
        success: false,
        error: "Impossible d'extraire du texte de ce document. Assurez-vous qu'il contient du texte lisible."
      });
      return;
    }
    let suggestedTitle = "";
    const lines = extractedText.split("\n").map((l) => l.trim()).filter(Boolean);
    if (lines.length > 0) {
      const firstLine = lines[0].replace(/^#+\s*/, "");
      if (firstLine.length >= 3 && firstLine.length <= 80) {
        suggestedTitle = firstLine;
      }
    }
    let finalDescription = extractedText;
    try {
      const summaryRes = await ai.models.generateContent({
        model: "gemini-3.1-flash-lite",
        contents: `\xC0 partir du contenu du document import\xE9 ci-dessous, r\xE9dige une description concise et percutante de l'id\xE9e de projet et de sa proposition de valeur, STRICTEMENT LIMIT\xC9E \xC0 7 LIGNES MAXIMUM. Cette description doit condenser les informations les plus pertinentes (probl\xE8me r\xE9solu, solution technique, intrants/proc\xE9d\xE9s et proposition de valeur \xE9cologique) pour renseigner le champ de diagnostic.

Document source :
${extractedText.slice(0, 15e3)}`
      });
      if (summaryRes && summaryRes.text) {
        finalDescription = summaryRes.text.trim();
      }
    } catch (sumErr) {
      console.warn("[File Extract] Erreur de synth\xE8se IA, utilisation des 7 premi\xE8res lignes:", sumErr);
      finalDescription = extractedText.split("\n").slice(0, 7).join("\n");
    }
    res.json({
      success: true,
      filename,
      extractedText: finalDescription,
      suggestedTitle,
      charCount: finalDescription.length
    });
  } catch (err) {
    console.error("Error in /api/extract-file:", err);
    res.status(500).json({
      success: false,
      error: err?.message || "Erreur lors de l'extraction du document."
    });
  }
});
var auditContentCache = /* @__PURE__ */ new Map();
function normalizeDescriptionKey(desc, loc, answers) {
  const cleanDesc = (desc || "").toLowerCase().trim().replace(/\s+/g, " ");
  const cleanLoc = (loc || "").toLowerCase().trim().replace(/\s+/g, " ");
  const cleanAnswers = answers ? JSON.stringify(answers) : "";
  return `${cleanDesc}:::${cleanLoc}:::${cleanAnswers}`;
}
app.post("/api/analyze", async (req, res) => {
  try {
    const { title, description, location, sector, targetAudience, businessModel, lifeCycleDetails } = req.body;
    if (!title || !description) {
      res.status(400).json({ success: false, error: "Le titre et la description du projet sont obligatoires." });
      return;
    }
    const cacheKey = normalizeDescriptionKey(description, location, req.body && req.body.answers);
    const cached = auditContentCache.get(cacheKey);
    if (cached && Date.now() - cached.cachedAt < 24 * 60 * 60 * 1e3) {
      console.log(`[Audit Engine] Projet \xE9quivalent d\xE9tect\xE9 en cache pour "${title}". Application d\xE9terministe des scores et du diagnostic.`);
      const cloned = JSON.parse(JSON.stringify(cached.data));
      if (cloned.projectSynthesis && cloned.projectSynthesis.summary) {
        cloned.projectSynthesis.summary = cloned.projectSynthesis.summary.replace(
          /Le projet "[^"]+"/g,
          `Le projet "${title}"`
        );
      }
      const finalSector2 = cloned.detectedSector || sector || "\xC9conomie Circulaire & \xC9co-innovation";
      const auditResult2 = {
        id: `proj_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        title,
        sector: finalSector2,
        description,
        location: location || "Non sp\xE9cifi\xE9",
        targetAudience: targetAudience || "B2B / B2C \xC9co-responsable",
        businessModel: businessModel || "\xC9conomie Circulaire & Vente directe",
        lifeCycleDetails: lifeCycleDetails || "",
        createdAt: (/* @__PURE__ */ new Date()).toISOString(),
        ...cloned
      };
      if (req.body.shouldSave) {
        await saveProjectToFirestore(auditResult2);
      }
      res.json({ success: true, data: auditResult2, cached: true });
      return;
    }
    const systemPrompt = `
Tu es le Coll\xE8ge d'\xC9valuation Environnementale de Vert'Id\xE9e.
Ta mission repose sur les m\xE9thodologies de r\xE9f\xE9rence internationales et nationales (ISO 14067:2018, ISO 14064-1:2018, Biblioth\xE8que GreenGate.tn, Greenov'i, CITET, ANME, et Panorama des M\xE9thodes d'\xC9valuation Environnementale - Institut Agro Montpellier / HAL) :
- **ISO 14067:2018 (Empreinte Carbone des Produits - ECP / CFP)** :
  * Quantification de l'empreinte carbone sur l'ensemble du cycle de vie (du berceau \xE0 la tombe ou du berceau \xE0 la porte) rapport\xE9e \xE0 une Unit\xE9 Fonctionnelle (UF) ou d\xE9clar\xE9e rigoureuse.
  * Traitement distinct et transparent du carbone biog\xE9nique (\xE9missions et captations de la biomasse) et des \xE9missions li\xE9es au changement direct d'affectation des sols (dLUC) sur 20 ans.
  * Application conjointe des approches g\xE9ographique (location-based) et contractuelle (market-based) pour l'\xE9lectricit\xE9 import\xE9e.
  * **R\xE8gle absolue anti-greenwashing ISO 14067** : La compensation carbone (achats de cr\xE9dits, offsets) n'est JAMAIS d\xE9duite de l'empreinte carbone intrins\xE8que du produit.
- **ISO 14064-1:2018 (Inventaire des \xE9missions et suppressions de GES au niveau des organismes)** :
  * Structuration selon les 6 cat\xE9gories normatives :
    - Cat\xE9gorie 1 : \xC9missions et captations directes de GES (combustions fixes, mobiles, proc\xE9d\xE9s, \xE9missions fugitives, UTCATF/LULUCF).
    - Cat\xE9gorie 2 : \xC9missions indirectes de GES li\xE9es \xE0 l'\xE9nergie import\xE9e (\xE9lectricit\xE9, vapeur, chaleur, froid).
    - Cat\xE9gorie 3 : \xC9missions indirectes li\xE9es aux transports (fret amont/aval, mobilit\xE9 collaborateurs, d\xE9placements professionnels).
    - Cat\xE9gorie 4 : \xC9missions indirectes des produits achet\xE9s (mati\xE8res premi\xE8res, emballages, biens d'\xE9quipement, traitement des d\xE9chets, services).
    - Cat\xE9gorie 5 : \xC9missions indirectes associ\xE9es \xE0 l'utilisation et la fin de vie des produits de l'organisme.
    - Cat\xE9gorie 6 : \xC9missions indirectes d'autres sources.
  * Principes directeurs d'int\xE9grit\xE9 : Pertinence, Exhaustivit\xE9, Coh\xE9rence, Exactitude, Transparence.
- **R\xE9f\xE9rentiel GreenGate.tn & Greenov'i (UE / Expertise France / CITET)** : Guide de l'Entrepreneuriat Vert, \xE9laboration du Business Plan Vert, \xE9co-conception, mod\xE8les d'affaires circulaires et crit\xE8res d'\xE9ligibilit\xE9 aux \xE9colabels et financements verts (FODEP, ANME, BERD Climat).
- **ISO 14001 & ISO 14040/14044 (ACV)** : Analyse des Aspects Environnementaux Significatifs (AES) et \xE9valuation multi-crit\xE8res du cycle de vie du berceau \xE0 la tombe.
- **Guide & Panorama Institut Agro Montpellier** : Cadrage m\xE9thodologique combinant ACV (Life Cycle Assessment), GHG Protocol (Scopes 1-2-3), MFA (Analyse des Flux de Mati\xE8re/Circularit\xE9), ERA (\xC9valuation des Risques \xC9cotoxiques & Chimiques), AMC/MCDA (Analyse Multicrit\xE8re de D\xE9cision Environnement-\xC9conomie-Social) et MEA/IPBES (Valuation des Services \xC9cosyst\xE9miques).
- **Guide OSS (Observatoire du Sahara et du Sahel) & REPSAHEL** : \xC9co-responsabilit\xE9, r\xE9silience hydro-climatique et pr\xE9servation des \xE9cosyst\xE8mes fragiles en zone aride/semi-aride.

*** R\xC8GLE DE STABILIT\xC9 ET D\xC9TERMINISME DU SCORING (OBLIGATION SCIENTIFIQUE ABSOLUE) ***
1. IND\xC9PENDANCE TOTALE VIS-\xC0-VIS DU NOM / MARQUE : L'\xE9valuation environnementale et les scores (environnemental, social, circularit\xE9, maturit\xE9 carbone et score global) reposent EXCLUSIVEMENT et STRICTEMENT sur la nature des activit\xE9s r\xE9elles, les intrants, les proc\xE9d\xE9s de fabrication ou de service, les flux de mati\xE8re et d'\xE9nergie, et les externalit\xE9s d\xE9crits dans la DESCRIPTION et les caract\xE9ristiques techniques.
2. Le titre commercial ou nom de marque (ex: "grandii", "t3allem", ou tout autre libell\xE9) n'est qu'un identifiant arbitraire. Il NE DOIT EN AUCUN CAS faire varier les scores ni l'analyse d'impact.
3. Si deux projets pr\xE9sentent la m\xEAme description op\xE9rationnelle et les m\xEAmes caract\xE9ristiques, le Coll\xE8ge d'Experts DOIT imp\xE9rativement attribuer des scores strictement identiques et reproductibles. Toute divergence de notation due au nom du projet est une erreur m\xE9thodologique inacceptable.

1. ANALYSE PR\xC9LIMINAIRE : V\xE9rifie si les informations fournies (titre, description, lieu) sont suffisantes pour r\xE9aliser un audit environnemental complet ET cr\xE9dible.
   - SI INSUFFISANT (notamment pour les projets industriels lourds, plasturgie, chimie, mines, sans d\xE9tails sur les intrants, l'\xE9nergie ou les effluents) : Tu DOIS imp\xE9rativement r\xE9pondre avec { "needsInfo": true, "questions": [{ "id": "...", "question": "...", "options": [...] }] }.
   - Pose entre 3 et 5 questions \xE0 choix multiples pertinentes pour lever les doutes sur le greenwashing (ex: provenance de la mati\xE8re, type d'\xE9nergie, consommation d'eau et circuit de recyclage).

2. ANALYSE D\xC9TAILL\xC9E : Si suffisant, tu es constitu\xE9 de QUATRE Experts Seniors Ind\xE9pendants r\xE9alisant une revue critique sans la moindre complaisance, couvrant exhaustivement tous les volets du projet :
   - **Expert 1 (Sp\xE9cialiste Senior Empreinte Carbone & ACV - Normes ISO 14067:2018, ISO 14064-1:2018, GHG Protocol & MFA Institut Agro)** : Quantification norm\xE9e de l'Empreinte Carbone Produit (ECP) par unit\xE9 fonctionnelle ou d\xE9clar\xE9e (ISO 14067), d\xE9composition rigoureuse selon les 6 cat\xE9gories d'\xE9missions ISO 14064-1 (Cat 1 directe, Cat 2 \xE9nergie import\xE9e, Cat 3 transport, Cat 4 intrants/emballages, Cat 5 usage/fin de vie), comptabilisation s\xE9par\xE9e du carbone biog\xE9nique et exclusion stricte de toute compensation carbone fictive.
   - **Expert 2 (Risques Industriels, \xC9cotoxicologie ERA & AES ISO 14001 - Guide OSS & Institut Agro)** : \xC9valuation de la criticit\xE9 des impacts selon la matrice norm\xE9e **Criticit\xE9 (C) = [Fr\xE9quence (F) \xD7 Gravit\xE9 (G) \xD7 Sensibilit\xE9 du Milieu (S)] / Ma\xEEtrise Op\xE9rationnelle (M)**, l'\xE9valuation des risques \xE9cotoxiques (ERA), le stress hydrique (OSS), la sant\xE9 des riverains et la conformit\xE9 r\xE9glementaire (CITET, CSRD, Taxonomie UE).
   - **Expert 3 (Strat\xE9gie d'Entrepreneuriat Vert & Mod\xE8les Circulaires)** : Analyse approfondie de la viabilit\xE9 \xE9conomique de la transition \xE9cologique, de l'\xE9conomie de la fonctionnalit\xE9, de l'\xE9coconception des mod\xE8les d'affaires (business models circulaires) et de la substitution durable des ressources (r\xE9f\xE9rentiel GreenGate.tn).
   - **Expert 4 (D\xE9tecteur Avanc\xE9 Anti-Greenwashing & V\xE9rification des All\xE9gations)** : Chasse implacable aux revendications environnementales trompeuses (greenwashing), analyse critique de la mat\xE9rialit\xE9 des gains annonc\xE9s face aux impacts cach\xE9s (amont/aval), exigence de preuves mesurables (ACV certifi\xE9e, tra\xE7abilit\xE9 des intrants, labels authentiques).

*** R\xC8GLE \xC9THIQUE & S\xC9CURIT\xC9 ABSOLUE : TOL\xC9RANCE Z\xC9RO AU GREENWASHING ***
1. Projets interdits : Si le projet porte sur des technologies militaires, des armes ou des substances destructrices ill\xE9gales, refuse cat\xE9goriquement l'audit.
2. \xC9VALUATION R\xC9ALISTE DES ACTIVIT\xC9S POLLUANTES, EXTRACTIVES & EXTRACTIVO-CHIMIQUES :
   Si le projet d\xE9crit appartient \xE0 une industrie lourde extractive, mini\xE8re, fossile, plasturgie conventionnelle ou hyper-consommatrice d'eau (ex : phosphate, carri\xE8res, cimenterie fossile, p\xE9trochimie, engrais de synth\xE8se, pesticides, injection plastique sans 100% de r\xE9sine recycl\xE9e certifi\xE9e) :
   - TU DOIS STATUER UN AVIS D\xC9FAVORABLE / ALERTE CRITIQUE DU COLL\xC8GE DES EXPERTS.
   - Les scores d'impact DOIVENT \xCATRE CRITIQUEMENT BAS : Score global entre 15 et 32/100, Score environnemental entre 12 et 25/100, Score circularit\xE9 entre 10 et 22/100.
   - IL EST STRICTEMENT INTERDIT de pr\xE9tendre que ce projet est "vertueux", "\xE9co-responsable" ou rel\xE8ve de l'"\xE9conomie circulaire" sans preuves massives (ex: circuit ferm\xE9 eau ZLD, 100% recycl\xE9 certifi\xE9, solaire d\xE9di\xE9).
   - D\xC9TAILLE EXPLICITEMENT LES AES MAJEURS ET LES RISQUES CRITIQUES R\xC9ELS (Pollution nappes, poussi\xE8res PM10, sur-\xE9missions CO2).
3. PROJETS CONVENTIONNELS OU NUM\xC9RIQUES : Attribue des notes r\xE9alistes, coh\xE9rentes et mod\xE9r\xE9es (40 \xE0 65/100 pour l'environnement, valorise le volet social si inclusion/\xE9ducation).
4. VRAIES \xC9CO-INNOVATIONS V\xC9RIFIABLES (Agro\xE9cologie r\xE9g\xE9n\xE9ratrice, biomat\xE9riaux compostables, \xE9nergies renouvelables certifi\xE9es, valorisation circulaire de biod\xE9chets) : Attribue des scores \xE9lev\xE9s m\xE9rit\xE9s (75 \xE0 90/100) avec justification des gains nets et de la r\xE9silience locale (Guide OSS).

Le rapport d'expertise DOIT OBLIGATOIREMENT \xEAtre structur\xE9 selon EXACTEMENT les 8 sections officielles :
1. Synth\xE8se du projet : Scores d'impacts rigoureusement calibr\xE9s (s\xE9v\xE8res si polluant), avis coll\xE9gial des 2 experts (STRICTEMENT LIMIT\xC9 \xC0 5 LIGNES MAX / ~40-50 mots directement apr\xE8s le nom du projet) et vision de transformation.
2. Aspects & impacts environnementaux : Analyse approfondie des aspects et impacts environnementaux (directs et indirects, positifs et n\xE9gatifs) sur les \xE9cosyst\xE8mes, l'air, l'eau, le climat, les sols et la biodiversit\xE9. \xC9valuation norm\xE9e des AES selon la matrice ISO 14001 (F, G, S, M), quantification des impacts par phase du cycle de vie (ACV ISO 14040/14044), \xE9cotoxicit\xE9 (ERA), flux de mati\xE8re (MFA) et leviers d'att\xE9nuation d'impacts.
3. Aspects & impacts sociaux et soci\xE9taux : Analyse approfondie des impacts sociaux et soci\xE9taux directs et indirects : sant\xE9 et s\xE9curit\xE9 des travailleurs, sant\xE9 publique et riverains (exposition poussi\xE8res PM, produits toxiques, bruit), cr\xE9ation d'emplois locaux p\xE9rennes, retomb\xE9es communautaires, gouvernance partag\xE9e \xE9thique (ISO 26000) et accompagnement vers une transition juste.
4. Int\xE9gration de l'entrepreneuriat vert : Analyse \xE9conomique critique, mod\xE8les de rupture technologique n\xE9cessaires (ex: recyclage d'eau ferm\xE9 ZLD, filtres-presses, solaire d\xE9di\xE9).
5. Alignement ODD : Alerte sur les ODD n\xE9gativement impact\xE9s si industrie polluante (ex: ODD 6 Eau, ODD 3 Sant\xE9, ODD 12 Production durable).
6. Indicateurs d'impact : Bilan carbone norm\xE9 selon ISO 14067:2018 (par unit\xE9 fonctionnelle) et ISO 14064-1:2018 (Cat\xE9gories 1 \xE0 6). Analyse de cycle de vie \xE9tape par \xE9tape (Approvisionnement Cat 4, Fabrication Cat 1-2, Conditionnement Cat 4, Transport Cat 3, Utilisation Cat 5, Fin de vie Cat 5) avec exclusion stricte de toute compensation carbone fictive. Pour benchmarkComparison : si le projet appartient \xE0 une industrie lourde ou polluante, totalCarbonKgCO2e DOIT \xEAtre STRICTEMENT SUP\xC9RIEUR \xE0 industryAverageKgCO2e (+20% \xE0 +60% de sur-\xE9missions) ; si \xE9co-innovation vertueuse, totalCarbonKgCO2e DOIT \xEAtre INF\xC9RIEUR (-20% \xE0 -65%). Actions de d\xE9carbonation quantifi\xE9es (P1/P2/P3), intensit\xE9 eau chiffr\xE9e.
7. Financements et labels verts : Statut d'\xE9ligibilit\xE9 r\xE9el (exclusion formelle des labels verts si activit\xE9 polluante), fonds de mise en conformit\xE9 et d\xE9pollution (FODEP, BERD Climat).
8. Plan d'action prioritaire : Actions concr\xE8tes d'urgence (0-12 mois) prioris\xE9es avec livrables op\xE9rationnels pour la neutralisation des AES.
`;
    const userPrompt = `
Voici le projet \xE0 auditer selon les 8 sections officielles par le Coll\xE8ge des 2 Experts Environnementaux :
- Nom commercial / Marque du projet (Libell\xE9 administratif uniquement, NE DOIT PAS INFLUENCER LES SCORES) : ${title}
- Description op\xE9rationnelle de l'activit\xE9 & Proposition de valeur (FONDEMENT STRICT DU SCORING) : ${description}
- Lieu d'implantation : ${location || "Tunisie / International"}
${sector ? `- Secteur sugg\xE9r\xE9 : ${sector}` : ""}
${targetAudience ? `- Cible sugg\xE9r\xE9e : ${targetAudience}` : ""}
${businessModel ? `- Mod\xE8le \xE9conomique sugg\xE9r\xE9 : ${businessModel}` : ""}
${lifeCycleDetails ? `- D\xE9tails cycle de vie : ${lifeCycleDetails}` : ""}
${req.body && req.body.answers ? `- Informations compl\xE9mentaires fournies (Q&R) : ${JSON.stringify(req.body.answers)}` : ""}

Consigne stricte de cotation : Calcule les scores avec une impartialit\xE9 totale, en te basant exclusivement sur la description op\xE9rationnelle ci-dessus. Deux projets ayant la m\xEAme description doivent imp\xE9rativement recevoir des scores identiques.
`;
    let parsedData = null;
    try {
      const { response, modelUsed } = await generateContentWithResilience({
        contents: userPrompt,
        preferredModels: ["gemini-3.1-flash-lite", "gemini-3.5-flash-lite", "gemini-3.8-flash"],
        singleAttemptTimeoutMs: 12e3,
        totalTimeoutMs: 18e3,
        config: {
          systemInstruction: systemPrompt,
          temperature: 0.1,
          seed: 42,
          maxOutputTokens: 8192,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              needsInfo: { type: Type.BOOLEAN, description: "Indique si des informations suppl\xE9mentaires sont n\xE9cessaires avant l'analyse" },
              questions: {
                type: Type.ARRAY,
                description: "Liste de questions si needsInfo est vrai",
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING },
                    question: { type: Type.STRING },
                    options: { type: Type.ARRAY, items: { type: Type.STRING } }
                  },
                  required: ["id", "question", "options"]
                }
              },
              detectedSector: { type: Type.STRING, description: "Secteur d'activit\xE9 d\xE9termin\xE9 pour le projet" },
              // 1. Synthèse du projet
              projectSynthesis: {
                type: Type.OBJECT,
                properties: {
                  scores: {
                    type: Type.OBJECT,
                    properties: {
                      environmental: { type: Type.NUMBER, description: "Score environnemental 0-100" },
                      social: { type: Type.NUMBER, description: "Score social 0-100" },
                      circularity: { type: Type.NUMBER, description: "Score circularit\xE9 0-100" },
                      carbonMaturity: { type: Type.NUMBER, description: "Score maturit\xE9 carbone 0-100" },
                      globalScore: { type: Type.NUMBER, description: "Score global 0-100" }
                    },
                    required: ["environmental", "social", "circularity", "carbonMaturity", "globalScore"]
                  },
                  summary: { type: Type.STRING },
                  vision: { type: Type.STRING }
                },
                required: ["scores", "summary", "vision"]
              },
              // 2. Aspects & impacts environnementaux
              environmentalAspects: {
                type: Type.OBJECT,
                properties: {
                  strengths: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Impacts environnementaux positifs, atouts \xE9cologiques et gains nets" },
                  criticalRisks: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Impacts environnementaux n\xE9gatifs, pollutions potentielles et AES critiques" },
                  lifecycleAssessment: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        phase: { type: Type.STRING },
                        impactLevel: { type: Type.STRING, enum: ["faible", "moyen", "eleve"] },
                        details: { type: Type.STRING, description: "Nature et diagnostic pr\xE9cis des impacts de cette phase" },
                        ecoDesignLever: { type: Type.STRING, description: "Levier d'\xE9co-conception pour att\xE9nuer ou \xE9liminer cet impact" }
                      },
                      required: ["phase", "impactLevel", "details", "ecoDesignLever"]
                    }
                  },
                  circularEconomy: {
                    type: Type.OBJECT,
                    properties: {
                      strategies: { type: Type.ARRAY, items: { type: Type.STRING } },
                      wasteValorization: { type: Type.STRING, description: "Impact sur la r\xE9duction et valorisation des d\xE9chets" },
                      durabilityRepair: { type: Type.STRING, description: "Impact sur l'allongement de vie et la r\xE9parabilit\xE9" }
                    },
                    required: ["strategies", "wasteValorization", "durabilityRepair"]
                  },
                  regulationsAndNorms: { type: Type.ARRAY, items: { type: Type.STRING } }
                },
                required: ["strengths", "criticalRisks", "lifecycleAssessment", "circularEconomy", "regulationsAndNorms"]
              },
              // 3. Aspects & impacts sociaux et sociétaux
              socialAspects: {
                type: Type.OBJECT,
                properties: {
                  socialImpacts: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Impacts sociaux directs : conditions de travail, hygi\xE8ne et s\xE9curit\xE9, sant\xE9 des travailleurs et des riverains" },
                  localEconomy: { type: Type.STRING, description: "Impacts \xE9conomiques locaux : cr\xE9ation d'emplois durables, circuits courts et retomb\xE9es sur le bassin territorial" },
                  governanceAndEthics: { type: Type.STRING, description: "Impacts soci\xE9taux et gouvernance \xE9thique : concertation des parties prenantes, transparence et respect des normes RSE (ISO 26000)" },
                  justTransition: { type: Type.STRING, description: "Impacts sur la transition juste : formation continue aux m\xE9tiers verts, inclusion et reconversion \xE9quitable des collaborateurs" }
                },
                required: ["socialImpacts", "localEconomy", "governanceAndEthics", "justTransition"]
              },
              // 4. Intégration de l'entrepreneuriat vert
              greenEntrepreneurshipIntegration: {
                type: Type.OBJECT,
                properties: {
                  innovativeBusinessModels: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        title: { type: Type.STRING },
                        description: { type: Type.STRING },
                        feasibility: { type: Type.STRING },
                        economicBenefit: { type: Type.STRING }
                      },
                      required: ["title", "description", "feasibility", "economicBenefit"]
                    }
                  },
                  differentiationFactor: { type: Type.STRING },
                  circularValueProposition: { type: Type.STRING }
                },
                required: ["innovativeBusinessModels", "differentiationFactor", "circularValueProposition"]
              },
              // 5. Alignement ODD
              sdgAlignment: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    oddNumber: { type: Type.INTEGER, description: "Num\xE9ro de l'ODD (ex: 12)" },
                    title: { type: Type.STRING, description: "Titre de l'ODD" },
                    contribution: { type: Type.STRING, description: "Contribution concr\xE8te du projet" },
                    targets: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Sous-cibles ODD" }
                  },
                  required: ["oddNumber", "title", "contribution", "targets"]
                }
              },
              // 6. Indicateurs d'impact
              impactIndicators: {
                type: Type.OBJECT,
                properties: {
                  carbonFootprint: {
                    type: Type.OBJECT,
                    properties: {
                      functionalUnit: { type: Type.STRING },
                      totalCarbonKgCO2e: { type: Type.NUMBER },
                      benchmarkComparison: {
                        type: Type.OBJECT,
                        properties: {
                          industryAverageKgCO2e: { type: Type.NUMBER },
                          ecoDesignedTargetKgCO2e: { type: Type.NUMBER },
                          commentary: { type: Type.STRING }
                        },
                        required: ["industryAverageKgCO2e", "ecoDesignedTargetKgCO2e", "commentary"]
                      },
                      lifecycleStages: {
                        type: Type.ARRAY,
                        items: {
                          type: Type.OBJECT,
                          properties: {
                            id: { type: Type.STRING },
                            name: { type: Type.STRING },
                            category: {
                              type: Type.STRING,
                              enum: ["raw_materials", "manufacturing", "packaging", "transport", "usage", "end_of_life"]
                            },
                            emissionKgCO2e: { type: Type.NUMBER },
                            percentage: { type: Type.NUMBER },
                            description: { type: Type.STRING },
                            reductionOpportunity: { type: Type.STRING }
                          },
                          required: ["id", "name", "category", "emissionKgCO2e", "percentage", "description", "reductionOpportunity"]
                        }
                      },
                      highImpactDecarbonizationActions: {
                        type: Type.ARRAY,
                        items: {
                          type: Type.OBJECT,
                          properties: {
                            action: { type: Type.STRING },
                            estimatedReductionPct: { type: Type.NUMBER },
                            priority: { type: Type.STRING, enum: ["P1", "P2", "P3"] }
                          },
                          required: ["action", "estimatedReductionPct", "priority"]
                        }
                      }
                    },
                    required: ["functionalUnit", "totalCarbonKgCO2e", "benchmarkComparison", "lifecycleStages", "highImpactDecarbonizationActions"]
                  },
                  circularityRate: { type: Type.STRING },
                  wasteAvoided: { type: Type.STRING },
                  waterPreservation: { type: Type.STRING },
                  localJobsProjection: { type: Type.STRING },
                  keyMetrics: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        label: { type: Type.STRING },
                        value: { type: Type.STRING },
                        unit: { type: Type.STRING },
                        interpretation: { type: Type.STRING }
                      },
                      required: ["label", "value", "unit", "interpretation"]
                    }
                  }
                },
                required: ["carbonFootprint", "circularityRate", "wasteAvoided", "waterPreservation", "localJobsProjection", "keyMetrics"]
              },
              // 7. Financements et labels verts envisageables
              greenFinancingAndLabels: {
                type: Type.OBJECT,
                properties: {
                  labels: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        name: { type: Type.STRING },
                        category: { type: Type.STRING },
                        whyItMatters: { type: Type.STRING },
                        eligibilityCriteria: { type: Type.STRING }
                      },
                      required: ["name", "category", "whyItMatters", "eligibilityCriteria"]
                    }
                  },
                  fundings: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        source: { type: Type.STRING },
                        program: { type: Type.STRING },
                        amountOrAid: { type: Type.STRING },
                        conditions: { type: Type.STRING }
                      },
                      required: ["source", "program", "amountOrAid", "conditions"]
                    }
                  }
                },
                required: ["labels", "fundings"]
              },
              // 8. Plan d'action prioritaire
              priorityActionPlan: {
                type: Type.OBJECT,
                properties: {
                  phase1_0to3months: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        timeframe: { type: Type.STRING },
                        title: { type: Type.STRING },
                        description: { type: Type.STRING },
                        priorityLevel: { type: Type.STRING, enum: ["Haute", "Moyenne", "Strat\xE9gique"] },
                        expectedDeliverable: { type: Type.STRING }
                      },
                      required: ["timeframe", "title", "description", "priorityLevel", "expectedDeliverable"]
                    }
                  },
                  phase2_3to6months: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        timeframe: { type: Type.STRING },
                        title: { type: Type.STRING },
                        description: { type: Type.STRING },
                        priorityLevel: { type: Type.STRING, enum: ["Haute", "Moyenne", "Strat\xE9gique"] },
                        expectedDeliverable: { type: Type.STRING }
                      },
                      required: ["timeframe", "title", "description", "priorityLevel", "expectedDeliverable"]
                    }
                  },
                  phase3_6to12months: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        timeframe: { type: Type.STRING },
                        title: { type: Type.STRING },
                        description: { type: Type.STRING },
                        priorityLevel: { type: Type.STRING, enum: ["Haute", "Moyenne", "Strat\xE9gique"] },
                        expectedDeliverable: { type: Type.STRING }
                      },
                      required: ["timeframe", "title", "description", "priorityLevel", "expectedDeliverable"]
                    }
                  }
                },
                required: ["phase1_0to3months", "phase2_3to6months", "phase3_6to12months"]
              }
            },
            required: [
              "projectSynthesis",
              "environmentalAspects",
              "socialAspects",
              "greenEntrepreneurshipIntegration",
              "sdgAlignment",
              "impactIndicators",
              "greenFinancingAndLabels",
              "priorityActionPlan"
            ]
          }
        }
      });
      const textOutput = response.text || "{}";
      parsedData = JSON.parse(textOutput);
      if (parsedData.needsInfo) {
        console.log(`[Audit Engine] Le mod\xE8le demande plus d'informations.`);
        res.json({ success: true, needsInfo: true, questions: parsedData.questions });
        return;
      }
      console.log(`[Audit Engine] Diagnostic analys\xE9 avec succ\xE8s via ${modelUsed} !`);
    } catch (aiErr) {
      console.warn(
        "[Audit Engine] Saturation temporaire de l'API Gemini (503). Activation imm\xE9diate du moteur expert d\xE9terministe :",
        aiErr?.message
      );
      parsedData = generateExpertAuditFallback(title, description, location || "Tunisie / Europe");
    }
    if (parsedData && !parsedData.needsInfo) {
      auditContentCache.set(cacheKey, {
        data: parsedData,
        cachedAt: Date.now()
      });
    }
    const finalSector = parsedData.detectedSector || sector || "\xC9conomie Circulaire & \xC9co-innovation";
    const auditResult = {
      id: `proj_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      title,
      sector: finalSector,
      description,
      location: location || "Non sp\xE9cifi\xE9",
      targetAudience: targetAudience || "B2B / B2C \xC9co-responsable",
      businessModel: businessModel || "\xC9conomie Circulaire & Vente directe",
      lifeCycleDetails: lifeCycleDetails || "",
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      ...parsedData
    };
    if (req.body.shouldSave) {
      await saveProjectToFirestore(auditResult);
    }
    res.json({ success: true, data: auditResult });
  } catch (error) {
    console.error("Error in /api/analyze:", error);
    res.status(500).json({
      success: false,
      error: error?.message || "Une erreur est survenue lors de l'analyse environnementale."
    });
  }
});
app.post("/api/chat", async (req, res) => {
  try {
    const { message, history, projectContext } = req.body;
    if (!message || typeof message !== "string") {
      res.status(400).json({ success: false, error: "Message requis." });
      return;
    }
    const systemInstruction = `
Tu es un Expert Environnemental Senior avec plus de 20 ans d'exp\xE9rience internationale dans le pilotage de projets industriels et \xE9cologiques complexes. Tu es reconnu pour ton intransigeance \xE9thique, ta franchise absolue et ton \xE9valuation sinc\xE8re et sans concession des impacts \xE9cologiques r\xE9els (z\xE9ro greenwashing). Tu ma\xEEtrises parfaitement :
- **ISO 14001** : M\xE9thodologie d'Analyse Environnementale et de hi\xE9rarchisation des Aspects Environnementaux Significatifs (AES) selon la matrice **Criticit\xE9 = (Fr\xE9quence \xD7 Gravit\xE9 \xD7 Sensibilit\xE9) / Ma\xEEtrise**.
- **Guide & Panorama Institut Agro Montpellier (HAL)** : S\xE9lection et combinaison multi-m\xE9thodes d'\xE9valuation environnementale : ACV multi-crit\xE8res (ISO 14040/14044), Bilan Carbone (GHG Protocol Scopes 1-2-3), MFA (Analyse des Flux de Mati\xE8re), ERA (\xC9valuation des Risques \xC9cotoxiques), AMC/MCDA (Analyse Multicrit\xE8re de D\xE9cision) et MEA/IPBES (Valuation des Services \xC9cosyst\xE9miques).
- **Guide OSS (Observatoire du Sahara et du Sahel) & REPSAHEL** : \xC9co-responsabilit\xE9, pr\xE9servation stricte des ressources en eau en milieu aride, lutte contre la d\xE9gradation des sols et r\xE9silience hydro-climatique.
- **Normes Internationales** : CSRD, Taxonomie UE, ISO 14040/14044 (ACV), GHG Protocol (Scopes 1-2-3), lois AGEC/ESPR.

Ton expertise couvre :
1. **\xC9valuation Sinc\xE8re des AES & Impacts \xC9cologiques :** Analyse critique des cycles de vie, hi\xE9rarchisation norm\xE9e des impacts (ISO 14001), identification des externalit\xE9s n\xE9gatives cach\xE9es, des risques de transfert de pollution et des v\xE9ritables gains nets.
2. **Gestion de l'Eau & R\xE9silience Aride (Directives OSS) :** \xC9valuation de la pression sur les nappes phr\xE9atiques, recyclage en boucle ferm\xE9e ZLD (Zero Liquid Discharge), lutte contre l'\xE9rosion et valorisation \xE9co-citoyenne.
3. **Transition Bas-Carbone & Crit\xE8res ESG :** Comptabilit\xE9 carbone (Scopes 1, 2, 3), trajectoires SBTi, crit\xE8res ESG et int\xE9gration extra-financi\xE8re.
4. **Conformit\xE9 R\xE9glementaire Nationale et Internationale :** CSRD, taxonomie europ\xE9enne, r\xE9glementations environnementales r\xE9gionales (CITET, ANME, directives d'implantation).
5. **Pilotage de Projets & Financement Vert :** Structuration technique, plans de r\xE9duction d'urgence, ing\xE9nierie de financement vert (ADEME, Bpifrance, FODEP, BERD, Fonds Vert).

*** R\xC8GLE \xC9THIQUE & S\xC9CURIT\xC9 ABSOLUE : ***
Si la question ou le projet abord\xE9 concerne des technologies militaires, des armes, des substances illicites, de la d\xE9sinformation \xE9cologique ou toute activit\xE9 ayant une finalit\xE9 destructrice pour l'environnement ou l'humain, tu refuses cat\xE9goriquement et directement, en expliquant les raisons scientifiques et \xE9thiques de ton refus.

${projectContext ? `
Contexte technique actuel du projet audit\xE9 :
- Titre : ${projectContext.title || "Non sp\xE9cifi\xE9"}
- Lieu d'implantation : ${projectContext.location || "Non sp\xE9cifi\xE9"}
- Secteur : ${projectContext.sector || "Non sp\xE9cifi\xE9"}
- Description : ${projectContext.description || "Non sp\xE9cifi\xE9"}
- Scores d'impact : Environnement ${projectContext.projectSynthesis?.scores?.environmental ?? "--"}/100, Social ${projectContext.projectSynthesis?.scores?.social ?? "--"}/100, Circularit\xE9 ${projectContext.projectSynthesis?.scores?.circularity ?? "--"}/100, Global ${projectContext.projectSynthesis?.scores?.globalScore ?? "--"}/100
- Empreinte carbone produit : ${projectContext.impactIndicators?.carbonFootprint?.totalCarbonKgCO2e ?? "--"} kg CO2e / unit\xE9
` : ""}

R\xE9ponds en fran\xE7ais avec un ton professionnel, direct, hautement qualifi\xE9, analytique et sans complaisance. Apporte des conseils d'expert aguerri, des analyses de risques rigoureuses et des recommandations pratiques bas\xE9es sur le terrain.
`;
    const contents = [];
    if (Array.isArray(history)) {
      for (const item of history.slice(-8)) {
        if (item.role === "user" || item.role === "model") {
          contents.push({
            role: item.role,
            parts: [{ text: item.content }]
          });
        }
      }
    }
    contents.push({
      role: "user",
      parts: [{ text: message }]
    });
    let reply = "";
    try {
      const { response, modelUsed } = await generateContentWithResilience({
        contents,
        preferredModels: ["gemini-3.8-flash", "gemini-3.1-flash-lite"],
        singleAttemptTimeoutMs: 1e4,
        totalTimeoutMs: 15e3,
        config: {
          systemInstruction,
          temperature: 0.7
        }
      });
      reply = response.text || "D\xE9sol\xE9, je n'ai pas pu g\xE9n\xE9rer de r\xE9ponse.";
      console.log(`[Chat Engine] R\xE9ponse conversationnelle g\xE9n\xE9r\xE9e avec ${modelUsed}`);
    } catch (aiErr) {
      console.warn(
        "[Chat Engine] Surcharge temporaire des mod\xE8les Gemini (503). G\xE9n\xE9ration d'une r\xE9ponse experte de repli :",
        aiErr?.message
      );
      reply = `### Conseil de l'\xC9co-Conseiller Vert'Id\xE9e

Pour votre projet ${projectContext?.title ? `**\xAB ${projectContext.title} \xBB**` : "d'entrepreneuriat vert"},

Concernant votre demande : *\xAB ${message} \xBB* :

1. **Optimisation de l'empreinte & ACV :** Ciblez les postes les plus \xE9metteurs d\xE8s la conception (mati\xE8res bio-sourc\xE9es ou recycl\xE9es en circuits courts, r\xE9duction des consommations \xE9nerg\xE9tiques).
2. **Partenaires & P\xE9pini\xE8res :** Appuyez-vous sur les structures locales comme l'**APII** et le r\xE9seau des p\xE9pini\xE8res **RNPE** pour b\xE9n\xE9ficier d'un h\xE9bergement, d'un coaching et d'all\xE8gements fiscaux d'amor\xE7age.
3. **Dispositifs de financement vert :** Explorez le Fonds de Transition \xC9nerg\xE9tique (**FTE / ANME**), les programmes de l'Union Europ\xE9enne (**SwitchMed / Green Deal**) et les pr\xEAts d'honneur \xE0 impact.
4. **Labellisation & Cr\xE9dibilit\xE9 :** Pr\xE9parez un dossier pour un label reconnu (**ISO 14001**, **B-Corp**, **\xC9colabel**) afin d'acc\xE9l\xE9rer vos contrats B2B et justifier de votre impact environnemental r\xE9el.

*Note : Les serveurs de calcul IA centraux connaissent actuellement un pic passager de forte affluence (503), mais vos donn\xE9es et diagnostics demeurent 100% s\xE9curis\xE9s et consultables.*`;
    }
    res.json({ success: true, reply });
  } catch (err) {
    console.error("Error in /api/chat:", err);
    res.status(500).json({
      success: false,
      error: err?.message || "Erreur lors de la conversation avec l'assistant IA."
    });
  }
});
async function startServer() {
  const distPath = path.resolve(process.cwd(), "dist");
  const isProduction = fs.existsSync(distPath);
  if (!isProduction) {
    console.log("Running in development mode (Vite middleware)");
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false
      },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    console.log("Running in production mode (static serving)");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }
  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
  server.on("error", (err) => {
    if (err.code === "EADDRINUSE") {
      console.error(`Port ${PORT} is already in use. Make sure no other process is running.`);
      process.exit(1);
    } else {
      console.error("Server error:", err);
    }
  });
}
startServer();
