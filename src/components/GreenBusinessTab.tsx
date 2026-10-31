import React from 'react';
import { GreenEntrepreneurshipIntegration } from '../types';

interface GreenBusinessTabProps {
  integration: GreenEntrepreneurshipIntegration;
}

export const GreenBusinessTab: React.FC<GreenBusinessTabProps> = ({ integration }) => {
  return (
    <div className="space-y-8">
      {/* 4. Intégration de l'entrepreneuriat vert Header */}
      <div className="border-b border-stone-200 pb-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase bg-emerald-100 text-emerald-800 border border-emerald-200">
                Normes ISO 59004:2024 & ISO 59020
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase bg-sky-100 text-sky-800 border border-sky-200">
                Cadre Stratégique 9R & EFC
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase bg-amber-100 text-amber-800 border border-amber-200">
                CSRD ESRS E5
              </span>
            </div>
            <h2 className="text-xl md:text-2xl font-black text-[#063428] font-serif-title mt-2">
              4. Intégration de l'Entrepreneuriat Vert & Modèles Circulaires
            </h2>
            <p className="text-xs md:text-sm text-stone-600 mt-1 max-w-4xl">
              Architecture économique régénérative : transition de la vente linéaire de volume vers l'économie de la fonctionnalité et de la coopération (EFC), symbioses industrielles et monétisation circulaire vérifiable.
            </p>
          </div>
        </div>

        {/* Normative alignment banner if available */}
        {(integration.circularArchetype || integration.iso59000Compliance) && (
          <div className="mt-4 p-3.5 bg-emerald-50/70 border border-emerald-200/80 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs text-emerald-950">
            {integration.circularArchetype && (
              <div>
                <span className="font-bold text-emerald-900 uppercase tracking-wide text-[11px] block">Archétype Circulaire Dominant :</span>
                <span className="font-medium text-emerald-950">{integration.circularArchetype}</span>
              </div>
            )}
            {integration.iso59000Compliance && (
              <div>
                <span className="font-bold text-emerald-900 uppercase tracking-wide text-[11px] block">Conformité Cadre ISO 59000 :</span>
                <span className="font-medium text-emerald-950">{integration.iso59000Compliance}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Strategic Foundations: Differentiation, Value Proposition, Competitive Moat */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Differentiation Factor */}
        <div className="bg-white rounded-xl border border-stone-200 p-5 space-y-3 shadow-2xs hover:border-emerald-300 transition-colors flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                Différenciation Compétitive
              </span>
              <svg className="w-4 h-4 text-emerald-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h3 className="text-sm font-bold text-stone-900 leading-snug">
              {integration.differentiationFactor}
            </h3>
          </div>
          <div className="pt-3 border-t border-stone-100 text-[11px] text-stone-500 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            <span>Réponse directe aux critères d'achat Scope 3 et CSRD des clients B2B / GMS.</span>
          </div>
        </div>

        {/* Circular Value Proposition */}
        <div className="bg-white rounded-xl border border-stone-200 p-5 space-y-3 shadow-2xs hover:border-emerald-300 transition-colors flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                Proposition de Valeur Circulaire
              </span>
              <svg className="w-4 h-4 text-teal-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </div>
            <h3 className="text-sm font-bold text-stone-900 leading-snug">
              {integration.circularValueProposition}
            </h3>
          </div>
          <div className="pt-3 border-t border-stone-100 text-[11px] text-stone-500 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-teal-500"></span>
            <span>Rentabilité démontrée par la réduction du coût total de possession (TCO).</span>
          </div>
        </div>

        {/* Competitive Moat */}
        <div className="bg-white rounded-xl border border-stone-200 p-5 space-y-3 shadow-2xs hover:border-emerald-300 transition-colors flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-sky-800 bg-sky-50 px-2 py-0.5 rounded border border-sky-200">
                Barrière à l'Entrée Écologique (Moat)
              </span>
              <svg className="w-4 h-4 text-sky-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <h3 className="text-sm font-bold text-stone-900 leading-snug">
              {integration.competitiveMoat || "Maillage territorial fort et avance réglementaire protégeant les marges des fluctuations de matières vierges."}
            </h3>
          </div>
          <div className="pt-3 border-t border-stone-100 text-[11px] text-stone-500 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-sky-500"></span>
            <span>Résilience face aux chocs d'approvisionnement et aux exigences de durabilité.</span>
          </div>
        </div>
      </div>

      {/* Atouts Environnementaux Validés & Axes d'Amélioration du Projet */}
      {((integration.environmentalAssets && integration.environmentalAssets.length > 0) ||
        (integration.improvementAxes && integration.improvementAxes.length > 0)) && (
        <div className="bg-white rounded-2xl border border-stone-200 p-6 space-y-6 shadow-2xs">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-100 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200">
                  Performance & Trajectoire Verte
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-sky-100 text-sky-800 border border-sky-200">
                  Plan de Progrès Éco-responsable
                </span>
              </div>
              <h3 className="text-base font-bold text-stone-900 font-heading mt-1.5">
                Atouts Environnementaux Validés & Axes d'Amélioration Prioritaires
              </h3>
              <p className="text-xs text-stone-500">
                Capitalisation sur les éco-avantages compétitifs du modèle et pilotage opérationnel des chantiers d'éco-transition à haut retour sur investissement
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Colonne 1: Atouts Environnementaux (Éco-avantages) */}
            {integration.environmentalAssets && integration.environmentalAssets.length > 0 && (
              <div className={`space-y-3.5 ${integration.improvementAxes && integration.improvementAxes.length > 0 ? 'lg:col-span-5' : 'lg:col-span-12'}`}>
                <div className="flex items-center gap-2 pb-1 border-b border-emerald-100">
                  <span className="p-1 rounded-md bg-emerald-100 text-emerald-800">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                  </span>
                  <div>
                    <h4 className="text-xs font-bold text-emerald-950 uppercase tracking-wider">
                      Atouts Environnementaux Majeurs
                    </h4>
                    <span className="text-[11px] text-emerald-700">Gains écologiques intrinsèques au projet</span>
                  </div>
                </div>

                <div className="space-y-2.5">
                  {integration.environmentalAssets.map((asset, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-xl border border-emerald-100 bg-emerald-50/40 hover:bg-emerald-50/70 transition-colors flex items-start gap-3"
                    >
                      <span className="mt-0.5 w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0 text-[10px] font-bold">
                        ✓
                      </span>
                      <p className="text-xs text-stone-800 leading-relaxed font-medium">
                        {asset}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Colonne 2: Axes d'Amélioration & Leviers de transition */}
            {integration.improvementAxes && integration.improvementAxes.length > 0 && (
              <div className={`space-y-3.5 ${integration.environmentalAssets && integration.environmentalAssets.length > 0 ? 'lg:col-span-7' : 'lg:col-span-12'}`}>
                <div className="flex items-center gap-2 pb-1 border-b border-sky-100">
                  <span className="p-1 rounded-md bg-sky-100 text-sky-800">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                  </span>
                  <div>
                    <h4 className="text-xs font-bold text-sky-950 uppercase tracking-wider">
                      Axes d'Amélioration & Leviers d'Éco-Transition
                    </h4>
                    <span className="text-[11px] text-sky-700">Chantiers prioritaires de progrès et de rentabilité verte</span>
                  </div>
                </div>

                <div className="space-y-3">
                  {integration.improvementAxes.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-4 rounded-xl border border-stone-200 bg-stone-50/60 hover:bg-white hover:border-sky-300 transition-all space-y-2.5"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-1.5">
                        <h5 className="font-bold text-xs text-stone-900 leading-snug">
                          {item.axis}
                        </h5>
                        {item.priority && (
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                            item.priority === 'Stratégique'
                              ? 'bg-purple-50 text-purple-800 border-purple-200'
                              : item.priority === 'Haute'
                              ? 'bg-amber-50 text-amber-800 border-amber-200'
                              : 'bg-stone-100 text-stone-700 border-stone-200'
                          }`}>
                            Priorité : {item.priority}
                          </span>
                        )}
                      </div>

                      <div className="text-[11px] text-stone-600">
                        <span className="font-semibold text-stone-700">Levier opérationnel : </span>
                        <span>{item.lever}</span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-stone-200/80 text-[11px]">
                        <div className="bg-emerald-50/70 p-2 rounded-lg border border-emerald-100">
                          <span className="font-bold text-emerald-900 block text-[10px] uppercase tracking-wide">
                            Gain environnemental mesuré :
                          </span>
                          <span className="text-emerald-800 font-medium">{item.environmentalGain}</span>
                        </div>
                        <div className="bg-sky-50/70 p-2 rounded-lg border border-sky-100">
                          <span className="font-bold text-sky-900 block text-[10px] uppercase tracking-wide">
                            Impact économique / Rentabilité :
                          </span>
                          <span className="text-sky-800 font-medium">{item.economicPayoff}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Innovative Business Models */}
      <div className="bg-white rounded-2xl border border-stone-200 p-6 space-y-5 shadow-2xs">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-100 pb-3">
          <div>
            <h3 className="text-base font-bold text-stone-900 font-heading">
              Modèles Économiques Innovants & Découplage de la Ressource
            </h3>
            <p className="text-xs text-stone-500">
              Passage d'une logique extractive linéaire (extraire-fabriquer-jeter) à une économie de boucle fermée et de service
            </p>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-stone-100 text-stone-700">
            {integration.innovativeBusinessModels.length} modèle(s) actionnable(s)
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {integration.innovativeBusinessModels.map((bm, idx) => (
            <div
              key={idx}
              className="p-5 rounded-xl border border-stone-200 bg-stone-50/60 hover:bg-white hover:border-emerald-300 hover:shadow-xs transition-all flex flex-col justify-between space-y-4"
            >
              <div className="space-y-3">
                {/* Badges bar */}
                <div className="flex flex-wrap items-center justify-between gap-1.5">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {bm.archetype && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-900 border border-emerald-200">
                        {bm.archetype}
                      </span>
                    )}
                    {bm.strategy9R && (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-sky-100 text-sky-900 border border-sky-200">
                        {bm.strategy9R}
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] font-bold text-emerald-800 bg-white px-2 py-0.5 rounded-full border border-stone-200">
                    {bm.feasibility}
                  </span>
                </div>

                {/* Title & Description */}
                <div>
                  <h4 className="font-bold text-sm text-stone-900 font-heading">
                    {bm.title}
                  </h4>
                  <p className="text-xs text-stone-600 mt-1.5 leading-relaxed">
                    {bm.description}
                  </p>
                </div>

                {/* Target & Revenue stream details */}
                {(bm.targetCustomer || bm.revenueStream || bm.paybackPeriod) && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 text-[11px] bg-white/70 p-2.5 rounded-lg border border-stone-200/70">
                    {bm.targetCustomer && (
                      <div>
                        <span className="text-stone-500 font-medium block">Cible client :</span>
                        <span className="font-semibold text-stone-800">{bm.targetCustomer}</span>
                      </div>
                    )}
                    {bm.revenueStream && (
                      <div>
                        <span className="text-stone-500 font-medium block">Flux de revenus :</span>
                        <span className="font-semibold text-stone-800">{bm.revenueStream}</span>
                      </div>
                    )}
                    {bm.paybackPeriod && (
                      <div className="sm:col-span-2 pt-1 border-t border-stone-100 flex items-center justify-between">
                        <span className="text-stone-500 font-medium">Délai de retour sur investissement (ROI) :</span>
                        <span className="font-bold text-emerald-800 font-mono-numbers">{bm.paybackPeriod}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Economic benefit banner */}
              <div className="pt-2.5 border-t border-stone-200/90 text-xs">
                <div className="flex items-start gap-1.5">
                  <span className="font-bold text-emerald-900 shrink-0">Impact économique net :</span>
                  <span className="text-stone-700">{bm.economicBenefit}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Circular Monetization Mechanisms (if available) */}
      {integration.monetizationMechanisms && integration.monetizationMechanisms.length > 0 && (
        <div className="bg-white rounded-2xl border border-stone-200 p-6 space-y-4 shadow-2xs">
          <div>
            <h3 className="text-base font-bold text-stone-900 font-heading">
              Mécanismes de Monétisation Circulaire & Impact Cash-Flow
            </h3>
            <p className="text-xs text-stone-500">
              Leviers d'optimisation financière directe (CAPEX, OPEX, nouveaux flux récurrents et bonifications fiscales)
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {integration.monetizationMechanisms.map((mech, idx) => {
              const impact = mech.directCashFlowImpact || mech.cashFlowImpact || 'Gain économique mesurable';
              return (
                <div
                  key={idx}
                  className="p-4 rounded-xl border border-stone-200 bg-stone-50/40 hover:bg-white hover:border-emerald-200 transition-colors flex flex-col justify-between space-y-3"
                >
                  <div className="space-y-1.5">
                    <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border border-emerald-200 bg-emerald-50/50 text-emerald-900">
                      {mech.category}
                    </span>
                    <h4 className="font-bold text-xs text-stone-900 leading-snug">
                      {mech.name}
                    </h4>
                    <p className="text-[11px] text-stone-600 leading-relaxed">
                      {mech.description}
                    </p>
                  </div>
                  <div className="pt-2 border-t border-stone-100 text-[11px]">
                    <span className="font-bold text-emerald-900 block">Gain cash-flow :</span>
                    <span className="font-semibold text-emerald-800">{impact}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Industrial Symbiosis & Territorial Ecology (if available) */}
      {integration.industrialSymbiosis && integration.industrialSymbiosis.length > 0 && (
        <div className="bg-white rounded-2xl border border-stone-200 p-6 space-y-4 shadow-2xs">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-100 pb-3">
            <div>
              <h3 className="text-base font-bold text-stone-900 font-heading">
                Écologie Industrielle & Territoriale (EIT) — Symbioses Opérationnelles
              </h3>
              <p className="text-xs text-stone-500">
                Valorisation des boucles locales de matières, flux secondaires et énergies fatales avec les acteurs riverains
              </p>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-sky-100 text-sky-800 border border-sky-200">
              Boucles Fermées Territoriales
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-stone-700">
              <thead className="bg-stone-100/80 text-stone-800 font-bold border-b border-stone-200">
                <tr>
                  <th className="py-2.5 px-3 rounded-tl-lg">Partenaire Territorial</th>
                  <th className="py-2.5 px-3">Flux Matière / Énergie Échangé</th>
                  <th className="py-2.5 px-3">Bénéfice Environnemental / Opérationnel</th>
                  <th className="py-2.5 px-3 rounded-tr-lg">Valeur Économique / Mutuelle</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {integration.industrialSymbiosis.map((symb, idx) => {
                  const partner = symb.partner || symb.partnerType || 'Acteur territorial';
                  const flow = symb.fluxType || symb.inputOutputFlow || 'Flux matière / énergie';
                  const envBenefit = symb.environmentalBenefit || symb.description;
                  const value = symb.mutualBenefit || symb.economicValue || 'Synergie mutuelle';

                  return (
                    <tr key={idx} className="hover:bg-stone-50/80 transition-colors">
                      <td className="py-3 px-3 font-bold text-stone-900 align-top">
                        {partner}
                      </td>
                      <td className="py-3 px-3 align-top font-medium text-emerald-950">
                        {flow}
                      </td>
                      <td className="py-3 px-3 align-top text-stone-600">
                        {envBenefit}
                      </td>
                      <td className="py-3 px-3 align-top font-semibold text-emerald-800">
                        {value}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Decoupling Metrics Dashboard (if available) */}
      {integration.decouplingMetrics && integration.decouplingMetrics.length > 0 && (
        <div className="bg-white rounded-2xl border border-stone-200 p-6 space-y-4 shadow-2xs">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-100 pb-3">
            <div>
              <h3 className="text-base font-bold text-stone-900 font-heading">
                Indicateurs de Découplage Ressources / Chiffre d'Affaires (ISO 59020)
              </h3>
              <p className="text-xs text-stone-500">
                Mesure quantitative de la rupture du lien entre croissance de l'activité et consommation de ressources vierges
              </p>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200">
              Découplage Absolu & Relatif
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {integration.decouplingMetrics.map((met, idx) => {
              const indicator = met.indicator || met.metric || 'Indicateur';
              const target = met.targetValue || met.target || 'N/A';
              const method = met.methodology || (met.baselineLinear ? `Réf: ${met.baselineLinear}` : 'Comptabilité flux ISO 59020');
              const factor = met.decouplingFactor || 'Découplage vérifié';

              return (
                <div
                  key={idx}
                  className="p-4 rounded-xl border border-emerald-100 bg-emerald-50/30 flex flex-col justify-between space-y-2.5"
                >
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 block mb-1">
                      {indicator}
                    </span>
                    <div className="text-lg font-black text-stone-900 font-mono-numbers">
                      {target}
                    </div>
                    <span className="text-[11px] text-stone-500 block mt-0.5 leading-snug">
                      {method}
                    </span>
                  </div>
                  <div className="pt-2 border-t border-emerald-200/60 flex items-center justify-between text-xs">
                    <span className="text-stone-600 font-medium">Facteur :</span>
                    <span className="font-bold text-emerald-800 bg-white px-2 py-0.5 rounded border border-emerald-200 text-[11px]">
                      {factor}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
