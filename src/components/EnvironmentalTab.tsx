import React from 'react';
import { EnvironmentalAspects } from '../types';

interface EnvironmentalTabProps {
  aspects: EnvironmentalAspects;
}

export const EnvironmentalTab: React.FC<EnvironmentalTabProps> = ({ aspects }) => {
  const getImpactBadge = (level: string) => {
    switch (level?.toLowerCase()) {
      case 'faible':
        return <span className="text-emerald-700 font-semibold text-xs">Impact faible</span>;
      case 'moyen':
        return <span className="text-amber-700 font-semibold text-xs">Impact moyen</span>;
      case 'eleve':
      case 'élevé':
        return <span className="text-rose-700 font-semibold text-xs">Impact élevé</span>;
      default:
        return <span className="text-slate-600 font-semibold text-xs">{level}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* 2. Aspects & impacts environnementaux Header */}
      <div className="border-b border-stone-200 pb-3">
        <h2 className="text-xl font-black text-[#063428] font-serif-title">
          2. Aspects & impacts environnementaux
        </h2>
        <p className="text-xs text-stone-500 mt-0.5">
          Évaluation approfondie des aspects et impacts environnementaux (directs et indirects) : Analyse du cycle de vie (ACV ISO 14040/14044), hiérarchisation des Aspects Environnementaux Significatifs (AES ISO 14001), flux de matières et pressions écotoxiques.
        </p>

        {/* Methodological Reference Badge */}
        <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] font-medium text-stone-700 bg-[#fafbf9] border border-stone-200/90 p-2.5 rounded-xl">
          <span className="font-bold text-[#063428] flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#10634e] inline-block"></span>
            Référentiels d'Analyse :
          </span>
          <span className="bg-white px-2 py-0.5 rounded border border-stone-200 text-stone-800">
            <strong>ISO 14001</strong> Matrice AES : Criticité = (F × G × S) / M
          </span>
          <span className="bg-white px-2 py-0.5 rounded border border-stone-200 text-stone-800">
            <strong>Institut Agro Montpellier</strong> : Multi-Méthodes ACV & AMC
          </span>
          <span className="bg-white px-2 py-0.5 rounded border border-stone-200 text-stone-800">
            <strong>Guide OSS / REPSAHEL</strong> : Gestion Sobre de l'Eau
          </span>
        </div>

        {/* Impact Dimensions Scope */}
        <div className="mt-2.5 flex flex-wrap items-center gap-2 text-[11px]">
          <span className="px-2.5 py-1 rounded-md bg-stone-50 text-stone-700 font-medium border border-stone-200">
            Impact Climat & Décarbonation
          </span>
          <span className="px-2.5 py-1 rounded-md bg-stone-50 text-stone-700 font-medium border border-stone-200">
            Impact Ressources & Matières
          </span>
          <span className="px-2.5 py-1 rounded-md bg-stone-50 text-stone-700 font-medium border border-stone-200">
            Impact Eau & Milieux Aquatiques
          </span>
          <span className="px-2.5 py-1 rounded-md bg-stone-50 text-stone-700 font-medium border border-stone-200">
            Impact Écotoxicité & Biodiversité
          </span>
        </div>
      </div>

      {/* Strengths & Critical Risks Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Strengths / Positive Impacts */}
        <div className="bg-white rounded-xl border border-stone-200/90 p-6 space-y-3.5 shadow-2xs">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-[#063428] block">
              Impacts Environnementaux Positifs & Atouts Écologiques
            </span>
            <p className="text-[11px] text-stone-500 mt-0.5">
              Bénéfices écologiques mesurables, préservation des ressources et gains nets
            </p>
          </div>
          <ul className="space-y-2.5">
            {aspects.strengths.map((str, idx) => (
              <li key={idx} className="flex items-start gap-2.5 text-xs text-stone-700 leading-relaxed">
                <span className="text-[#10634e] font-bold mt-0.5">—</span>
                <span>{str}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Critical Risks / Negative Impacts */}
        <div className="bg-white rounded-xl border border-stone-200/90 p-6 space-y-3.5 shadow-2xs">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-[#b54728] block">
              Impacts Environnementaux Négatifs & Vigilances (AES)
            </span>
            <p className="text-[11px] text-stone-500 mt-0.5">
              Risques d'émissions, de pollution des milieux et Aspects Environnementaux Significatifs
            </p>
          </div>
          <ul className="space-y-2.5">
            {aspects.criticalRisks.map((risk, idx) => (
              <li key={idx} className="flex items-start gap-2.5 text-xs text-stone-700 leading-relaxed">
                <span className="text-[#b54728] font-bold mt-0.5">—</span>
                <span>{risk}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Lifecycle Assessment (ACV) Table */}
      <div className="bg-white rounded-xl border border-stone-200/90 p-6 space-y-4 shadow-2xs">
        <div>
          <h3 className="text-sm font-bold text-stone-900 font-heading">
            Analyse du Cycle de Vie (ACV) & Matrice des Impacts Environnementaux
          </h3>
          <p className="text-xs text-stone-500">
            Caractérisation et évaluation séquentielle des impacts environnementaux de l'extraction des ressources jusqu'au traitement de fin de vie
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-stone-200 text-stone-600 font-bold uppercase tracking-wider text-[10px] bg-stone-50/70">
                <th className="py-2.5 px-3">Étape du Cycle</th>
                <th className="py-2.5 px-3">Intensité d'Impact</th>
                <th className="py-2.5 px-3">Diagnostic & Nature de l'Impact</th>
                <th className="py-2.5 px-3">Levier d'Atténuation & Éco-conception</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {aspects.lifecycleAssessment.map((item, idx) => (
                <tr key={idx} className="hover:bg-stone-50/70 transition-colors">
                  <td className="py-3 px-3 font-bold text-stone-900 whitespace-nowrap">
                    {item.phase}
                  </td>
                  <td className="py-3 px-3 whitespace-nowrap">
                    {getImpactBadge(item.impactLevel)}
                  </td>
                  <td className="py-3 px-3 text-slate-600 leading-relaxed max-w-sm">
                    {item.details}
                  </td>
                  <td className="py-3 px-3 text-emerald-900 font-medium">
                    {item.ecoDesignLever}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Circular Economy Grid */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 shadow-2xs">
        <div>
          <h3 className="text-sm font-bold text-slate-900 font-heading">
            Impact Circulaire & Bouclage des Flux de Matière
          </h3>
          <p className="text-xs text-slate-500">
            Réduction de l'impact matière par l'allongement de la durée de vie, la valorisation et le réemploi
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
            <span className="text-xs font-bold text-slate-900 block">
              Stratégies Circulaires & Évitement de Déchets
            </span>
            <ul className="space-y-1.5 text-xs text-slate-600">
              {aspects.circularEconomy.strategies.map((s, idx) => (
                <li key={idx} className="flex items-start gap-1.5">
                  <span className="text-emerald-600 font-bold">·</span>
                  <span>{s}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
            <span className="text-xs font-bold text-slate-900 block">
              Impact sur la Valorisation des Coproduits
            </span>
            <p className="text-xs text-slate-600 leading-relaxed">
              {aspects.circularEconomy.wasteValorization}
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
            <span className="text-xs font-bold text-slate-900 block">
              Impact sur la Durabilité & Réparabilité
            </span>
            <p className="text-xs text-slate-600 leading-relaxed">
              {aspects.circularEconomy.durabilityRepair}
            </p>
          </div>
        </div>
      </div>

      {/* Regulations & Norms */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-3 shadow-2xs">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
          Cadre Réglementaire & Normes de Maîtrise des Impacts (ISO 14001, CSRD, ESPR)
        </span>
        <div className="flex flex-wrap gap-2 pt-1 text-xs text-slate-700">
          {aspects.regulationsAndNorms.map((reg, idx) => (
            <span
              key={idx}
              className="px-3 py-1.5 rounded-lg bg-slate-100 border border-slate-200 text-slate-800 font-medium"
            >
              {reg}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};
