import React from 'react';
import { SdgAlignmentItem } from '../types';

interface SdgAlignmentTabProps {
  sdgItems: SdgAlignmentItem[];
}

export const OFFICIAL_SDG_TITLES: Record<number, string> = {
  1: 'Pas de pauvreté',
  2: 'Faim « Zéro »',
  3: 'Bonne santé et bien-être',
  4: 'Éducation de qualité',
  5: 'Égalité entre les sexes',
  6: 'Eau propre et assainissement',
  7: "Énergie propre et d'un coût abordable",
  8: 'Travail décent et croissance économique',
  9: 'Industrie, innovation et infrastructure',
  10: 'Inégalités réduites',
  11: 'Villes et communautés durables',
  12: 'Consommation et production responsables',
  13: 'Mesures relatives à la lutte contre les changements climatiques',
  14: 'Vie aquatique',
  15: 'Vie terrestre',
  16: 'Paix, justice et institutions efficaces',
  17: 'Partenariats pour la réalisation des objectifs',
};

const SDG_COLORS: Record<number, { bg: string; text: string }> = {
  1: { bg: 'bg-[#E5243B]', text: 'text-white' },
  2: { bg: 'bg-[#DDA63A]', text: 'text-white' },
  3: { bg: 'bg-[#4C9F38]', text: 'text-white' },
  4: { bg: 'bg-[#C5192D]', text: 'text-white' },
  5: { bg: 'bg-[#FF3A21]', text: 'text-white' },
  6: { bg: 'bg-[#26BDE2]', text: 'text-white' },
  7: { bg: 'bg-[#FCC30B]', text: 'text-slate-900' },
  8: { bg: 'bg-[#A21942]', text: 'text-white' },
  9: { bg: 'bg-[#FD6925]', text: 'text-white' },
  10: { bg: 'bg-[#DD1367]', text: 'text-white' },
  11: { bg: 'bg-[#FD9D24]', text: 'text-white' },
  12: { bg: 'bg-[#BF8B2E]', text: 'text-white' },
  13: { bg: 'bg-[#3F7E44]', text: 'text-white' },
  14: { bg: 'bg-[#0A97D9]', text: 'text-white' },
  15: { bg: 'bg-[#56C02B]', text: 'text-white' },
  16: { bg: 'bg-[#00689D]', text: 'text-white' },
  17: { bg: 'bg-[#19486A]', text: 'text-white' },
};

export const SdgAlignmentTab: React.FC<SdgAlignmentTabProps> = ({ sdgItems }) => {
  return (
    <div className="space-y-6">
      {/* 5. Alignement ODD Header */}
      <div className="border-b border-stone-200 pb-3">
        <h2 className="text-xl font-black text-[#063428] font-serif-title">
          5. Alignement ODD de l'ONU (Agenda 2030)
        </h2>
        <p className="text-xs text-stone-500 mt-0.5">
          Contribution directe du projet aux Objectifs de Développement Durable de l'ONU pour 2030
        </p>
      </div>

      {/* Overview summary */}
      <div className="bg-white rounded-xl border border-stone-200/90 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xs">
        <div>
          <h3 className="text-sm font-bold text-slate-900 font-heading">
            {sdgItems.length} Objectifs Mondiaux Ciblés avec Précision
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Cartographie des sous-cibles de l'ONU pour les investisseurs à impact et rapports CSRD.
          </p>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {sdgItems.map((odd) => {
            const colors = SDG_COLORS[odd.oddNumber] || { bg: 'bg-slate-700', text: 'text-white' };
            const officialTitle = OFFICIAL_SDG_TITLES[odd.oddNumber] || odd.title;
            return (
              <span
                key={odd.oddNumber}
                className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold font-mono-numbers ${colors.bg} ${colors.text}`}
                title={`ODD ${odd.oddNumber} : ${officialTitle}`}
              >
                {odd.oddNumber}
              </span>
            );
          })}
        </div>
      </div>

      {/* Grid of SDGs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {sdgItems.map((odd) => {
          const colors = SDG_COLORS[odd.oddNumber] || { bg: 'bg-emerald-700', text: 'text-white' };
          const officialTitle = OFFICIAL_SDG_TITLES[odd.oddNumber] || odd.title;

          return (
            <div
              key={odd.oddNumber}
              className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs flex flex-col justify-between space-y-4 hover:border-slate-300 transition-colors"
            >
              <div className="space-y-3">
                {/* Header with SDG Badge */}
                <div className="flex items-start gap-3">
                  <div
                    className={`w-11 h-11 rounded-xl flex flex-col items-center justify-center shrink-0 shadow-2xs ${colors.bg} ${colors.text}`}
                  >
                    <span className="text-[9px] font-bold uppercase tracking-wider leading-none">ODD</span>
                    <span className="text-base font-extrabold font-mono-numbers leading-tight">{odd.oddNumber}</span>
                  </div>
                  <div>
                    <span className="text-[11px] font-semibold text-slate-400">
                      Objectif {odd.oddNumber}
                    </span>
                    <h4 className="text-sm font-bold text-slate-900 font-heading leading-snug">
                      {officialTitle}
                    </h4>
                  </div>
                </div>

                {/* Contribution details */}
                <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3.5 rounded-xl border border-slate-200/80">
                  <strong className="text-slate-900 block mb-0.5">Contribution concrète :</strong>
                  {odd.contribution}
                </p>
              </div>

              {/* Sub-targets tags */}
              <div className="pt-2 border-t border-slate-100 text-xs text-slate-600 space-y-1">
                <span className="text-[11px] font-semibold text-slate-400 block">
                  Sous-cibles ONU adressées :
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {odd.targets.map((target, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 rounded-md text-[11px] bg-slate-100 text-slate-700 border border-slate-200"
                    >
                      {target}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
