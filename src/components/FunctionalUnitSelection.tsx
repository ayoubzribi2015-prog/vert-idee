import React, { useEffect, useState } from 'react';
import { ArrowRight, Check, Database, Gauge, Sparkles } from 'lucide-react';
import type { CarbonFootprintModel, FunctionalUnitOption } from '../types';
import { computeCarbonUncertainty } from '../utils/normalizeProject';

interface FunctionalUnitSelectionProps {
  options: FunctionalUnitOption[];
  carbonFootprint?: CarbonFootprintModel;
  onValidate: (optionId: string) => Promise<void>;
  onCancel?: () => void;
  isSubmitting?: boolean;
}

const formatScale = (value: number): string =>
  `×${value.toLocaleString('fr-FR', { maximumFractionDigits: 4 })}`;

/**
 * Final step of the "Expertise Environnementale en Cours" phase: the user picks
 * one of the four expert-proposed functional units before the carbon footprint
 * is computed and the report is saved.
 */
export const FunctionalUnitSelection: React.FC<FunctionalUnitSelectionProps> = ({
  options,
  carbonFootprint,
  onValidate,
  onCancel,
  isSubmitting = false,
}) => {
  const [selectedId, setSelectedId] = useState<string>(options[0]?.id || '');

  useEffect(() => {
    setSelectedId(options[0]?.id || '');
  }, [options]);

  const selected = options.find((option) => option.id === selectedId) || options[0];

  const stages = carbonFootprint?.lifecycleStages || [];
  const appliedScale =
    Number.isFinite(Number(carbonFootprint?.appliedFunctionalUnitScale)) &&
    Number(carbonFootprint?.appliedFunctionalUnitScale) > 0
      ? Number(carbonFootprint?.appliedFunctionalUnitScale)
      : 1;
  const rawStageTotal = stages.reduce((sum, s) => sum + Number(s.emissionKgCO2e || 0), 0);
  const rawTotal = rawStageTotal > 0 ? rawStageTotal : Number(carbonFootprint?.totalCarbonKgCO2e || 0);
  const baseTotal = rawTotal > 0 ? rawTotal / appliedScale : 0;
  const uncertainty = computeCarbonUncertainty(stages);
  const activeStagesCount = stages.filter((s) => (s.factorApplications?.length || 0) > 0 || s.emissionKgCO2e > 0).length;

  return (
    <div className="p-6 sm:p-8 space-y-5">
      <div className="flex justify-center">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-200">
          <Sparkles className="w-3 h-3" /> Dernière étape du diagnostic
        </span>
      </div>

      <div className="text-center space-y-1.5">
        <h3 className="text-lg sm:text-xl font-extrabold text-slate-900 font-heading">
          Expertise Environnementale en Cours
        </h3>
        <p className="text-sm font-semibold text-emerald-700">
          Les 4 experts proposent l’unité fonctionnelle de référence
        </p>
        <p className="text-xs text-slate-500 max-w-2xl mx-auto leading-relaxed">
          Choisissez l’unité fonctionnelle sur laquelle votre empreinte carbone sera calculée, puis validez.
          Le total, les émissions par étape et les pourcentages seront recalculés à partir des quantités
          ADEME V23.11 multipliées par l’échelle de votre choix.
        </p>
      </div>

      {baseTotal > 0 && (
        <div className="flex flex-wrap items-center justify-center gap-2 text-[11px]">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#edf5f0] text-[#063428] border border-emerald-200 font-semibold">
            <Database className="w-3.5 h-3.5 text-[#10634e]" />
            <span>
              {activeStagesCount} étapes ACV · {uncertainty.totalLines} postes ADEME ({uncertainty.verifiedCount} V23.11 vérifiés)
            </span>
          </span>
          {uncertainty.totalLines > 0 && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 border border-slate-200 font-mono-numbers font-semibold">
              Incertitude propagée : ±{uncertainty.relativePct}%
            </span>
          )}
        </div>
      )}

      <fieldset className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
        <legend className="sr-only">Unités fonctionnelles proposées par les experts</legend>
        {options.map((option, index) => {
          const active = option.id === selected?.id;
          const previewKg = baseTotal > 0 ? baseTotal * Number(option.scaleFactor || 1) : 0;
          return (
            <label
              key={option.id}
              className={`relative cursor-pointer rounded-2xl border p-3.5 text-left transition-all ${
                active
                  ? 'border-emerald-600 bg-emerald-50/70 shadow-sm ring-1 ring-emerald-500/30'
                  : 'border-slate-200 bg-white hover:border-emerald-300 hover:bg-slate-50/70'
              }`}
            >
              <input
                type="radio"
                name="functional-unit-option"
                value={option.id}
                checked={active}
                onChange={() => setSelectedId(option.id)}
                className="sr-only"
              />
              <span className="flex items-start justify-between gap-2">
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold ${
                    active ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  Choix {index + 1} · {option.proposedBy}
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-white border border-slate-200 text-slate-700">
                  <Gauge className="w-3 h-3 text-emerald-600" />
                  {formatScale(option.scaleFactor)}
                </span>
              </span>
              <span className="block mt-2 text-sm font-bold text-slate-900 leading-snug">
                {option.label}
              </span>
              <span className="block mt-1 text-[11px] text-slate-500 leading-relaxed">
                {option.rationale}
              </span>
              {previewKg > 0 && (
                <span className="mt-2 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-bold font-mono-numbers bg-white/90 border border-emerald-200/80 text-[#063428]">
                  Aperçu : {previewKg.toFixed(2)} kg CO₂e
                </span>
              )}
              {active && (
                <span className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-md">
                  <Check className="w-3.5 h-3.5" />
                </span>
              )}
            </label>
          );
        })}
      </fieldset>

      {selected && baseTotal > 0 && (
        <div className="text-center text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5">
          Empreinte calculée pour le choix retenu :{' '}
          <strong className="text-[#063428] font-mono-numbers">
            {(baseTotal * Number(selected.scaleFactor || 1)).toFixed(2)} kg CO₂e
          </strong>{' '}
          ({selected.label})
        </div>
      )}

      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-1">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors disabled:opacity-50"
          >
            Annuler
          </button>
        )}
        <button
          type="button"
          disabled={!selected || isSubmitting}
          onClick={() => selected && void onValidate(selected.id)}
          className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-bold bg-[#063428] hover:bg-[#0b4a3a] text-white transition-all disabled:opacity-50 min-h-[46px]"
        >
          <Check className="w-4 h-4 text-emerald-300" />
          <span>{isSubmitting ? 'Recalcul en cours...' : 'Valider et calculer l’empreinte'}</span>
          <ArrowRight className="w-4 h-4 ml-1" />
        </button>
      </div>

      <p className="text-center text-[10px] text-slate-400">
        Référentiel ADEME Base Empreinte® V23.11 figé · aucun repli réseau · Mode STRICT_IA
      </p>
    </div>
  );
};
