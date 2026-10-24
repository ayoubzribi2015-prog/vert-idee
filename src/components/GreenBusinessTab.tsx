import React from 'react';
import { GreenEntrepreneurshipIntegration } from '../types';

interface GreenBusinessTabProps {
  integration: GreenEntrepreneurshipIntegration;
}

export const GreenBusinessTab: React.FC<GreenBusinessTabProps> = ({ integration }) => {
  return (
    <div className="space-y-6">
      {/* 4. Intégration de l'entrepreneuriat vert Header */}
      <div className="border-b border-stone-200 pb-3">
        <h2 className="text-xl font-black text-[#063428] font-serif-title">
          4. Intégration de l'Entrepreneuriat Vert
        </h2>
        <p className="text-xs text-stone-500 mt-0.5">
          Modèles économiques régénératifs, économie de la fonctionnalité, proposition de valeur circulaire et différenciation
        </p>
      </div>

      {/* Differentiation & Circular Value Proposition */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-stone-200/90 p-6 space-y-3 shadow-2xs">
          <span className="text-xs font-bold uppercase tracking-wider text-[#063428]">
            Facteur de Différenciation Compétitive Verte
          </span>
          <h3 className="text-base font-bold text-stone-900 font-heading">
            {integration.differentiationFactor}
          </h3>
          <p className="text-xs text-stone-600 leading-relaxed pt-2 border-t border-stone-100 font-light">
            Argumentaire anti-greenwashing répondant directement aux exigences Scope 3 et CSRD des clients B2B.
          </p>
        </div>

        <div className="bg-white rounded-xl border border-stone-200/90 p-6 space-y-3 shadow-2xs">
          <span className="text-xs font-bold uppercase tracking-wider text-[#10634e]">
            Proposition de Valeur Circulaire
          </span>
          <h3 className="text-base font-bold text-stone-900 font-heading">
            {integration.circularValueProposition}
          </h3>
          <p className="text-xs text-stone-600 leading-relaxed pt-2 border-t border-stone-100 font-light">
            Démontre la rentabilité économique intrinsèque de l'éco-conception et du zéro déchet.
          </p>
        </div>
      </div>

      {/* Innovative Business Models */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 shadow-2xs">
        <div>
          <h3 className="text-sm font-bold text-slate-900 font-heading">
            Modèles Économiques Innovants & Circulaires
          </h3>
          <p className="text-xs text-slate-500">
            Dépasser la vente de volume linéaire pour valoriser l'usage et la récurrence
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {integration.innovativeBusinessModels.map((bm, idx) => (
            <div
              key={idx}
              className="p-5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:border-slate-300 transition-colors space-y-3 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <h4 className="font-bold text-sm text-slate-900 font-heading">
                    {bm.title}
                  </h4>
                  <span className="text-xs font-semibold text-slate-600 font-mono-numbers">
                    {bm.feasibility}
                  </span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {bm.description}
                </p>
              </div>

              <div className="pt-2.5 border-t border-slate-200/80 text-xs text-slate-700">
                <span className="font-bold text-emerald-800">Bénéfice économique : </span>
                <span>{bm.economicBenefit}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
