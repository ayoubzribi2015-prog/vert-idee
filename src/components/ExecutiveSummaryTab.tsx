import React from 'react';
import { ProjectAudit } from '../types';
import { ShieldCheck, Target, Sparkles, TrendingUp, Compass, ArrowRight, Leaf, Users, Rocket, Gauge, Award } from 'lucide-react';

interface ExecutiveSummaryTabProps {
  project: ProjectAudit;
  onNavigateToTab?: (tabKey: any) => void;
}

export const ExecutiveSummaryTab: React.FC<ExecutiveSummaryTabProps> = ({ project, onNavigateToTab }) => {
  const { scores, summary, vision } = project.projectSynthesis;

  const isCriticalRisk = scores.globalScore < 35;
  const isModerateRisk = scores.globalScore >= 35 && scores.globalScore < 65;

  const getScoreAppraisal = (score: number) => {
    if (score >= 85) return 'Excellence éco-responsable (A+)';
    if (score >= 70) return 'Maturité écologique avancée (A)';
    if (score >= 50) return 'Maturité intermédiaire (B)';
    if (score >= 35) return 'Chantier de transition prioritaire (C)';
    return 'Alerte écologique & Risque critique (D - Non conforme)';
  };

  const getScoreTheme = (score: number) => {
    if (score >= 70) {
      return {
        ring: 'text-emerald-600',
        badge: 'bg-emerald-100 text-emerald-900 border-emerald-300',
        dot: 'bg-emerald-500',
        bar: 'bg-emerald-600',
      };
    }
    if (score >= 45) {
      return {
        ring: 'text-amber-500',
        badge: 'bg-amber-100 text-amber-900 border-amber-300',
        dot: 'bg-amber-500',
        bar: 'bg-amber-500',
      };
    }
    return {
      ring: 'text-rose-600',
      badge: 'bg-rose-100 text-rose-900 border-rose-300',
      dot: 'bg-rose-500',
      bar: 'bg-rose-600',
    };
  };

  const theme = getScoreTheme(scores.globalScore);

  return (
    <div className="space-y-6">
      {/* 1. Synthèse du projet Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-200 pb-3">
        <div>
          <h2 className="text-xl font-black text-[#063428] font-serif-title">
            1. Synthèse du projet & Avis contradictoire
          </h2>
          <p className="text-xs text-stone-500 mt-0.5">
            Évaluation paritaire du Collège des Experts Environnementaux (ACV ISO 14040, risques industriels & ancrage territorial)
          </p>
        </div>
        <span className={`px-2.5 py-1 rounded-md text-xs font-bold border w-fit ${
          isCriticalRisk
            ? 'bg-rose-50 text-rose-800 border-rose-300'
            : isModerateRisk
            ? 'bg-amber-50 text-amber-900 border-amber-300'
            : 'bg-[#edf5f0] text-[#063428] border-stone-300'
        }`}>
          {isCriticalRisk ? 'Alerte Risque Écologique Majeur' : 'Double Revue d\'Experts Certifiée'}
        </span>
      </div>

      {/* Main Grid: Executive Summary & Overall Score */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Expert Review & Strategic Vision */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-stone-200/90 p-6 sm:p-7 space-y-6 shadow-2xs">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${theme.dot}`} />
              <span className={`text-xs font-bold uppercase tracking-wider font-heading ${
                isCriticalRisk ? 'text-rose-800' : 'text-[#063428]'
              }`}>
                Avis du Collège des Experts Environnementaux
              </span>
            </div>
            <p className="text-stone-800 text-sm sm:text-base leading-relaxed whitespace-pre-line font-normal">
              {summary}
            </p>
          </div>

          {/* Strategic Vision */}
          <div className="p-5 rounded-xl bg-[#f8faf7] border border-stone-200/80 space-y-2">
            <div className="flex items-center gap-2">
              <Compass className="w-4 h-4 text-[#10634e]" />
              <span className="text-xs font-bold uppercase tracking-wider text-[#063428] font-heading">
                Vision Stratégique & Changement d'Échelle
              </span>
            </div>
            <p className="text-xs sm:text-sm text-stone-700 leading-relaxed font-light">
              {vision}
            </p>
          </div>

          {/* Clean unboxed metadata with separators */}
          <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-stone-100 text-xs text-stone-600">
            <span>Secteur : <strong className="text-stone-900 font-semibold">{project.sector}</strong></span>
            <span aria-hidden="true" className="text-stone-300">·</span>
            <span>Implantation : <strong className="text-stone-900 font-semibold">{project.location || 'Tunisie'}</strong></span>
            {project.targetAudience && (
              <>
                <span aria-hidden="true" className="text-stone-300">·</span>
                <span>Cible : <strong className="text-stone-900 font-semibold">{project.targetAudience}</strong></span>
              </>
            )}
            {project.businessModel && (
              <>
                <span aria-hidden="true" className="text-stone-300">·</span>
                <span>Modèle : <strong className="text-stone-900 font-semibold">{project.businessModel}</strong></span>
              </>
            )}
          </div>
        </div>

        {/* Right 1 Col: Overall Score Display */}
        <div className="bg-white rounded-2xl border border-stone-200/90 p-6 sm:p-7 flex flex-col items-center justify-between text-center space-y-5 shadow-2xs">
          <div className="w-full space-y-1">
            <span className="text-xs font-bold uppercase tracking-wider text-stone-500">
              Note Globale d'Impact RSE & ACV
            </span>
            <div className="h-0.5 w-12 bg-[#10634e] mx-auto rounded-full mt-2" />
          </div>

          {/* Gauge Ring */}
          <div className="relative flex items-center justify-center my-2">
            <svg className="w-40 h-40 transform -rotate-90">
              <circle
                cx="80"
                cy="80"
                r="68"
                className="text-stone-100"
                strokeWidth="12"
                stroke="currentColor"
                fill="transparent"
              />
              <circle
                cx="80"
                cy="80"
                r="68"
                className={`${scores.globalScore >= 50 ? 'text-[#10634e]' : 'text-rose-600'} transition-all duration-1000 ease-out`}
                strokeWidth="12"
                strokeDasharray={427}
                strokeDashoffset={427 - (427 * scores.globalScore) / 100}
                strokeLinecap="round"
                stroke="currentColor"
                fill="transparent"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-4xl sm:text-5xl font-black text-[#063428] font-mono-numbers tracking-tight">
                {scores.globalScore}
              </span>
              <span className="text-xs font-bold text-stone-400">sur 100</span>
            </div>
          </div>

          <div className="space-y-1">
            <span className={`inline-block px-3 py-1 rounded-md text-xs font-bold border ${theme.badge}`}>
              {getScoreAppraisal(scores.globalScore)}
            </span>
            <p className="text-[11px] text-stone-500 leading-relaxed max-w-xs pt-2">
              Indice synthétique multicritère basé sur l'empreinte carbone, la circularité, la préservation des ressources et la RSE.
            </p>
          </div>

          {onNavigateToTab && (
            <button
              onClick={() => onNavigateToTab('impact')}
              className="w-full inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-stone-50 hover:bg-[#edf5f0] text-stone-800 hover:text-[#063428] border border-stone-200 text-xs font-bold transition-all cursor-pointer"
            >
              <span>Calculateur Carbone & ODD</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* 4 Pillars Structured Metric Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Pillar 1: Environnement */}
        <div className={`bg-white rounded-xl border p-5 space-y-3 shadow-2xs transition-colors ${
          scores.environmental < 35 ? 'border-rose-200' : 'border-stone-200/90 hover:border-[#10634e]/40'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Leaf className={`w-4 h-4 ${scores.environmental < 35 ? 'text-rose-600' : 'text-[#10634e]'}`} />
              <span className="text-xs font-bold text-stone-800 font-heading">Environnement</span>
            </div>
            <span className="text-sm font-black text-[#063428] font-mono-numbers">{scores.environmental}/100</span>
          </div>
          <div className="w-full bg-stone-100 h-1.5 rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all duration-700 ${scores.environmental < 35 ? 'bg-rose-600' : 'bg-[#10634e]'}`} style={{ width: `${scores.environmental}%` }} />
          </div>
          <p className="text-[11px] text-stone-500 leading-normal">Préservation des écosystèmes, de l'eau douce et de la biodiversité.</p>
        </div>

        {/* Pillar 2: Social */}
        <div className={`bg-white rounded-xl border p-5 space-y-3 shadow-2xs transition-colors ${
          scores.social < 35 ? 'border-rose-200' : 'border-stone-200/90 hover:border-[#10634e]/40'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className={`w-4 h-4 ${scores.social < 35 ? 'text-rose-600' : 'text-[#2d7a5e]'}`} />
              <span className="text-xs font-bold text-stone-800 font-heading">Social & RSE</span>
            </div>
            <span className="text-sm font-black text-[#063428] font-mono-numbers">{scores.social}/100</span>
          </div>
          <div className="w-full bg-stone-100 h-1.5 rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all duration-700 ${scores.social < 35 ? 'bg-rose-600' : 'bg-[#2d7a5e]'}`} style={{ width: `${scores.social}%` }} />
          </div>
          <p className="text-[11px] text-stone-500 leading-normal">Conditions de travail, santé, sécurité et gouvernance territoriale.</p>
        </div>

        {/* Pillar 3: Circularité */}
        <div className={`bg-white rounded-xl border p-5 space-y-3 shadow-2xs transition-colors ${
          scores.circularity < 35 ? 'border-rose-200' : 'border-stone-200/90 hover:border-[#10634e]/40'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Rocket className={`w-4 h-4 ${scores.circularity < 35 ? 'text-rose-600' : 'text-[#3e9c79]'}`} />
              <span className="text-xs font-bold text-stone-800 font-heading">Économie Circulaire</span>
            </div>
            <span className="text-sm font-black text-[#063428] font-mono-numbers">{scores.circularity}/100</span>
          </div>
          <div className="w-full bg-stone-100 h-1.5 rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all duration-700 ${scores.circularity < 35 ? 'bg-rose-600' : 'bg-[#3e9c79]'}`} style={{ width: `${scores.circularity}%` }} />
          </div>
          <p className="text-[11px] text-stone-500 leading-normal">Réemploi, démontabilité, consigne et valorisation des flux secondaires.</p>
        </div>

        {/* Pillar 4: Maturité Carbone */}
        <div className={`bg-white rounded-xl border p-5 space-y-3 shadow-2xs transition-colors ${
          scores.carbonMaturity < 35 ? 'border-rose-200' : 'border-stone-200/90 hover:border-[#10634e]/40'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Gauge className={`w-4 h-4 ${scores.carbonMaturity < 35 ? 'text-rose-600' : 'text-[#0b4a3a]'}`} />
              <span className="text-xs font-bold text-stone-800 font-heading">Maturité Carbone</span>
            </div>
            <span className="text-sm font-black text-[#063428] font-mono-numbers">{scores.carbonMaturity}/100</span>
          </div>
          <div className="w-full bg-stone-100 h-1.5 rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all duration-700 ${scores.carbonMaturity < 35 ? 'bg-rose-600' : 'bg-[#0b4a3a]'}`} style={{ width: `${scores.carbonMaturity}%` }} />
          </div>
          <p className="text-[11px] text-stone-500 leading-normal">Émissions évitées et trajectoire bas-carbone sur le cycle de vie.</p>
        </div>
      </div>
    </div>
  );
};
