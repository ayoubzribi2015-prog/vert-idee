import React from 'react';
import { SdgAlignmentItem } from '../types';

interface SdgAlignmentTabProps {
  sdgItems: SdgAlignmentItem[];
}

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
          5. Alignement ODD de l'ONU
        </h2>
        <p className="text-xs text-stone-500 mt-0.5">
          Contribution directe du projet aux 17 Objectifs de Développement Durable de l'ONU pour l'horizon 2030
        </p>
      </div>

      {/* Overview summary */}
      <div className="bg-white rounded-xl border border-stone-200/90 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xs">
        <div>
          <h3 className="text-sm font-bold text-slate-900 font-heading">
            {sdgItems.length} Objectifs Mondiaux Ciblés Directement
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Cadre de référence incontournable pour les investisseurs à impact et les rapports de durabilité CSRD.
          </p>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {sdgItems.map((odd) => {
            const colors = SDG_COLORS[odd.oddNumber] || { bg: 'bg-slate-700', text: 'text-white' };
            return (
              <span
                key={odd.oddNumber}
                className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold font-mono-numbers ${colors.bg} ${colors.text}`}
                title={`ODD ${odd.oddNumber} : ${odd.title}`}
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
                      {odd.title}
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
                  Sous-cibles adressées :
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
