import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  AlignmentType,
  ShadingType,
} from 'docx';
import type { AssistantChatMessage, ProjectAudit } from '../types.ts';
import {
  computeCarbonUncertainty,
  getFactorDenominator,
  normalizeProjectAudit,
} from './normalizeProject.ts';

const PRIMARY_COLOR = '047857'; // emerald-700
const SECONDARY_COLOR = '065F46'; // emerald-800
const TEXT_MUTED = '4B5563'; // gray-600
const BG_LIGHT = 'F0FDF4'; // emerald-50
const BG_HEADER = '064E3B'; // emerald-900

export async function generateWordReport(rawProject: ProjectAudit): Promise<Blob> {
  const project = normalizeProjectAudit(rawProject);

  const dateFormatted = new Date(project.createdAt || Date.now()).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const doc = new Document({
    sections: [
      {
        properties: {},
        children: [
          // Header / Cover banner
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 200, after: 100 },
            children: [
              new TextRun({
                text: 'RAPPORT D\'EXPERTISE ENVIRONNEMENTALE & TRANSITION ÉCOLOGIQUE',
                size: 20,
                bold: true,
                color: PRIMARY_COLOR,
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 0, after: 150 },
            children: [
              new TextRun({
                text: project.title || 'Projet Vert',
                size: 32,
                bold: true,
                color: '111827',
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 0, after: 350 },
            children: [
              new TextRun({
                text: `Secteur : ${project.sector || 'Économie Circulaire'}  |  Lieu : ${project.location || 'Tunisie'}  |  Date : ${dateFormatted}  |  Expertise Vert_Idée`,
                size: 18,
                italics: true,
                color: TEXT_MUTED,
              }),
            ],
          }),

          // ==========================================
          // Description et Présentation du Projet
          // ==========================================
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 300, after: 120 },
            children: [
              new TextRun({
                text: 'Présentation & Description du Projet',
                bold: true,
                color: SECONDARY_COLOR,
                size: 24,
              }),
            ],
          }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              createKeyValueRow('Nom du projet', project.title),
              createKeyValueRow('Secteur d\'activité', project.sector),
              createKeyValueRow('Lieu d\'implantation', project.location || 'Tunisie'),
              ...(project.targetAudience ? [createKeyValueRow('Public cible & Marché', project.targetAudience)] : []),
              ...(project.businessModel ? [createKeyValueRow('Modèle d\'affaires initial', project.businessModel)] : []),
              ...(project.lifeCycleDetails ? [createKeyValueRow('Périmètre Cycle de Vie', project.lifeCycleDetails)] : []),
            ],
          }),
          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 180, after: 80 },
            children: [
              new TextRun({
                text: 'Descriptif opérationnel et technique du projet :',
                bold: true,
                color: PRIMARY_COLOR,
                size: 20,
              }),
            ],
          }),
          ...createDescriptionParagraphs(project.description),

          // ==========================================
          // 1. Synthèse du projet
          // ==========================================
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 300, after: 120 },
            children: [
              new TextRun({
                text: '1. Synthèse du projet',
                bold: true,
                color: SECONDARY_COLOR,
                size: 24,
              }),
            ],
          }),
          new Paragraph({
            spacing: { before: 60, after: 120 },
            children: [
              new TextRun({
                text: project.projectSynthesis?.summary || 'Synthèse non disponible.',
                size: 20,
                italics: true,
              }),
            ],
          }),
          new Paragraph({
            spacing: { before: 60, after: 160 },
            children: [
              new TextRun({ text: 'Vision stratégique à long terme : ', bold: true, color: PRIMARY_COLOR }),
              new TextRun({ text: project.projectSynthesis?.vision || 'Vision stratégique en cours de structuration.' }),
            ],
          }),
          // Table of scores
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  createHeaderCell('Pilier d\'Évaluation'),
                  createHeaderCell('Score / 100'),
                  createHeaderCell('Niveau de Maturité Écologique'),
                ],
              }),
              createScoreRow('Score Environnemental Global', project.projectSynthesis?.scores?.environmental ?? 50),
              createScoreRow('Score Social & Sociétal (RSE)', project.projectSynthesis?.scores?.social ?? 50),
              createScoreRow('Économie Circulaire & Réemploi', project.projectSynthesis?.scores?.circularity ?? 50),
              createScoreRow('Innovation & Faisabilité technique', project.projectSynthesis?.scores?.innovationFeasibility ?? project.projectSynthesis?.scores?.carbonMaturity ?? 50),
              createScoreRow('NOTE GLOBALE D\'IMPACT', project.projectSynthesis?.scores?.globalScore ?? 50, true),
            ],
          }),

          // ==========================================
          // 2. Aspects & impacts environnementaux
          // ==========================================
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 120 },
            children: [
              new TextRun({
                text: '2. Aspects & impacts environnementaux',
                bold: true,
                color: SECONDARY_COLOR,
                size: 24,
              }),
            ],
          }),
          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 150, after: 80 },
            children: [
              new TextRun({ text: 'Impacts environnementaux positifs & atouts écologiques :', bold: true, color: PRIMARY_COLOR, size: 20 }),
            ],
          }),
          ...(project.environmentalAspects?.strengths || []).map(
            (s) =>
              new Paragraph({
                bullet: { level: 0 },
                spacing: { before: 40, after: 40 },
                children: [new TextRun({ text: s, size: 20 })],
              })
          ),
          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 150, after: 80 },
            children: [
              new TextRun({ text: 'Impacts environnementaux négatifs & vigilances (AES ISO 14001) :', bold: true, color: 'DC2626', size: 20 }),
            ],
          }),
          ...(project.environmentalAspects?.criticalRisks || []).map(
            (r) =>
              new Paragraph({
                bullet: { level: 0 },
                spacing: { before: 40, after: 40 },
                children: [new TextRun({ text: r, size: 20 })],
              })
          ),
          // ACV Table
          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 200, after: 100 },
            children: [
              new TextRun({
                text: 'Analyse du Cycle de Vie (ACV ISO 14040/14044) & Matrice des Impacts :',
                bold: true,
                color: SECONDARY_COLOR,
                size: 20,
              }),
            ],
          }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  createHeaderCell('Étape du Cycle'),
                  createHeaderCell('Niveau d\'Impact'),
                  createHeaderCell('Diagnostic des Impacts & Enjeux'),
                  createHeaderCell('Levier d\'Éco-conception & Atténuation'),
                ],
              }),
              ...(project.environmentalAspects?.lifecycleAssessment || []).map(
                (item) =>
                  new TableRow({
                    children: [
                      createDataCell(item.phase || '', true),
                      createDataCell((item.impactLevel || 'moyen').toUpperCase()),
                      createDataCell(item.details || ''),
                      createDataCell(item.ecoDesignLever || ''),
                    ],
                  })
              ),
            ],
          }),
          // Circular economy & norms
          new Paragraph({
            spacing: { before: 150, after: 60 },
            children: [
              new TextRun({ text: 'Impacts circulaires & évitement de déchets : ', bold: true, color: PRIMARY_COLOR }),
              new TextRun({ text: (project.environmentalAspects?.circularEconomy?.strategies || []).join(' ; ') }),
            ],
          }),
          new Paragraph({
            spacing: { before: 60, after: 60 },
            children: [
              new TextRun({ text: 'Impact sur la valorisation des coproduits & déchets : ', bold: true }),
              new TextRun({ text: project.environmentalAspects?.circularEconomy?.wasteValorization || '' }),
            ],
          }),
          new Paragraph({
            spacing: { before: 60, after: 60 },
            children: [
              new TextRun({ text: 'Impact sur la durabilité & réparabilité : ', bold: true }),
              new TextRun({ text: project.environmentalAspects?.circularEconomy?.durabilityRepair || '' }),
            ],
          }),
          new Paragraph({
            spacing: { before: 60, after: 150 },
            children: [
              new TextRun({ text: 'Cadre réglementaire & normes de maîtrise des impacts : ', bold: true }),
              new TextRun({ text: (project.environmentalAspects?.regulationsAndNorms || []).join(' ; ') }),
            ],
          }),

          // ==========================================
          // 3. Aspects & impacts sociaux et sociétaux
          // ==========================================
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 120 },
            children: [
              new TextRun({
                text: '3. Aspects & impacts sociaux et sociétaux',
                bold: true,
                color: SECONDARY_COLOR,
                size: 24,
              }),
            ],
          }),
          ...(project.socialAspects?.socialImpacts || []).map(
            (item) =>
              new Paragraph({
                bullet: { level: 0 },
                spacing: { before: 40, after: 40 },
                children: [new TextRun({ text: item, size: 20 })],
              })
          ),
          new Paragraph({
            spacing: { before: 100, after: 60 },
            children: [
              new TextRun({ text: 'Impact économique local & emplois : ', bold: true }),
              new TextRun({ text: project.socialAspects?.localEconomy || '' }),
            ],
          }),
          new Paragraph({
            spacing: { before: 60, after: 60 },
            children: [
              new TextRun({ text: 'Impact sociétal & gouvernance éthique (ISO 26000) : ', bold: true }),
              new TextRun({ text: project.socialAspects?.governanceAndEthics || '' }),
            ],
          }),
          new Paragraph({
            spacing: { before: 60, after: 120 },
            children: [
              new TextRun({ text: 'Impact sur l\'accompagnement à la transition juste : ', bold: true }),
              new TextRun({ text: project.socialAspects?.justTransition || '' }),
            ],
          }),

          // ==========================================
          // 4. Intégration de l'entrepreneuriat vert
          // ==========================================
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 80 },
            children: [
              new TextRun({
                text: '4. Intégration de l\'entrepreneuriat vert & Modèles circulaires',
                bold: true,
                color: SECONDARY_COLOR,
                size: 24,
              }),
            ],
          }),
          new Paragraph({
            spacing: { before: 40, after: 100 },
            children: [
              new TextRun({
                text: 'Cadres normatifs : ISO 59004:2024 / ISO 59020 | Cadre 9R (R0 à R9) | Économie de la Fonctionnalité (EFC) | CSRD ESRS E5',
                italics: true,
                size: 16,
                color: TEXT_MUTED,
              }),
            ],
          }),
          ...(project.greenEntrepreneurshipIntegration?.circularArchetype
            ? [
                new Paragraph({
                  spacing: { before: 40, after: 60 },
                  children: [
                    new TextRun({ text: 'Archétype Circulaire Dominant : ', bold: true, color: PRIMARY_COLOR }),
                    new TextRun({ text: project.greenEntrepreneurshipIntegration.circularArchetype }),
                  ],
                }),
              ]
            : []),
          ...(project.greenEntrepreneurshipIntegration?.iso59000Compliance
            ? [
                new Paragraph({
                  spacing: { before: 40, after: 80 },
                  children: [
                    new TextRun({ text: 'Conformité Cadre ISO 59000 : ', bold: true, color: PRIMARY_COLOR }),
                    new TextRun({ text: project.greenEntrepreneurshipIntegration.iso59000Compliance }),
                  ],
                }),
              ]
            : []),
          new Paragraph({
            spacing: { before: 60, after: 60 },
            children: [
              new TextRun({ text: 'Facteur de différenciation compétitive verte : ', bold: true, color: PRIMARY_COLOR }),
              new TextRun({ text: project.greenEntrepreneurshipIntegration?.differentiationFactor || '' }),
            ],
          }),
          new Paragraph({
            spacing: { before: 60, after: 60 },
            children: [
              new TextRun({ text: 'Proposition de valeur circulaire : ', bold: true, color: PRIMARY_COLOR }),
              new TextRun({ text: project.greenEntrepreneurshipIntegration?.circularValueProposition || '' }),
            ],
          }),
          ...(project.greenEntrepreneurshipIntegration?.competitiveMoat
            ? [
                new Paragraph({
                  spacing: { before: 60, after: 120 },
                  children: [
                    new TextRun({ text: 'Barrière à l\'entrée écologique (Competitive Moat) : ', bold: true, color: PRIMARY_COLOR }),
                    new TextRun({ text: project.greenEntrepreneurshipIntegration.competitiveMoat }),
                  ],
                }),
              ]
            : []),
          ...(project.greenEntrepreneurshipIntegration?.environmentalAssets && project.greenEntrepreneurshipIntegration.environmentalAssets.length > 0
            ? [
                new Paragraph({
                  heading: HeadingLevel.HEADING_2,
                  spacing: { before: 180, after: 80 },
                  children: [
                    new TextRun({ text: 'Atouts environnementaux majeurs du modèle vert', bold: true, size: 20, color: SECONDARY_COLOR }),
                  ],
                }),
                ...project.greenEntrepreneurshipIntegration.environmentalAssets.map(
                  (asset) =>
                    new Paragraph({
                      spacing: { before: 40, after: 60 },
                      children: [
                        new TextRun({ text: '✓ ', bold: true, color: PRIMARY_COLOR }),
                        new TextRun({ text: asset, color: '111827' }),
                      ],
                    })
                ),
              ]
            : []),
          ...(project.greenEntrepreneurshipIntegration?.improvementAxes && project.greenEntrepreneurshipIntegration.improvementAxes.length > 0
            ? [
                new Paragraph({
                  heading: HeadingLevel.HEADING_2,
                  spacing: { before: 200, after: 80 },
                  children: [
                    new TextRun({ text: 'Axes d\'amélioration prioritaires & Leviers d\'éco-transition', bold: true, size: 20, color: SECONDARY_COLOR }),
                  ],
                }),
                new Table({
                  width: { size: 100, type: WidthType.PERCENTAGE },
                  rows: [
                    new TableRow({
                      children: [
                        createHeaderCell('Chantier d\'amélioration'),
                        createHeaderCell('Levier opérationnel'),
                        createHeaderCell('Gain environnemental mesuré'),
                        createHeaderCell('Impact économique / ROI'),
                      ],
                    }),
                    ...(project.greenEntrepreneurshipIntegration?.improvementAxes || []).map((item) =>
                      new TableRow({
                        children: [
                          createDataCell(`${item.axis || ''}${item.priority ? `\n[Priorité : ${item.priority}]` : ''}`, true),
                          createDataCell(item.lever || ''),
                          createDataCell(item.environmentalGain || ''),
                          createDataCell(item.economicPayoff || '', true),
                        ],
                      })
                    ),
                  ],
                }),
              ]
            : []),
          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 180, after: 80 },
            children: [
              new TextRun({ text: 'Modèles économiques innovants & Stratégies 9R', bold: true, size: 20, color: SECONDARY_COLOR }),
            ],
          }),
          ...(project.greenEntrepreneurshipIntegration?.innovativeBusinessModels || []).map(
            (bm) => {
              const details = [
                bm.archetype ? `Archétype: ${bm.archetype}` : null,
                bm.strategy9R ? `9R: ${bm.strategy9R}` : null,
                bm.feasibility ? `Faisabilité: ${bm.feasibility}` : null,
                bm.targetCustomer ? `Cible: ${bm.targetCustomer}` : null,
                bm.revenueStream ? `Revenus: ${bm.revenueStream}` : null,
                bm.paybackPeriod ? `Payback: ${bm.paybackPeriod}` : null,
              ].filter(Boolean).join(' | ');

              return new Paragraph({
                spacing: { before: 80, after: 80 },
                children: [
                  new TextRun({ text: `• ${bm.title || 'Modèle'}`, bold: true, color: '111827' }),
                  new TextRun({ text: details ? ` [${details}]` : '', italics: true, color: TEXT_MUTED }),
                  new TextRun({ text: `\n  Description : ${bm.description || ''}` }),
                  new TextRun({ text: `\n  Impact économique : ${bm.economicBenefit || ''}`, bold: true, color: PRIMARY_COLOR }),
                ],
              });
            }
          ),
          // Monetization mechanisms table
          ...(project.greenEntrepreneurshipIntegration?.monetizationMechanisms && project.greenEntrepreneurshipIntegration.monetizationMechanisms.length > 0
            ? [
                new Paragraph({
                  heading: HeadingLevel.HEADING_2,
                  spacing: { before: 200, after: 80 },
                  children: [
                    new TextRun({ text: 'Mécanismes de monétisation circulaire & Cash-Flow', bold: true, size: 20, color: SECONDARY_COLOR }),
                  ],
                }),
                new Table({
                  width: { size: 100, type: WidthType.PERCENTAGE },
                  rows: [
                    new TableRow({
                      children: [
                        createHeaderCell('Levier & Catégorie'),
                        createHeaderCell('Description opérationnelle'),
                        createHeaderCell('Impact Cash-Flow net'),
                      ],
                    }),
                    ...(project.greenEntrepreneurshipIntegration?.monetizationMechanisms || []).map((m) =>
                      new TableRow({
                        children: [
                          createDataCell(`${m.name || ''}\n[${m.category || ''}]`, true),
                          createDataCell(m.description || ''),
                          createDataCell(m.directCashFlowImpact || m.cashFlowImpact || 'Gain économique vérifié', true),
                        ],
                      })
                    ),
                  ],
                }),
              ]
            : []),
          // Industrial Symbiosis table
          ...(project.greenEntrepreneurshipIntegration?.industrialSymbiosis && project.greenEntrepreneurshipIntegration.industrialSymbiosis.length > 0
            ? [
                new Paragraph({
                  heading: HeadingLevel.HEADING_2,
                  spacing: { before: 200, after: 80 },
                  children: [
                    new TextRun({ text: 'Écologie Industrielle & Territoriale (EIT) — Symbioses', bold: true, size: 20, color: SECONDARY_COLOR }),
                  ],
                }),
                new Table({
                  width: { size: 100, type: WidthType.PERCENTAGE },
                  rows: [
                    new TableRow({
                      children: [
                        createHeaderCell('Partenaire territorial'),
                        createHeaderCell('Flux échangé (Matière/Énergie)'),
                        createHeaderCell('Bénéfice environnemental'),
                        createHeaderCell('Valeur économique créée'),
                      ],
                    }),
                    ...(project.greenEntrepreneurshipIntegration?.industrialSymbiosis || []).map((s) =>
                      new TableRow({
                        children: [
                          createDataCell(s.partner || s.partnerType || 'Acteur territorial', true),
                          createDataCell(s.fluxType || s.inputOutputFlow || 'Flux valorisé'),
                          createDataCell(s.environmentalBenefit || s.description || ''),
                          createDataCell(s.mutualBenefit || s.economicValue || 'Synergie mutuelle', true),
                        ],
                      })
                    ),
                  ],
                }),
              ]
            : []),
          // Decoupling metrics table
          ...(project.greenEntrepreneurshipIntegration?.decouplingMetrics && project.greenEntrepreneurshipIntegration.decouplingMetrics.length > 0
            ? [
                new Paragraph({
                  heading: HeadingLevel.HEADING_2,
                  spacing: { before: 200, after: 80 },
                  children: [
                    new TextRun({ text: 'Indicateurs de découplage ressources (ISO 59020)', bold: true, size: 20, color: SECONDARY_COLOR }),
                  ],
                }),
                new Table({
                  width: { size: 100, type: WidthType.PERCENTAGE },
                  rows: [
                    new TableRow({
                      children: [
                        createHeaderCell('Indicateur de ressource'),
                        createHeaderCell('Objectif circulaire'),
                        createHeaderCell('Méthode / Référence'),
                        createHeaderCell('Facteur de découplage'),
                      ],
                    }),
                    ...(project.greenEntrepreneurshipIntegration?.decouplingMetrics || []).map((d) =>
                      new TableRow({
                        children: [
                          createDataCell(d.indicator || d.metric || 'Indicateur', true),
                          createDataCell(d.targetValue || d.target || 'N/A', true),
                          createDataCell(d.methodology || d.baselineLinear || 'ISO 59020'),
                          createDataCell(d.decouplingFactor || 'Rupture linéaire', true),
                        ],
                      })
                    ),
                  ],
                }),
              ]
            : []),

          // ==========================================
          // 5. Alignement ODD
          // ==========================================
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 120 },
            children: [
              new TextRun({
                text: '5. Alignement ODD (Objectifs de Développement Durable)',
                bold: true,
                color: SECONDARY_COLOR,
                size: 24,
              }),
            ],
          }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  createHeaderCell('ODD & Niveau'),
                  createHeaderCell('Intitulé de l\'Objectif'),
                  createHeaderCell('Contribution concrète & KPIs'),
                  createHeaderCell('Sous-cibles ONU & Garantie DNSH'),
                ],
              }),
              ...(project.sdgAlignment || []).map((odd) => {
                const kpisText = odd?.kpis && odd.kpis.length > 0 ? `\n\nKPIs suivis :\n• ${odd.kpis.join('\n• ')}` : '';
                const targetsDetailText =
                  odd?.targetsDetail && odd.targetsDetail.length > 0
                    ? odd.targetsDetail
                        .map((td) => `• Cible ${td?.code || ''} : ${td?.title || ''}${td?.indicator ? ` [${td.indicator}]` : ''}${td?.targetKpi ? ` → Objectif : ${td.targetKpi}` : ''}`)
                        .join('\n')
                    : (odd?.targets || []).join(', ');
                const dnshText = odd?.dnshAssessment ? `\n\nAnalyse DNSH (Non-nuisance) :\n${odd.dnshAssessment}` : '';
                const standardsText = [odd?.griStandards?.join(', '), odd?.csrdEsrs].filter(Boolean).join(' | ');

                return new TableRow({
                  children: [
                    createDataCell(`ODD ${odd?.oddNumber || 0}\n[${odd?.level || 'Direct'}]${standardsText ? `\n(${standardsText})` : ''}`, true),
                    createDataCell(odd?.title || '', true),
                    createDataCell(`${odd?.contribution || ''}${kpisText}`),
                    createDataCell(`${targetsDetailText}${dnshText}`),
                  ],
                });
              }),
            ],
          }),

          // ==========================================
          // 6. Indicateurs d'impact
          // ==========================================
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 120 },
            children: [
              new TextRun({
                text: '6. Indicateurs d\'impact',
                bold: true,
                color: SECONDARY_COLOR,
                size: 24,
              }),
            ],
          }),
          new Paragraph({
            spacing: { before: 60, after: 100 },
            children: [
              new TextRun({ text: 'Unité Fonctionnelle retenue : ', bold: true }),
              new TextRun({ text: project.impactIndicators?.carbonFootprint?.functionalUnit || '1 unité', italics: true }),
            ],
          }),
          new Paragraph({
            spacing: { before: 60, after: 60 },
            children: [
              new TextRun({ text: 'Empreinte Carbone Totale : ', bold: true }),
              new TextRun({
                text: `${(project.impactIndicators?.carbonFootprint?.totalCarbonKgCO2e ?? 0).toFixed(2)} kg CO2e / unité`,
                bold: true,
                color: PRIMARY_COLOR,
                size: 22,
              }),
              new TextRun({
                text: ` (Moyenne secteur : ${(project.impactIndicators?.carbonFootprint?.benchmarkComparison?.industryAverageKgCO2e ?? 0).toFixed(2)} kg CO2e — Cible éco-conçue : ${(project.impactIndicators?.carbonFootprint?.benchmarkComparison?.ecoDesignedTargetKgCO2e ?? 0).toFixed(2)} kg CO2e)`,
                color: TEXT_MUTED,
              }),
            ],
          }),
          ...(() => {
            const unc = computeCarbonUncertainty(
              project.impactIndicators?.carbonFootprint?.lifecycleStages || []
            );
            if (unc.totalLines <= 0) return [];
            return [
              new Paragraph({
                spacing: { before: 20, after: 60 },
                children: [
                  new TextRun({ text: 'Traçabilité & Incertitude ADEME V23.11 : ', bold: true }),
                  new TextRun({
                    text: `${unc.verifiedCount}/${unc.totalLines} postes vérifiés sur le référentiel ADEME V23.11 — Incertitude propagée : ±${unc.relativePct}% [${unc.minKgCO2e.toFixed(2)} – ${unc.maxKgCO2e.toFixed(2)} kg CO2e].`,
                    color: TEXT_MUTED,
                  }),
                ],
              }),
            ];
          })(),
          // Performance vs Moyenne Secteur
          (() => {
            const totalKg = project.impactIndicators?.carbonFootprint?.totalCarbonKgCO2e ?? 0;
            const indKg = project.impactIndicators?.carbonFootprint?.benchmarkComparison?.industryAverageKgCO2e ?? 0;
            const isExcessDoc = indKg > 0 && totalKg > indKg;
            const pctDoc = indKg > 0 ? Math.abs(Math.round(((totalKg - indKg) / indKg) * 100)) : 0;
            const deltaKgDoc = Math.abs(totalKg - indKg).toFixed(2);
            return new Paragraph({
              spacing: { before: 40, after: 120 },
              children: [
                new TextRun({ text: 'Performance vs Moyenne Secteur : ', bold: true }),
                new TextRun({
                  text: isExcessDoc
                    ? `+${pctDoc}% de sur-émissions (${deltaKgDoc} kg CO2e excédentaire / unité — Déficit sectoriel critique)`
                    : `-${pctDoc}% d'émissions évitées (${deltaKgDoc} kg CO2e évités / unité — Surperformance bas-carbone)`,
                  bold: true,
                  color: isExcessDoc ? 'DC2626' : PRIMARY_COLOR,
                }),
                new TextRun({
                  text: ` — ${project.impactIndicators?.carbonFootprint?.benchmarkComparison?.commentary || ''}`,
                  italics: true,
                  color: TEXT_MUTED,
                }),
              ],
            });
          })(),
          // Carbon stages table
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  createHeaderCell('Étape du Cycle de Vie'),
                  createHeaderCell('Émissions (kg CO2e)'),
                  createHeaderCell('Part relative (%)'),
                  createHeaderCell('Levier de Décarbonation Clé'),
                ],
              }),
              ...(project.impactIndicators?.carbonFootprint?.lifecycleStages || []).map(
                (stage) =>
                  new TableRow({
                    children: [
                      createDataCell(stage.name || '', true),
                      createDataCell(`${(stage.emissionKgCO2e || 0).toFixed(2)} kg`),
                      createDataCell(`${(stage.percentage || 0).toFixed(1)} %`),
                      createDataCell(stage.reductionOpportunity || ''),
                    ],
                  })
              ),
            ],
          }),
          // Detailed factorApplications table (quantité × facteur ADEME)
          ...(() => {
            const stagesList = project.impactIndicators?.carbonFootprint?.lifecycleStages || [];
            const factorRows = stagesList.flatMap((stage) =>
              (stage.factorApplications || []).map((line) => ({ stageName: stage.name, line }))
            );
            if (!factorRows.length) return [];
            return [
              new Paragraph({
                heading: HeadingLevel.HEADING_2,
                spacing: { before: 180, after: 80 },
                children: [
                  new TextRun({
                    text: "Détail du Calcul par Facteurs ADEME (quantité × facteur) selon l'ACV :",
                    bold: true,
                    color: SECONDARY_COLOR,
                    size: 20,
                  }),
                ],
              }),
              new Table({
                width: { size: 100, type: WidthType.PERCENTAGE },
                rows: [
                  new TableRow({
                    children: [
                      createHeaderCell('Étape ACV'),
                      createHeaderCell('Poste / Intrant & ID ADEME'),
                      createHeaderCell('Quantité × Facteur'),
                      createHeaderCell('Émission (kg CO2e)'),
                      createHeaderCell('Justification technique / ACV'),
                    ],
                  }),
                  ...factorRows.map(({ stageName, line }) => {
                    const denom = getFactorDenominator(line.unit);
                    const titleParts = [
                      line.posteLabel || line.name,
                      line.posteLabel && line.posteLabel !== line.name ? `ADEME : ${line.name}` : '',
                      line.ademeId ? `ID #${line.ademeId}${line.version ? ` (v${line.version})` : ''}` : '',
                    ].filter(Boolean);
                    const justifParts = [
                      line.sourceBasis ? `[${line.sourceBasis}]` : '',
                      line.technicalJustification || '',
                      line.iso14064Category ? `(${line.iso14064Category})` : '',
                    ].filter(Boolean);
                    return new TableRow({
                      children: [
                        createDataCell(stageName || '', true),
                        createDataCell(titleParts.join('\n')),
                        createDataCell(`${line.quantity} ${denom} × ${line.factorKgCO2e.toFixed(4)} kg/${denom}`),
                        createDataCell(`${line.emissionKgCO2e.toFixed(3)} kg`, true),
                        createDataCell(justifParts.join(' ') || 'Calculé selon l’ACV et l’unité fonctionnelle.'),
                      ],
                    });
                  }),
                ],
              }),
            ];
          })(),
          // ADEME Base Carbone reference factors table
          ...(project.impactIndicators?.carbonFootprint?.ademeReferenceFactors &&
          project.impactIndicators.carbonFootprint.ademeReferenceFactors.length > 0
            ? [
                new Paragraph({
                  heading: HeadingLevel.HEADING_2,
                  spacing: { before: 180, after: 80 },
                  children: [
                    new TextRun({
                      text: "Facteurs d'émission ADEME Base Carbone® de référence :",
                      bold: true,
                      color: SECONDARY_COLOR,
                      size: 20,
                    }),
                  ],
                }),
                new Table({
                  width: { size: 100, type: WidthType.PERCENTAGE },
                  rows: [
                    new TableRow({
                      children: [
                        createHeaderCell('ID ADEME'),
                        createHeaderCell('Poste / Élément'),
                        createHeaderCell("Facteur d'émission"),
                        createHeaderCell('Localisation & Étape ACV'),
                      ],
                    }),
                    ...project.impactIndicators.carbonFootprint.ademeReferenceFactors.map((f) =>
                      new TableRow({
                        children: [
                          createDataCell(`#${f.id || 'ADEME'}`, true),
                          createDataCell(`${f.name || ''}${f.attribute ? ` (${f.attribute})` : ''}\n[${f.category || 'ADEME'}]`),
                          createDataCell(`${f.factorKgCO2e} ${f.unit}`, true),
                          createDataCell(
                            `${f.geography || 'International'}${f.uncertaintyPct ? ` (±${f.uncertaintyPct}%)` : ''}${
                              f.appliedStage ? `\nÉtape : ${f.appliedStage}` : ''
                            }`
                          ),
                        ],
                      })
                    ),
                  ],
                }),
              ]
            : []),
          // Key metrics table
          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 200, after: 100 },
            children: [
              new TextRun({ text: 'Indicateurs d\'Impact Complémentaires (Circulaire, Déchets, Eau, Emplois) :', bold: true, color: SECONDARY_COLOR, size: 20 }),
            ],
          }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  createHeaderCell('Indicateur d\'Impact'),
                  createHeaderCell('Valeur'),
                  createHeaderCell('Unité'),
                  createHeaderCell('Interprétation & Impact'),
                ],
              }),
              ...(project.impactIndicators?.keyMetrics || []).map(
                (km) =>
                  new TableRow({
                    children: [
                      createDataCell(km.label || '', true),
                      createDataCell(km.value || '', true),
                      createDataCell(km.unit || ''),
                      createDataCell(km.interpretation || ''),
                    ],
                  })
              ),
            ],
          }),
          new Paragraph({
            spacing: { before: 100, after: 50 },
            children: [
              new TextRun({ text: 'Taux de circularité : ', bold: true }),
              new TextRun({ text: project.impactIndicators?.circularityRate || '75%' }),
            ],
          }),
          new Paragraph({
            spacing: { before: 50, after: 50 },
            children: [
              new TextRun({ text: 'Déchets évités : ', bold: true }),
              new TextRun({ text: project.impactIndicators?.wasteAvoided || '30%' }),
            ],
          }),
          new Paragraph({
            spacing: { before: 50, after: 50 },
            children: [
              new TextRun({ text: 'Préservation des ressources en eau : ', bold: true }),
              new TextRun({ text: project.impactIndicators?.waterPreservation || '25%' }),
            ],
          }),
          new Paragraph({
            spacing: { before: 50, after: 120 },
            children: [
              new TextRun({ text: 'Création d\'emplois locaux projetée : ', bold: true }),
              new TextRun({ text: project.impactIndicators?.localJobsProjection || '3-5 emplois verts' }),
            ],
          }),

          // ==========================================
          // 7. Financements et labels verts envisageables
          // ==========================================
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 120 },
            children: [
              new TextRun({
                text: '7. Financements et labels verts envisageables',
                bold: true,
                color: SECONDARY_COLOR,
                size: 24,
              }),
            ],
          }),
          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 150, after: 80 },
            children: [
              new TextRun({ text: 'Labels et Certifications Vertes Stratégiques :', bold: true, color: PRIMARY_COLOR, size: 20 }),
            ],
          }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  createHeaderCell('Label / Certification'),
                  createHeaderCell('Catégorie'),
                  createHeaderCell('Valeur Stratégique'),
                  createHeaderCell('Critères d\'Éligibilité Clés'),
                ],
              }),
              ...(project.greenFinancingAndLabels?.labels || []).map(
                (lbl) =>
                  new TableRow({
                    children: [
                      createDataCell(lbl.name || '', true),
                      createDataCell(lbl.category || ''),
                      createDataCell(lbl.whyItMatters || ''),
                      createDataCell(lbl.eligibilityCriteria || ''),
                    ],
                  })
              ),
            ],
          }),
          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 200, after: 80 },
            children: [
              new TextRun({ text: 'Dispositifs de Financements Verts et Subventions :', bold: true, color: PRIMARY_COLOR, size: 20 }),
            ],
          }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  createHeaderCell('Organisme / Source'),
                  createHeaderCell('Programme de Financement'),
                  createHeaderCell('Montant / Type d\'Aide'),
                  createHeaderCell('Conditions d\'Attribution'),
                ],
              }),
              ...(project.greenFinancingAndLabels?.fundings || []).map(
                (f) =>
                  new TableRow({
                    children: [
                      createDataCell(f.source || '', true),
                      createDataCell(f.program || '', true),
                      createDataCell(f.amountOrAid || ''),
                      createDataCell(f.conditions || ''),
                    ],
                  })
              ),
            ],
          }),

          // ==========================================
          // 8. Plan d'action prioritaire
          // ==========================================
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 120 },
            children: [
              new TextRun({
                text: '8. Plan d\'action prioritaire',
                bold: true,
                color: SECONDARY_COLOR,
                size: 24,
              }),
            ],
          }),
          new Paragraph({
            spacing: { before: 100, after: 60 },
            children: [new TextRun({ text: 'Phase 1 : 0 à 3 mois (Amorçage, preuves & subventions)', bold: true, color: PRIMARY_COLOR })],
          }),
          ...(project.priorityActionPlan?.phase1_0to3months || []).map(
            (a) =>
              new Paragraph({
                spacing: { before: 40, after: 40 },
                children: [
                  new TextRun({ text: `• [${a.priorityLevel || 'Haute'}] ${a.title || 'Action'} : `, bold: true, color: '111827' }),
                  new TextRun({ text: `${a.description || ''} (Livrable : ${a.expectedDeliverable || 'N/A'})` }),
                ],
              })
          ),
          new Paragraph({
            spacing: { before: 120, after: 60 },
            children: [new TextRun({ text: 'Phase 2 : 3 à 6 mois (Pilote industriel & écosystème)', bold: true, color: PRIMARY_COLOR })],
          }),
          ...(project.priorityActionPlan?.phase2_3to6months || []).map(
            (a) =>
              new Paragraph({
                spacing: { before: 40, after: 40 },
                children: [
                  new TextRun({ text: `• [${a.priorityLevel || 'Moyenne'}] ${a.title || 'Action'} : `, bold: true, color: '111827' }),
                  new TextRun({ text: `${a.description || ''} (Livrable : ${a.expectedDeliverable || 'N/A'})` }),
                ],
              })
          ),
          new Paragraph({
            spacing: { before: 120, after: 60 },
            children: [new TextRun({ text: 'Phase 3 : 6 à 12 mois (Industrialisation & certifications)', bold: true, color: PRIMARY_COLOR })],
          }),
          ...(project.priorityActionPlan?.phase3_6to12months || []).map(
            (a) =>
              new Paragraph({
                spacing: { before: 40, after: 40 },
                children: [
                  new TextRun({ text: `• [${a.priorityLevel || 'Stratégique'}] ${a.title || 'Action'} : `, bold: true, color: '111827' }),
                  new TextRun({ text: `${a.description || ''} (Livrable : ${a.expectedDeliverable || 'N/A'})` }),
                ],
              })
          ),

          // ==========================================
          // 9. Échanges avec l'Éco-Conseiller AI Vert'Idée
          // ==========================================
          ...(project.assistantHistory && project.assistantHistory.length > 0
            ? [
                new Paragraph({
                  heading: HeadingLevel.HEADING_1,
                  spacing: { before: 420, after: 120 },
                  children: [
                    new TextRun({
                      text: "9. Échanges & Conseils de l'Éco-Conseiller AI Vert'Idée",
                      bold: true,
                      color: SECONDARY_COLOR,
                      size: 24,
                    }),
                  ],
                }),
                ...buildAssistantDiscussionDocxElements(project.assistantHistory),
              ]
            : []),
        ],
      },
    ],
  });

  return await Packer.toBlob(doc);
}

export async function generateAssistantChatWordReport(
  rawProject: ProjectAudit | null,
  rawMessages: AssistantChatMessage[]
): Promise<Blob> {
  const project = rawProject ? normalizeProjectAudit(rawProject) : null;
  const messages = (rawMessages || []).filter(
    (m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string' && m.content.trim().length > 0
  );

  const exportDate = new Date().toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const doc = new Document({
    sections: [
      {
        properties: {},
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 200, after: 100 },
            children: [
              new TextRun({
                text: "SYNTHÈSE DES ÉCHANGES — ÉCO-CONSEILLER AI VERT'IDÉE",
                size: 20,
                bold: true,
                color: PRIMARY_COLOR,
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 0, after: 140 },
            children: [
              new TextRun({
                text: project ? project.title : 'Consultation Éco-Conseil Globale',
                size: 30,
                bold: true,
                color: '111827',
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 0, after: 300 },
            children: [
              new TextRun({
                text: project
                  ? `Secteur : ${project.sector || 'Économie Circulaire'}  |  Lieu : ${project.location || 'Tunisie'}  |  Score Global : ${project.projectSynthesis?.scores?.globalScore ?? '--'}/100  |  Exporté le ${exportDate}`
                  : `Mode Consultation Globale  |  Exporté le ${exportDate}  |  Expertise Vert_Idée`,
                size: 18,
                italics: true,
                color: TEXT_MUTED,
              }),
            ],
          }),
          ...(project
            ? [
                new Table({
                  width: { size: 100, type: WidthType.PERCENTAGE },
                  rows: [
                    createKeyValueRow('Projet associé', project.title),
                    createKeyValueRow('Secteur', project.sector || 'Économie Circulaire'),
                    createKeyValueRow('Lieu', project.location || 'Tunisie'),
                    createKeyValueRow("Score Global d'Impact", `${project.projectSynthesis?.scores?.globalScore ?? '--'} / 100`),
                  ],
                }),
              ]
            : []),
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 300, after: 120 },
            children: [
              new TextRun({
                text: "Journal structuré de la discussion avec l'Éco-Conseiller AI",
                bold: true,
                color: SECONDARY_COLOR,
                size: 24,
              }),
            ],
          }),
          ...(messages.length > 0
            ? buildAssistantDiscussionDocxElements(messages)
            : [
                new Paragraph({
                  spacing: { before: 100, after: 100 },
                  children: [
                    new TextRun({
                      text: "Aucun échange enregistré pour cette discussion.",
                      italics: true,
                      color: TEXT_MUTED,
                    }),
                  ],
                }),
              ]),
        ],
      },
    ],
  });

  return await Packer.toBlob(doc);
}

function createHeaderCell(text: string): TableCell {
  return new TableCell({
    shading: { type: ShadingType.CLEAR, fill: BG_HEADER },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 1, color: '064E3B' },
      bottom: { style: BorderStyle.SINGLE, size: 1, color: '064E3B' },
      left: { style: BorderStyle.SINGLE, size: 1, color: '064E3B' },
      right: { style: BorderStyle.SINGLE, size: 1, color: '064E3B' },
    },
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 80, after: 80 },
        children: [
          new TextRun({
            text,
            bold: true,
            color: 'FFFFFF',
            size: 19,
          }),
        ],
      }),
    ],
  });
}

function createDataCell(text: string, isBold = false): TableCell {
  return new TableCell({
    borders: {
      top: { style: BorderStyle.SINGLE, size: 1, color: 'E5E7EB' },
      bottom: { style: BorderStyle.SINGLE, size: 1, color: 'E5E7EB' },
      left: { style: BorderStyle.SINGLE, size: 1, color: 'E5E7EB' },
      right: { style: BorderStyle.SINGLE, size: 1, color: 'E5E7EB' },
    },
    children: [
      new Paragraph({
        spacing: { before: 60, after: 60 },
        children: [
          new TextRun({
            text,
            bold: isBold,
            size: 18,
            color: '1F2937',
          }),
        ],
      }),
    ],
  });
}

function createScoreRow(title: string, score: number, isTotal = false): TableRow {
  let appraisal = 'Bonne avancée';
  if (score >= 85) appraisal = 'Excellence éco-responsable';
  else if (score >= 70) appraisal = 'Maturité solide';
  else if (score >= 50) appraisal = 'Progression requise';
  else appraisal = 'Chantier prioritaire';

  return new TableRow({
    children: [
      createDataCell(title, isTotal),
      new TableCell({
        shading: isTotal ? { type: ShadingType.CLEAR, fill: BG_LIGHT } : undefined,
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 60, after: 60 },
            children: [
              new TextRun({
                text: `${score} / 100`,
                bold: isTotal,
                color: isTotal ? PRIMARY_COLOR : '1F2937',
                size: isTotal ? 22 : 18,
              }),
            ],
          }),
        ],
      }),
      createDataCell(appraisal, isTotal),
    ],
  });
}

function createKeyValueRow(key: string, value: string): TableRow {
  return new TableRow({
    children: [
      new TableCell({
        width: { size: 30, type: WidthType.PERCENTAGE },
        shading: { type: ShadingType.CLEAR, fill: BG_LIGHT },
        borders: {
          top: { style: BorderStyle.SINGLE, size: 1, color: 'E5E7EB' },
          bottom: { style: BorderStyle.SINGLE, size: 1, color: 'E5E7EB' },
          left: { style: BorderStyle.SINGLE, size: 1, color: 'E5E7EB' },
          right: { style: BorderStyle.SINGLE, size: 1, color: 'E5E7EB' },
        },
        children: [
          new Paragraph({
            spacing: { before: 60, after: 60 },
            children: [
              new TextRun({
                text: key,
                bold: true,
                size: 18,
                color: SECONDARY_COLOR,
              }),
            ],
          }),
        ],
      }),
      new TableCell({
        width: { size: 70, type: WidthType.PERCENTAGE },
        borders: {
          top: { style: BorderStyle.SINGLE, size: 1, color: 'E5E7EB' },
          bottom: { style: BorderStyle.SINGLE, size: 1, color: 'E5E7EB' },
          left: { style: BorderStyle.SINGLE, size: 1, color: 'E5E7EB' },
          right: { style: BorderStyle.SINGLE, size: 1, color: 'E5E7EB' },
        },
        children: [
          new Paragraph({
            spacing: { before: 60, after: 60 },
            children: [
              new TextRun({
                text: value || 'Non renseigné',
                size: 18,
                color: '1F2937',
              }),
            ],
          }),
        ],
      }),
    ],
  });
}

function createDescriptionParagraphs(description?: string): Paragraph[] {
  if (!description || !description.trim()) {
    return [
      new Paragraph({
        spacing: { before: 60, after: 120 },
        children: [
          new TextRun({
            text: 'Aucune description détaillée renseignée.',
            italics: true,
            size: 19,
            color: TEXT_MUTED,
          }),
        ],
      }),
    ];
  }

  const lines = description.split('\n').map((l) => l.trim()).filter((l) => l.length > 0);
  const paragraphs: Paragraph[] = [];

  for (const line of lines) {
    if (line.startsWith('■') || /^#{1,4}\s/.test(line) || /^(Pillier|\d+\.)\s/i.test(line)) {
      const cleanTitle = line.replace(/^[#■\s]+/, '').trim();
      paragraphs.push(
        new Paragraph({
          spacing: { before: 140, after: 50 },
          children: [
            new TextRun({
              text: line.startsWith('■') ? line : `■ ${cleanTitle}`,
              bold: true,
              color: PRIMARY_COLOR,
              size: 20,
            }),
          ],
        })
      );
    } else if (line.startsWith('-') || line.startsWith('•') || line.startsWith('*')) {
      const bulletContent = line.replace(/^[-•*]\s*/, '').trim();
      paragraphs.push(
        new Paragraph({
          spacing: { before: 40, after: 40 },
          indent: { left: 360 },
          children: [
            new TextRun({
              text: `• ${bulletContent}`,
              size: 19,
              color: '1F2937',
            }),
          ],
        })
      );
    } else {
      paragraphs.push(
        new Paragraph({
          spacing: { before: 60, after: 60 },
          children: [
            new TextRun({
              text: line,
              size: 19,
              color: '1F2937',
            }),
          ],
        })
      );
    }
  }

  return paragraphs;
}

function buildAssistantDiscussionDocxElements(messages: AssistantChatMessage[]): (Paragraph | Table)[] {
  const elements: (Paragraph | Table)[] = [];
  let exchangeNumber = 0;

  for (const msg of messages) {
    const timestampLabel = msg.createdAt
      ? ` — ${new Date(msg.createdAt).toLocaleString('fr-FR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })}`
      : '';

    if (msg.role === 'user') {
      exchangeNumber += 1;
      elements.push(
        new Paragraph({
          spacing: { before: 220, after: 80 },
          shading: { type: ShadingType.CLEAR, fill: BG_LIGHT },
          children: [
            new TextRun({
              text: `Question #${exchangeNumber}${timestampLabel} : `,
              bold: true,
              color: SECONDARY_COLOR,
              size: 20,
            }),
            new TextRun({
              text: msg.content.trim(),
              bold: true,
              color: '111827',
              size: 20,
            }),
          ],
        })
      );
    } else {
      elements.push(
        new Paragraph({
          spacing: { before: 120, after: 60 },
          children: [
            new TextRun({
              text: `Réponse de l'Éco-Conseiller AI Vert'Idée${timestampLabel}`,
              bold: true,
              color: PRIMARY_COLOR,
              size: 20,
            }),
          ],
        })
      );
      elements.push(...parseMarkdownToDocxElements(msg.content));
    }
  }

  return elements;
}

function parseInlineRuns(text: string, baseColor = '1F2937', baseSize = 19, baseBold = false): TextRun[] {
  const runs: TextRun[] = [];
  const regex = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      runs.push(
        new TextRun({
          text: text.slice(lastIndex, match.index),
          color: baseColor,
          size: baseSize,
          bold: baseBold,
        })
      );
    }
    const token = match[0];
    if (token.startsWith('**') && token.endsWith('**')) {
      runs.push(
        new TextRun({
          text: token.slice(2, -2),
          bold: true,
          color: '111827',
          size: baseSize,
        })
      );
    } else if (token.startsWith('*') && token.endsWith('*')) {
      runs.push(
        new TextRun({
          text: token.slice(1, -1),
          italics: true,
          bold: baseBold,
          color: baseColor,
          size: baseSize,
        })
      );
    } else if (token.startsWith('`') && token.endsWith('`')) {
      runs.push(
        new TextRun({
          text: token.slice(1, -1),
          font: 'Courier New',
          color: SECONDARY_COLOR,
          size: Math.max(16, baseSize - 1),
        })
      );
    }
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    runs.push(
      new TextRun({
        text: text.slice(lastIndex),
        color: baseColor,
        size: baseSize,
        bold: baseBold,
      })
    );
  }

  if (runs.length === 0) {
    runs.push(new TextRun({ text, color: baseColor, size: baseSize, bold: baseBold }));
  }

  return runs;
}

function isMarkdownTableSeparator(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed.includes('|')) return false;
  const cells = trimmed.replace(/^\|/, '').replace(/\|$/, '').split('|');
  return cells.length > 0 && cells.every((c) => /^:?-+:?$/.test(c.trim()));
}

function splitMarkdownTableRow(line: string): string[] {
  return line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((c) => c.trim());
}

function stripInlineMarkdown(text: string): string {
  return text
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1');
}

function createChartTableFromJson(rawJson: string): (Paragraph | Table)[] {
  try {
    const candidate = JSON.parse(rawJson.trim());
    if (!candidate || !Array.isArray(candidate.items) || candidate.items.length === 0) {
      return [];
    }

    const items: Array<{ label: string; value: number }> = candidate.items
      .filter((it: any) => it && typeof it.label === 'string' && Number.isFinite(Number(it.value)))
      .map((it: any) => ({
        label: String(it.label),
        value: Number(it.value),
      }));

    if (items.length === 0) return [];

    const title = typeof candidate.title === 'string' ? candidate.title : 'Données graphiques';
    const unit = typeof candidate.unit === 'string' && candidate.unit.trim() ? ` ${candidate.unit.trim()}` : '';
    const total = items.reduce((sum, it) => sum + Math.max(0, it.value), 0);

    return [
      new Paragraph({
        spacing: { before: 140, after: 60 },
        children: [
          new TextRun({
            text: `Graphique : ${title}`,
            bold: true,
            color: PRIMARY_COLOR,
            size: 19,
          }),
        ],
      }),
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({
            children: [
              createHeaderCell('Indicateur / Catégorie'),
              createHeaderCell('Valeur'),
              createHeaderCell('Part relative'),
            ],
          }),
          ...items.map((item) => {
            const pct = total > 0 ? `${Math.round((Math.max(0, item.value) / total) * 100)} %` : '—';
            return new TableRow({
              children: [
                createDataCell(item.label, true),
                createDataCell(`${item.value}${unit}`, true),
                createDataCell(pct),
              ],
            });
          }),
        ],
      }),
    ];
  } catch {
    return [];
  }
}

function parseMarkdownToDocxElements(markdown: string): (Paragraph | Table)[] {
  const elements: (Paragraph | Table)[] = [];
  const fenceRegex = /```(?:chart|json-chart)\s*\n?([\s\S]*?)```/gi;
  const segments: Array<{ type: 'text' | 'chart'; value: string }> = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = fenceRegex.exec(markdown)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ type: 'text', value: markdown.slice(lastIndex, match.index) });
    }
    segments.push({ type: 'chart', value: match[1] });
    lastIndex = fenceRegex.lastIndex;
  }
  if (lastIndex < markdown.length) {
    segments.push({ type: 'text', value: markdown.slice(lastIndex) });
  }

  for (const segment of segments) {
    if (segment.type === 'chart') {
      elements.push(...createChartTableFromJson(segment.value));
      continue;
    }

    const lines = segment.value.replace(/\r\n/g, '\n').split('\n');
    let i = 0;

    while (i < lines.length) {
      const trimmed = lines[i].trim();
      if (!trimmed) {
        i++;
        continue;
      }

      // Markdown table
      if (trimmed.includes('|') && i + 1 < lines.length && isMarkdownTableSeparator(lines[i + 1])) {
        const headers = splitMarkdownTableRow(lines[i]);
        i += 2;
        const rows: string[][] = [];
        while (i < lines.length && lines[i].trim().includes('|') && !isMarkdownTableSeparator(lines[i])) {
          rows.push(splitMarkdownTableRow(lines[i]));
          i++;
        }

        elements.push(
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: headers.map((h) => createHeaderCell(stripInlineMarkdown(h))),
              }),
              ...rows.map(
                (row) =>
                  new TableRow({
                    children: headers.map((_, cIdx) =>
                      createDataCell(stripInlineMarkdown(row[cIdx] ?? ''), cIdx === 0)
                    ),
                  })
              ),
            ],
          })
        );
        continue;
      }

      // Heading
      const headingMatch = trimmed.match(/^(#{1,4})\s+(.+)$/);
      if (headingMatch) {
        elements.push(
          new Paragraph({
            spacing: { before: 140, after: 60 },
            children: [
              new TextRun({
                text: stripInlineMarkdown(headingMatch[2]),
                bold: true,
                color: SECONDARY_COLOR,
                size: headingMatch[1].length <= 2 ? 21 : 19,
              }),
            ],
          })
        );
        i++;
        continue;
      }

      // Blockquote
      if (trimmed.startsWith('>')) {
        const quoteLines: string[] = [];
        while (i < lines.length && lines[i].trim().startsWith('>')) {
          quoteLines.push(lines[i].trim().replace(/^>\s?/, ''));
          i++;
        }
        elements.push(
          new Paragraph({
            spacing: { before: 60, after: 60 },
            indent: { left: 320 },
            children: parseInlineRuns(quoteLines.join(' '), TEXT_MUTED, 18),
          })
        );
        continue;
      }

      // Unordered list
      if (/^[-*•]\s+/.test(trimmed)) {
        while (i < lines.length && /^[-*•]\s+/.test(lines[i].trim())) {
          const itemText = lines[i].trim().replace(/^[-*•]\s+/, '');
          elements.push(
            new Paragraph({
              bullet: { level: 0 },
              spacing: { before: 35, after: 35 },
              children: parseInlineRuns(itemText, '1F2937', 19),
            })
          );
          i++;
        }
        continue;
      }

      // Ordered list
      if (/^\d+[.)]\s+/.test(trimmed)) {
        while (i < lines.length && /^\d+[.)]\s+/.test(lines[i].trim())) {
          const m = lines[i].trim().match(/^(\d+)[.)]\s+(.+)$/);
          if (m) {
            elements.push(
              new Paragraph({
                spacing: { before: 35, after: 35 },
                indent: { left: 260 },
                children: [
                  new TextRun({ text: `${m[1]}. `, bold: true, color: SECONDARY_COLOR, size: 19 }),
                  ...parseInlineRuns(m[2], '1F2937', 19),
                ],
              })
            );
          }
          i++;
        }
        continue;
      }

      // Horizontal rule
      if (/^[-*_]{3,}$/.test(trimmed)) {
        i++;
        continue;
      }

      // Narrative / standard paragraph
      const paraLines: string[] = [];
      while (i < lines.length) {
        const cur = lines[i].trim();
        if (
          !cur ||
          /^#{1,4}\s+/.test(cur) ||
          cur.startsWith('>') ||
          /^[-*•]\s+/.test(cur) ||
          /^\d+[.)]\s+/.test(cur) ||
          /^[-*_]{3,}$/.test(cur) ||
          (cur.includes('|') && i + 1 < lines.length && isMarkdownTableSeparator(lines[i + 1]))
        ) {
          break;
        }
        paraLines.push(cur);
        i++;
      }
      if (paraLines.length > 0) {
        elements.push(
          new Paragraph({
            spacing: { before: 60, after: 80 },
            children: parseInlineRuns(paraLines.join(' '), '1F2937', 19),
          })
        );
      }
    }
  }

  return elements;
}

