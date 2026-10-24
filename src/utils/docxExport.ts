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
import type { ProjectAudit } from '../types.ts';

const PRIMARY_COLOR = '047857'; // emerald-700
const SECONDARY_COLOR = '065F46'; // emerald-800
const TEXT_MUTED = '4B5563'; // gray-600
const BG_LIGHT = 'F0FDF4'; // emerald-50
const BG_HEADER = '064E3B'; // emerald-900

export async function generateWordReport(project: ProjectAudit): Promise<Blob> {
  const dateFormatted = new Date(project.createdAt).toLocaleDateString('fr-FR', {
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
                text: project.title,
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
                text: `Secteur : ${project.sector}  |  Lieu : ${project.location || 'Non spécifié'}  |  Date : ${dateFormatted}  |  Expertise Vert_Idée`,
                size: 18,
                italics: true,
                color: TEXT_MUTED,
              }),
            ],
          }),

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
                text: project.projectSynthesis.summary,
                size: 20,
                italics: true,
              }),
            ],
          }),
          new Paragraph({
            spacing: { before: 60, after: 160 },
            children: [
              new TextRun({ text: 'Vision stratégique à long terme : ', bold: true, color: PRIMARY_COLOR }),
              new TextRun({ text: project.projectSynthesis.vision }),
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
              createScoreRow('Score Environnemental Global', project.projectSynthesis.scores.environmental),
              createScoreRow('Score Social & Sociétal (RSE)', project.projectSynthesis.scores.social),
              createScoreRow('Économie Circulaire & Réemploi', project.projectSynthesis.scores.circularity),
              createScoreRow('Maturité Carbone & Décarbonation', project.projectSynthesis.scores.carbonMaturity),
              createScoreRow('NOTE GLOBALE D\'IMPACT', project.projectSynthesis.scores.globalScore, true),
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
          ...project.environmentalAspects.strengths.map(
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
          ...project.environmentalAspects.criticalRisks.map(
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
              ...project.environmentalAspects.lifecycleAssessment.map(
                (item) =>
                  new TableRow({
                    children: [
                      createDataCell(item.phase, true),
                      createDataCell(item.impactLevel.toUpperCase()),
                      createDataCell(item.details),
                      createDataCell(item.ecoDesignLever),
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
              new TextRun({ text: project.environmentalAspects.circularEconomy.strategies.join(' ; ') }),
            ],
          }),
          new Paragraph({
            spacing: { before: 60, after: 60 },
            children: [
              new TextRun({ text: 'Impact sur la valorisation des coproduits & déchets : ', bold: true }),
              new TextRun({ text: project.environmentalAspects.circularEconomy.wasteValorization }),
            ],
          }),
          new Paragraph({
            spacing: { before: 60, after: 60 },
            children: [
              new TextRun({ text: 'Impact sur la durabilité & réparabilité : ', bold: true }),
              new TextRun({ text: project.environmentalAspects.circularEconomy.durabilityRepair }),
            ],
          }),
          new Paragraph({
            spacing: { before: 60, after: 150 },
            children: [
              new TextRun({ text: 'Cadre réglementaire & normes de maîtrise des impacts : ', bold: true }),
              new TextRun({ text: project.environmentalAspects.regulationsAndNorms.join(' ; ') }),
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
          ...project.socialAspects.socialImpacts.map(
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
              new TextRun({ text: project.socialAspects.localEconomy }),
            ],
          }),
          new Paragraph({
            spacing: { before: 60, after: 60 },
            children: [
              new TextRun({ text: 'Impact sociétal & gouvernance éthique (ISO 26000) : ', bold: true }),
              new TextRun({ text: project.socialAspects.governanceAndEthics }),
            ],
          }),
          new Paragraph({
            spacing: { before: 60, after: 120 },
            children: [
              new TextRun({ text: 'Impact sur l\'accompagnement à la transition juste : ', bold: true }),
              new TextRun({ text: project.socialAspects.justTransition }),
            ],
          }),

          // ==========================================
          // 4. Intégration de l'entrepreneuriat vert
          // ==========================================
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 120 },
            children: [
              new TextRun({
                text: '4. Intégration de l\'entrepreneuriat vert',
                bold: true,
                color: SECONDARY_COLOR,
                size: 24,
              }),
            ],
          }),
          new Paragraph({
            spacing: { before: 60, after: 80 },
            children: [
              new TextRun({ text: 'Facteur de différenciation compétitive verte : ', bold: true, color: PRIMARY_COLOR }),
              new TextRun({ text: project.greenEntrepreneurshipIntegration.differentiationFactor }),
            ],
          }),
          new Paragraph({
            spacing: { before: 60, after: 120 },
            children: [
              new TextRun({ text: 'Proposition de valeur circulaire : ', bold: true, color: PRIMARY_COLOR }),
              new TextRun({ text: project.greenEntrepreneurshipIntegration.circularValueProposition }),
            ],
          }),
          ...project.greenEntrepreneurshipIntegration.innovativeBusinessModels.map(
            (bm) =>
              new Paragraph({
                spacing: { before: 80, after: 80 },
                children: [
                  new TextRun({ text: `• ${bm.title} : `, bold: true, color: '111827' }),
                  new TextRun({ text: `${bm.description} (${bm.feasibility} — Bénéfice économique : ${bm.economicBenefit})` }),
                ],
              })
          ),

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
                  createHeaderCell('ODD Cible'),
                  createHeaderCell('Intitulé de l\'Objectif'),
                  createHeaderCell('Contribution concrète du projet'),
                  createHeaderCell('Sous-cibles adressées'),
                ],
              }),
              ...project.sdgAlignment.map(
                (odd) =>
                  new TableRow({
                    children: [
                      createDataCell(`ODD ${odd.oddNumber}`, true),
                      createDataCell(odd.title, true),
                      createDataCell(odd.contribution),
                      createDataCell(odd.targets.join(', ')),
                    ],
                  })
              ),
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
              new TextRun({ text: project.impactIndicators.carbonFootprint.functionalUnit, italics: true }),
            ],
          }),
          new Paragraph({
            spacing: { before: 60, after: 60 },
            children: [
              new TextRun({ text: 'Empreinte Carbone Totale : ', bold: true }),
              new TextRun({
                text: `${project.impactIndicators.carbonFootprint.totalCarbonKgCO2e.toFixed(2)} kg CO2e / unité`,
                bold: true,
                color: PRIMARY_COLOR,
                size: 22,
              }),
              new TextRun({
                text: ` (Moyenne secteur : ${project.impactIndicators.carbonFootprint.benchmarkComparison.industryAverageKgCO2e.toFixed(2)} kg CO2e — Cible éco-conçue : ${project.impactIndicators.carbonFootprint.benchmarkComparison.ecoDesignedTargetKgCO2e.toFixed(2)} kg CO2e)`,
                color: TEXT_MUTED,
              }),
            ],
          }),
          // Performance vs Moyenne Secteur
          (() => {
            const totalKg = project.impactIndicators.carbonFootprint.totalCarbonKgCO2e;
            const indKg = project.impactIndicators.carbonFootprint.benchmarkComparison.industryAverageKgCO2e;
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
                  text: ` — ${project.impactIndicators.carbonFootprint.benchmarkComparison.commentary}`,
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
              ...project.impactIndicators.carbonFootprint.lifecycleStages.map(
                (stage) =>
                  new TableRow({
                    children: [
                      createDataCell(stage.name, true),
                      createDataCell(`${stage.emissionKgCO2e.toFixed(2)} kg`),
                      createDataCell(`${stage.percentage.toFixed(1)} %`),
                      createDataCell(stage.reductionOpportunity),
                    ],
                  })
              ),
            ],
          }),
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
              ...project.impactIndicators.keyMetrics.map(
                (km) =>
                  new TableRow({
                    children: [
                      createDataCell(km.label, true),
                      createDataCell(km.value, true),
                      createDataCell(km.unit),
                      createDataCell(km.interpretation),
                    ],
                  })
              ),
            ],
          }),
          new Paragraph({
            spacing: { before: 100, after: 50 },
            children: [
              new TextRun({ text: 'Taux de circularité : ', bold: true }),
              new TextRun({ text: project.impactIndicators.circularityRate }),
            ],
          }),
          new Paragraph({
            spacing: { before: 50, after: 50 },
            children: [
              new TextRun({ text: 'Déchets évités : ', bold: true }),
              new TextRun({ text: project.impactIndicators.wasteAvoided }),
            ],
          }),
          new Paragraph({
            spacing: { before: 50, after: 50 },
            children: [
              new TextRun({ text: 'Préservation des ressources en eau : ', bold: true }),
              new TextRun({ text: project.impactIndicators.waterPreservation }),
            ],
          }),
          new Paragraph({
            spacing: { before: 50, after: 120 },
            children: [
              new TextRun({ text: 'Création d\'emplois locaux projetée : ', bold: true }),
              new TextRun({ text: project.impactIndicators.localJobsProjection }),
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
              ...project.greenFinancingAndLabels.labels.map(
                (lbl) =>
                  new TableRow({
                    children: [
                      createDataCell(lbl.name, true),
                      createDataCell(lbl.category),
                      createDataCell(lbl.whyItMatters),
                      createDataCell(lbl.eligibilityCriteria),
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
              ...project.greenFinancingAndLabels.fundings.map(
                (f) =>
                  new TableRow({
                    children: [
                      createDataCell(f.source, true),
                      createDataCell(f.program, true),
                      createDataCell(f.amountOrAid),
                      createDataCell(f.conditions),
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
          ...project.priorityActionPlan.phase1_0to3months.map(
            (a) =>
              new Paragraph({
                spacing: { before: 40, after: 40 },
                children: [
                  new TextRun({ text: `• [${a.priorityLevel}] ${a.title} : `, bold: true, color: '111827' }),
                  new TextRun({ text: `${a.description} (Livrable : ${a.expectedDeliverable})` }),
                ],
              })
          ),
          new Paragraph({
            spacing: { before: 120, after: 60 },
            children: [new TextRun({ text: 'Phase 2 : 3 à 6 mois (Pilote industriel & écosystème)', bold: true, color: PRIMARY_COLOR })],
          }),
          ...project.priorityActionPlan.phase2_3to6months.map(
            (a) =>
              new Paragraph({
                spacing: { before: 40, after: 40 },
                children: [
                  new TextRun({ text: `• [${a.priorityLevel}] ${a.title} : `, bold: true, color: '111827' }),
                  new TextRun({ text: `${a.description} (Livrable : ${a.expectedDeliverable})` }),
                ],
              })
          ),
          new Paragraph({
            spacing: { before: 120, after: 60 },
            children: [new TextRun({ text: 'Phase 3 : 6 à 12 mois (Industrialisation & certifications)', bold: true, color: PRIMARY_COLOR })],
          }),
          ...project.priorityActionPlan.phase3_6to12months.map(
            (a) =>
              new Paragraph({
                spacing: { before: 40, after: 40 },
                children: [
                  new TextRun({ text: `• [${a.priorityLevel}] ${a.title} : `, bold: true, color: '111827' }),
                  new TextRun({ text: `${a.description} (Livrable : ${a.expectedDeliverable})` }),
                ],
              })
          ),
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
