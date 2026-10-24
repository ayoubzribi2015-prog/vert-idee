import React, { useState } from 'react';
import { Target, CheckCircle2, Circle, Clock, CheckCheck, Award } from 'lucide-react';
import { PriorityActionPlan } from '../types';

interface PriorityActionPlanTabProps {
  plan: PriorityActionPlan;
}

export const PriorityActionPlanTab: React.FC<PriorityActionPlanTabProps> = ({ plan }) => {
  const [completedActions, setCompletedActions] = useState<Record<string, boolean>>({});

  const toggleAction = (key: string) => {
    setCompletedActions((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const getPriorityBadge = (level: string) => {
    switch (level) {
      case 'Haute':
        return <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-100 text-rose-800">Priorité Haute</span>;
      case 'Stratégique':
        return <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-100 text-purple-800">Stratégique</span>;
      default:
        return <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-100 text-blue-800">Moyenne</span>;
    }
  };

  const totalTasks =
    plan.phase1_0to3months.length + plan.phase2_3to6months.length + plan.phase3_6to12months.length;
  const completedCount = Object.values(completedActions).filter(Boolean).length;
  const progressPct = totalTasks > 0 ? Math.round((completedCount / totalTasks) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* 8. Plan d'action prioritaire Header */}
      <div className="border-b border-stone-200 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-[#063428] font-serif-title">
            8. Plan d'Action Prioritaire & Feuille de Route
          </h2>
          <p className="text-xs text-stone-500 mt-0.5">
            Jalons opérationnels échelonnés par horizon temporel : 0-3 mois, 3-6 mois et 6-12 mois
          </p>
        </div>

        {/* Progress tracker */}
        <div className="flex items-center gap-3 bg-[#fafbf9] border border-stone-200 px-3.5 py-1.5 rounded-lg text-xs self-start sm:self-auto">
          <div className="flex items-center gap-1.5 font-semibold text-stone-700">
            <CheckCheck className="w-3.5 h-3.5 text-[#10634e]" />
            <span>Avancement :</span>
            <strong className="text-[#063428] font-mono-numbers">{completedCount} / {totalTasks}</strong>
          </div>
          <div className="w-20 bg-stone-200 h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-[#10634e] h-full rounded-full transition-all duration-300"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <span className="font-bold text-[#063428] font-mono-numbers">{progressPct}%</span>
        </div>
      </div>

      {/* 3 Chronological Phases */}
      <div className="space-y-6">
        {/* Phase 1 */}
        <div className="bg-white rounded-xl border border-stone-200/90 p-6 shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-stone-100">
            <div className="flex items-center gap-2 text-[#063428] font-bold text-sm">
              <Clock className="w-4 h-4 text-[#10634e]" />
              <span>Phase 1 : 0 à 3 mois — Amorçage, Preuves de Concept & Subventions</span>
            </div>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-[#edf5f0] text-[#063428] border border-stone-300">
              Actions Immédiates
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {plan.phase1_0to3months.map((item, idx) => {
              const key = `p1_${idx}`;
              const isDone = completedActions[key];

              return (
                <div
                  key={idx}
                  onClick={() => toggleAction(key)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all flex flex-col justify-between space-y-3 ${
                    isDone
                      ? 'border-emerald-300 bg-emerald-50/70 text-slate-500'
                      : 'border-slate-200 bg-slate-50/50 hover:border-emerald-300 hover:bg-white'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        {isDone ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        ) : (
                          <Circle className="w-4 h-4 text-slate-400 shrink-0" />
                        )}
                        <h4 className={`text-xs font-bold font-heading ${isDone ? 'line-through text-slate-400' : 'text-slate-900'}`}>
                          {item.title}
                        </h4>
                      </div>
                    </div>
                    <div className="pl-6">{getPriorityBadge(item.priorityLevel)}</div>
                    <p className="text-xs text-slate-600 pl-6 leading-relaxed">
                      {item.description}
                    </p>
                  </div>

                  <div className="pt-2.5 border-t border-slate-200 text-[11px] text-slate-700 bg-white/70 p-2.5 rounded-lg">
                    <span className="font-bold text-emerald-800 block mb-0.5">Livrable attendu :</span>
                    <span>{item.expectedDeliverable}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Phase 2 */}
        <div className="bg-white rounded-2xl border border-teal-200/90 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-teal-100">
            <div className="flex items-center gap-2 text-teal-800 font-bold text-sm">
              <Clock className="w-4 h-4 text-teal-600" />
              <span>Phase 2 : 3 à 6 mois — Prototypage Industriel & Écosystème Partenaires</span>
            </div>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-teal-100 text-teal-800">
              Moyen Terme
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {plan.phase2_3to6months.map((item, idx) => {
              const key = `p2_${idx}`;
              const isDone = completedActions[key];

              return (
                <div
                  key={idx}
                  onClick={() => toggleAction(key)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all flex flex-col justify-between space-y-3 ${
                    isDone
                      ? 'border-teal-300 bg-teal-50/70 text-slate-500'
                      : 'border-slate-200 bg-slate-50/50 hover:border-teal-300 hover:bg-white'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        {isDone ? (
                          <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0" />
                        ) : (
                          <Circle className="w-4 h-4 text-slate-400 shrink-0" />
                        )}
                        <h4 className={`text-xs font-bold font-heading ${isDone ? 'line-through text-slate-400' : 'text-slate-900'}`}>
                          {item.title}
                        </h4>
                      </div>
                    </div>
                    <div className="pl-6">{getPriorityBadge(item.priorityLevel)}</div>
                    <p className="text-xs text-slate-600 pl-6 leading-relaxed">
                      {item.description}
                    </p>
                  </div>

                  <div className="pt-2.5 border-t border-slate-200 text-[11px] text-slate-700 bg-white/70 p-2.5 rounded-lg">
                    <span className="font-bold text-teal-800 block mb-0.5">Livrable attendu :</span>
                    <span>{item.expectedDeliverable}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Phase 3 */}
        <div className="bg-white rounded-2xl border border-blue-200/90 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-blue-100">
            <div className="flex items-center gap-2 text-blue-800 font-bold text-sm">
              <Clock className="w-4 h-4 text-blue-600" />
              <span>Phase 3 : 6 à 12 mois — Mise à l'Échelle, Industrialisation & Certifications</span>
            </div>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
              Déploiement
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {plan.phase3_6to12months.map((item, idx) => {
              const key = `p3_${idx}`;
              const isDone = completedActions[key];

              return (
                <div
                  key={idx}
                  onClick={() => toggleAction(key)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all flex flex-col justify-between space-y-3 ${
                    isDone
                      ? 'border-blue-300 bg-blue-50/70 text-slate-500'
                      : 'border-slate-200 bg-slate-50/50 hover:border-blue-300 hover:bg-white'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        {isDone ? (
                          <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                        ) : (
                          <Circle className="w-4 h-4 text-slate-400 shrink-0" />
                        )}
                        <h4 className={`text-xs font-bold font-heading ${isDone ? 'line-through text-slate-400' : 'text-slate-900'}`}>
                          {item.title}
                        </h4>
                      </div>
                    </div>
                    <div className="pl-6">{getPriorityBadge(item.priorityLevel)}</div>
                    <p className="text-xs text-slate-600 pl-6 leading-relaxed">
                      {item.description}
                    </p>
                  </div>

                  <div className="pt-2.5 border-t border-slate-200 text-[11px] text-slate-700 bg-white/70 p-2.5 rounded-lg">
                    <span className="font-bold text-blue-800 block mb-0.5">Livrable attendu :</span>
                    <span>{item.expectedDeliverable}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
