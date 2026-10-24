import React from 'react';
import { SocialAspects } from '../types';

interface SocialTabProps {
  aspects: SocialAspects;
}

export const SocialTab: React.FC<SocialTabProps> = ({ aspects }) => {
  return (
    <div className="space-y-6">
      {/* 3. Aspects & impacts sociaux et sociétaux Header */}
      <div className="border-b border-stone-200 pb-3">
        <h2 className="text-xl font-black text-[#063428] font-serif-title">
          3. Aspects & Impacts Sociaux et Sociétaux
        </h2>
        <p className="text-xs text-stone-500 mt-0.5">
          Évaluation approfondie des impacts sur le capital humain, la santé et la sécurité des salariés et des riverains, le dynamisme économique local et l'accompagnement à la transition juste (RSE ISO 26000 & Devoir de vigilance).
        </p>

        {/* Methodological Reference & Impact Scope Badges */}
        <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] font-medium text-stone-700 bg-[#fafbf9] border border-stone-200/90 p-2.5 rounded-xl">
          <span className="font-bold text-[#063428] flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#10634e] inline-block"></span>
            Référentiels Sociaux & RSE :
          </span>
          <span className="bg-white px-2 py-0.5 rounded border border-stone-200 text-stone-800">
            <strong>ISO 26000</strong> Lignes directrices de la responsabilité sociétale
          </span>
          <span className="bg-white px-2 py-0.5 rounded border border-stone-200 text-stone-800">
            <strong>OIT / Travail Décent</strong> Santé & sécurité au travail
          </span>
          <span className="bg-white px-2 py-0.5 rounded border border-stone-200 text-stone-800">
            <strong>Critères CSRD</strong> Volet Social S1 (Salariés) & S3 (Communautés)
          </span>
        </div>

        {/* Impact Dimensions */}
        <div className="mt-2.5 flex flex-wrap items-center gap-2 text-[11px]">
          <span className="px-2.5 py-1 rounded-md bg-stone-50 text-stone-700 font-medium border border-stone-200">
            Impact Santé & Sécurité au Travail
          </span>
          <span className="px-2.5 py-1 rounded-md bg-stone-50 text-stone-700 font-medium border border-stone-200">
            Impact Riverains & Santé Publique
          </span>
          <span className="px-2.5 py-1 rounded-md bg-stone-50 text-stone-700 font-medium border border-stone-200">
            Impact Emplois Locaux & Territoire
          </span>
          <span className="px-2.5 py-1 rounded-md bg-stone-50 text-stone-700 font-medium border border-stone-200">
            Impact Transition Juste & Compétences
          </span>
        </div>
      </div>

      {/* Direct Social & Societal Impacts */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 shadow-2xs">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-purple-950 block">
            Impacts Sociaux Directs : Santé des Travailleurs, Conditions de Travail & Santé Publique
          </span>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Diagnostic des impacts sanitaires, de l'ergonomie des postes de travail et de l'exposition environnementale des riverains
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {aspects.socialImpacts.map((impact, idx) => (
            <div
              key={idx}
              className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 text-xs text-slate-700 leading-relaxed flex items-start gap-2.5"
            >
              <span className="text-purple-700 font-bold mt-0.5 shrink-0">•</span>
              <span>{impact}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 3 Key Impact Dimensions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Ancrage local */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-3 shadow-2xs flex flex-col justify-between">
          <div className="space-y-2">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 block">
                Impact Économique Local & Emplois
              </span>
              <span className="text-[10px] text-slate-400">Retombées sur le bassin d'emploi local</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed pt-1">
              {aspects.localEconomy}
            </p>
          </div>
          <span className="text-[11px] font-semibold text-emerald-700 pt-2 border-t border-slate-100">
            Circuits courts & emplois pérennes non délocalisables
          </span>
        </div>

        {/* Gouvernance et éthique */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-3 shadow-2xs flex flex-col justify-between">
          <div className="space-y-2">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-blue-800 block">
                Impact Sociétal & Gouvernance Éthique
              </span>
              <span className="text-[10px] text-slate-400">Dialogue avec les parties prenantes</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed pt-1">
              {aspects.governanceAndEthics}
            </p>
          </div>
          <span className="text-[11px] font-semibold text-blue-700 pt-2 border-t border-slate-100">
            Transparence, concertation citoyenne & éthique RSE
          </span>
        </div>

        {/* Transition juste */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-3 shadow-2xs flex flex-col justify-between">
          <div className="space-y-2">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-amber-800 block">
                Impact sur la Transition Juste
              </span>
              <span className="text-[10px] text-slate-400">Accompagnement humain de la mutation</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed pt-1">
              {aspects.justTransition}
            </p>
          </div>
          <span className="text-[11px] font-semibold text-amber-700 pt-2 border-t border-slate-100">
            Formation continue aux métiers verts & inclusion solidaire
          </span>
        </div>
      </div>
    </div>
  );
};
