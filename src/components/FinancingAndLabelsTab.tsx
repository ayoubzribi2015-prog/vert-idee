import React from 'react';
import { Award, Banknote, CheckCircle, ExternalLink, ShieldCheck } from 'lucide-react';
import { GreenFinancingAndLabels } from '../types';

interface FinancingAndLabelsTabProps {
  data: GreenFinancingAndLabels;
}

export const FinancingAndLabelsTab: React.FC<FinancingAndLabelsTabProps> = ({ data }) => {
  return (
    <div className="space-y-6">
      {/* 7. Financements et labels verts envisageables Header */}
      <div className="border-b border-stone-200 pb-3">
        <h2 className="text-xl font-black text-[#063428] font-serif-title">
          7. Financements & Labels Verts Envisageables
        </h2>
        <p className="text-xs text-stone-500 mt-0.5">
          Certifications écologiques reconnues, subventions ADEME, aides Bpifrance, guichets régionaux et fonds d'impact
        </p>
      </div>

      {/* Strategic Labels Section */}
      <div className="bg-white rounded-xl border border-stone-200/90 p-6 shadow-2xs space-y-4">
        <div className="flex items-center gap-2.5 pb-3 border-b border-stone-100">
          <div className="p-2 rounded-xl bg-amber-50 text-amber-800 border border-amber-200">
            <Award className="w-5 h-5 text-amber-700" />
          </div>
          <div>
            <h3 className="text-base font-bold text-stone-900 font-heading">
              Labels & Certifications Environnementales Stratégiques
            </h3>
            <p className="text-xs text-stone-500">
              Prouver la légitimité écologique et rassurer investisseurs, acheteurs publics et consommateurs
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {data.labels.map((lbl, idx) => (
            <div
              key={idx}
              className="p-5 rounded-xl border border-stone-200/90 bg-[#fafbf9] hover:border-amber-300 transition-colors space-y-3 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <h4 className="font-bold text-base text-stone-900 font-heading flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-amber-700 shrink-0" />
                    <span>{lbl.name}</span>
                  </h4>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-100/70 text-amber-900 border border-amber-200">
                    {lbl.category}
                  </span>
                </div>
                <p className="text-xs text-stone-600 leading-relaxed font-light">
                  {lbl.whyItMatters}
                </p>
              </div>

              <div className="pt-3 border-t border-stone-200 text-xs text-stone-700 bg-white p-3 rounded-lg border border-stone-100">
                <span className="font-bold text-amber-900 block mb-0.5">Critères d'éligibilité :</span>
                <span>{lbl.eligibilityCriteria}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Green Funding & Subsidies Section */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
          <div className="p-2 rounded-xl bg-emerald-100 text-emerald-800">
            <Banknote className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 font-heading">
              Dispositifs de Financements Verts & Subventions Publiques
            </h3>
            <p className="text-xs text-slate-500">
              Aides directes à la transition écologique, prêts bonifiés et appels à projets
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {data.fundings.map((f, idx) => (
            <div
              key={idx}
              className="p-5 rounded-xl border border-slate-200 bg-slate-50/50 hover:border-emerald-300 transition-colors space-y-3 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <span className="px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-emerald-100 text-emerald-800">
                    {f.source}
                  </span>
                  <span className="text-xs font-bold text-emerald-700 font-mono-numbers">
                    {f.amountOrAid}
                  </span>
                </div>
                <h4 className="font-bold text-sm text-slate-900 font-heading">
                  {f.program}
                </h4>
              </div>

              <div className="pt-2.5 border-t border-slate-200 text-xs text-slate-600 bg-white/80 p-3 rounded-lg">
                <span className="font-bold text-slate-800 block mb-0.5">Conditions & Éligibilité :</span>
                <span>{f.conditions}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
