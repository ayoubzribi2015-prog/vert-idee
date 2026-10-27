import React, { useState, useEffect } from 'react';
import {
  Sliders,
  TrendingDown,
  Sparkles,
  Zap,
  Truck,
  Package,
  RotateCcw,
  Factory,
  Save,
  Repeat,
  Trash2,
  Droplets,
  Users,
} from 'lucide-react';
import { ImpactIndicators, CarbonFootprintModel, LifecycleStageCarbon } from '../types';

interface ImpactIndicatorsTabProps {
  indicators: ImpactIndicators;
  projectId: string;
  onSaveCarbonUpdates: (updatedModel: CarbonFootprintModel) => Promise<void>;
  isSaving: boolean;
}

const CATEGORY_COLORS: Record<string, string> = {
  raw_materials: 'bg-emerald-600',
  manufacturing: 'bg-teal-600',
  packaging: 'bg-amber-600',
  transport: 'bg-blue-600',
  usage: 'bg-purple-600',
  end_of_life: 'bg-rose-600',
};

export const ImpactIndicatorsTab: React.FC<ImpactIndicatorsTabProps> = ({
  indicators,
  projectId,
  onSaveCarbonUpdates,
  isSaving,
}) => {
  const initialModel = indicators.carbonFootprint;
  const [stages, setStages] = useState<LifecycleStageCarbon[]>(initialModel.lifecycleStages);
  const [annualVolume, setAnnualVolume] = useState<number>(10000);
  const [hasChanges, setHasChanges] = useState<boolean>(false);
  const [appliedSimulation, setAppliedSimulation] = useState<string | null>(null);

  useEffect(() => {
    setStages(initialModel.lifecycleStages);
    setHasChanges(false);
    setAppliedSimulation(null);
  }, [initialModel]);

  const totalCarbonKgCO2e = stages.reduce((acc, s) => acc + (s.emissionKgCO2e || 0), 0);

  const stagesWithPct = stages.map((s) => ({
    ...s,
    percentage: totalCarbonKgCO2e > 0 ? (s.emissionKgCO2e / totalCarbonKgCO2e) * 100 : 0,
  }));

  const benchmark = initialModel.benchmarkComparison;
  const industryKg = benchmark.industryAverageKgCO2e;
  const targetKg = benchmark.ecoDesignedTargetKgCO2e;

  // Comparison metrics: accurately handle both positive (excess emissions) and negative (carbon savings)
  const isExcess = industryKg > 0 && totalCarbonKgCO2e > industryKg;
  const isCarbonSaving = industryKg > 0 && totalCarbonKgCO2e < industryKg;
  const diffPctVsIndustry = industryKg > 0
    ? Math.round(((totalCarbonKgCO2e - industryKg) / industryKg) * 100)
    : 0;
  const absDiffPct = Math.abs(diffPctVsIndustry);
  const diffPerUnitKg = Math.abs(totalCarbonKgCO2e - industryKg);

  const totalAnnualTonnes = (totalCarbonKgCO2e * annualVolume) / 1000;
  const industryAnnualTonnes = (industryKg * annualVolume) / 1000;
  const netAnnualTonnesDelta = Math.abs(totalAnnualTonnes - industryAnnualTonnes);

  // Maximum value for proportional benchmark bars display
  const maxBenchmarkKg = Math.max(industryKg, totalCarbonKgCO2e, targetKg, 0.1) * 1.1;

  const handleStageEmissionChange = (id: string, newEmission: number) => {
    const validEmission = Math.max(0, Number(newEmission) || 0);
    setStages((prev) =>
      prev.map((stage) => (stage.id === id ? { ...stage, emissionKgCO2e: validEmission } : stage))
    );
    setHasChanges(true);
  };

  const applySimulationLever = (type: 'green_energy' | 'bio_packaging' | 'rail_freight' | 'extended_life') => {
    setStages((prev) =>
      prev.map((s) => {
        if (type === 'green_energy' && s.category === 'manufacturing') {
          return { ...s, emissionKgCO2e: Number((s.emissionKgCO2e * 0.65).toFixed(2)) };
        }
        if (type === 'bio_packaging' && s.category === 'packaging') {
          return { ...s, emissionKgCO2e: Number((s.emissionKgCO2e * 0.45).toFixed(2)) };
        }
        if (type === 'rail_freight' && s.category === 'transport') {
          return { ...s, emissionKgCO2e: Number((s.emissionKgCO2e * 0.55).toFixed(2)) };
        }
        if (type === 'extended_life' && (s.category === 'raw_materials' || s.category === 'usage')) {
          return { ...s, emissionKgCO2e: Number((s.emissionKgCO2e * 0.75).toFixed(2)) };
        }
        return s;
      })
    );
    setAppliedSimulation(type);
    setHasChanges(true);
  };

  const handleResetToBaseline = () => {
    setStages(initialModel.lifecycleStages);
    setHasChanges(false);
    setAppliedSimulation(null);
  };

  const handleSaveToCloud = async () => {
    const updatedModel: CarbonFootprintModel = {
      ...initialModel,
      totalCarbonKgCO2e: Number(totalCarbonKgCO2e.toFixed(2)),
      lifecycleStages: stagesWithPct.map((s) => ({
        ...s,
        emissionKgCO2e: Number(s.emissionKgCO2e.toFixed(2)),
        percentage: Number(s.percentage.toFixed(1)),
      })),
    };
    await onSaveCarbonUpdates(updatedModel);
    setHasChanges(false);
  };

  return (
    <div className="space-y-6">
      {/* 6. Indicateurs d'impact Header */}
      <div className="border-b border-stone-200 pb-3">
        <h2 className="text-xl font-black text-[#063428] font-serif-title">
          6. Indicateurs d'impact & Empreinte Carbone
        </h2>
        <p className="text-xs text-stone-500 mt-0.5">
          Calculateur certifié de l'empreinte carbone (ACV ISO 14067 & GHG Protocol), circularité des ressources et projection d'impact territorial
        </p>
      </div>

      {/* 4 Multi-impact Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Circularity */}
        <div className="bg-white rounded-xl border border-stone-200/90 p-5 space-y-1.5 shadow-2xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500 block">Taux de Circularité</span>
          <div className="text-xl font-black text-[#063428] font-mono-numbers">
            {indicators.circularityRate}
          </div>
          <p className="text-[11px] text-stone-500 leading-normal">
            Part de biomasse ou matière recyclée intégrée.
          </p>
        </div>

        {/* Waste Avoided */}
        <div className="bg-white rounded-xl border border-stone-200/90 p-5 space-y-1.5 shadow-2xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500 block">Déchets Évités</span>
          <div className="text-xl font-black text-[#063428] font-mono-numbers">
            {indicators.wasteAvoided}
          </div>
          <p className="text-[11px] text-stone-500 leading-normal">
            Déchets fossiles et enfouissement évités.
          </p>
        </div>

        {/* Water Preservation */}
        <div className="bg-white rounded-xl border border-stone-200/90 p-5 space-y-1.5 shadow-2xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500 block">Préservation Eau</span>
          <div className="text-xl font-black text-[#063428] font-mono-numbers">
            {indicators.waterPreservation}
          </div>
          <p className="text-[11px] text-stone-500 leading-normal">
            Économie d'eau douce sur le cycle de vie.
          </p>
        </div>

        {/* Local Jobs */}
        <div className="bg-white rounded-xl border border-stone-200/90 p-5 space-y-1.5 shadow-2xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500 block">Emplois Locaux</span>
          <div className="text-xl font-black text-[#063428] font-mono-numbers">
            {indicators.localJobsProjection}
          </div>
          <p className="text-[11px] text-stone-500 leading-normal">
            Postes durables ancrés sur le territoire.
          </p>
        </div>
      </div>

      {/* Carbon Footprint Module */}
      <div className="bg-white rounded-xl border border-stone-200/90 p-6 space-y-5 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-stone-100">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#fafbf9] text-[#063428] border border-stone-200">
                ISO 14067:2018 (ECP)
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#fafbf9] text-[#063428] border border-stone-200">
                ISO 14064-1:2018
              </span>
              <span className="text-[10px] font-semibold text-stone-500">
                GHG Protocol & ADEME
              </span>
            </div>
            <h3 className="text-base font-bold text-stone-900 font-heading">
              Unité fonctionnelle : {initialModel.functionalUnit}
            </h3>
            <p className="text-xs text-stone-500">
              Modélisation normée du cycle de vie sans compensation fictive (ISO 14067) et ventilation en 6 catégories (ISO 14064-1)
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            {hasChanges && (
              <button
                onClick={handleResetToBaseline}
                type="button"
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-stone-700 hover:text-stone-900 hover:bg-stone-100 transition-colors border border-stone-300 cursor-pointer"
              >
                Réinitialiser
              </button>
            )}
            <button
              onClick={handleSaveToCloud}
              disabled={!hasChanges || isSaving}
              type="button"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold bg-[#063428] hover:bg-[#0b4a3a] active:scale-[0.98] text-white transition-all disabled:opacity-40 shadow-2xs border border-[#04211a] cursor-pointer"
            >
              <Save className="w-3.5 h-3.5 text-emerald-300" />
              <span>{isSaving ? 'Enregistrement...' : 'Enregistrer dans le Cloud'}</span>
            </button>
          </div>
        </div>

        {/* 3 Main Carbon Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Metric 1: Unit Carbon Footprint */}
          <div className="p-4 rounded-xl bg-[#fafbf9] border border-stone-200/80 space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500 block">Empreinte Carbone Unitaire</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-black text-[#063428] font-mono-numbers">
                {totalCarbonKgCO2e.toFixed(2)}
              </span>
              <span className="text-xs font-semibold text-stone-600">kg CO₂e / unité</span>
            </div>
            <p className="text-[11px] text-stone-600 font-medium">Cycle complet du berceau à la tombe</p>
          </div>

          {/* Metric 2: Performance vs Moyenne Secteur (Accurately handles Savings vs Excess) */}
          <div
            className={`p-4 rounded-xl border space-y-1.5 transition-colors ${
              isExcess
                ? 'bg-rose-50/70 border-rose-200'
                : isCarbonSaving
                ? 'bg-[#edf5f0] border-stone-200'
                : 'bg-[#fafbf9] border-stone-200/80'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-stone-600 block">Performance vs Moyenne Secteur</span>
              <span
                className={`text-[9px] font-bold px-2 py-0.5 rounded border ${
                  isExcess
                    ? 'bg-rose-100 text-rose-800 border-rose-300'
                    : isCarbonSaving
                    ? 'bg-[#d8f3dc] text-[#063428] border-stone-300'
                    : 'bg-stone-100 text-stone-700 border-stone-300'
                }`}
              >
                {isExcess ? 'Sur-émission sectorielle' : isCarbonSaving ? 'Surperformance bas-carbone' : 'Parité marché'}
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span
                className={`text-3xl font-black font-mono-numbers ${
                  isExcess ? 'text-rose-700' : isCarbonSaving ? 'text-[#10634e]' : 'text-stone-800'
                }`}
              >
                {isExcess ? `+${absDiffPct}%` : isCarbonSaving ? `-${absDiffPct}%` : '0%'}
              </span>
              <span className="text-xs text-stone-600 font-mono-numbers font-medium">
                (Moyenne : {industryKg.toFixed(2)} kg)
              </span>
            </div>
            <p className="text-[11px] leading-tight text-stone-600">
              {isExcess
                ? `Excédent critique de +${diffPerUnitKg.toFixed(2)} kg CO₂e / unité vs les pratiques du marché`
                : isCarbonSaving
                ? `Gain net de ${diffPerUnitKg.toFixed(2)} kg CO₂e / unité évités par éco-conception`
                : 'Intensité carbone strictement conforme à la moyenne observée'}
            </p>
          </div>

          {/* Metric 3: Annual Volume Impact (Savings or Excess) */}
          <div
            className={`p-4 rounded-xl border space-y-1.5 transition-colors ${
              isExcess
                ? 'bg-rose-50/40 border-rose-200'
                : 'bg-teal-50/40 border-teal-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-600">
                {isExcess ? 'Sur-Émissions Annuelles' : 'Émissions Évitées / An'}
              </span>
              <span className="text-[10px] font-semibold text-slate-500 font-mono-numbers">
                {annualVolume.toLocaleString('fr-FR')} u/an
              </span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span
                className={`text-3xl font-extrabold font-mono-numbers ${
                  isExcess ? 'text-rose-700' : 'text-teal-800'
                }`}
              >
                {isExcess ? `+${netAnnualTonnesDelta.toFixed(1)}` : netAnnualTonnesDelta.toFixed(1)}
              </span>
              <span className="text-xs font-semibold text-slate-600">tonnes CO₂e / an</span>
            </div>
            <p className="text-[11px] text-slate-500 leading-tight">
              {isExcess
                ? `Sur-pollution annuelle nette générée par rapport au standard marché`
                : `Volume annuel net de CO₂e évité grâce au procédé éco-conçu`}
            </p>
          </div>
        </div>

        {/* Volume simulation input */}
        <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <Package className="w-4 h-4 text-emerald-700 shrink-0" />
            <span className="font-semibold text-slate-800">
              Volume annuel de production simulé :
            </span>
          </div>
          <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto">
            <input
              type="number"
              min="0"
              value={annualVolume}
              onChange={(e) => {
                const val = Number(e.target.value);
                if (!isNaN(val) && val >= 0) {
                  setAnnualVolume(val);
                }
              }}
              className="w-32 px-3 py-1.5 rounded-lg border border-slate-300 text-sm font-bold font-mono-numbers text-slate-900 text-right bg-white focus:outline-none focus:ring-1 focus:ring-emerald-700"
            />
            <span className="font-bold text-slate-900 text-right shrink-0">u</span>
          </div>
        </div>

        {/* Benchmark comparison bars with proportional scaling */}
        <div className="space-y-3 pt-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
            <span className="font-bold text-slate-900">Benchmark Comparatif Sectoriel</span>
            <span className="text-slate-500 italic max-w-md text-right">{benchmark.commentary}</span>
          </div>

          {/* 1. Industry standard */}
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-slate-600 font-medium">Produit conventionnel (Moyenne marché de référence)</span>
              <span className="font-bold text-slate-700 font-mono-numbers">{industryKg.toFixed(2)} kg CO₂e</span>
            </div>
            <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
              <div
                className="bg-slate-400 h-full rounded-full transition-all duration-300"
                style={{ width: `${Math.min(100, (industryKg / maxBenchmarkKg) * 100)}%` }}
              />
            </div>
          </div>

          {/* 2. Your Product */}
          <div>
            <div className="flex justify-between items-center text-xs mb-1">
              <div className="flex items-center gap-2">
                <span
                  className={`font-bold ${
                    isExcess ? 'text-rose-800' : isCarbonSaving ? 'text-emerald-800' : 'text-slate-800'
                  }`}
                >
                  Votre Produit {hasChanges && <span className="font-normal text-amber-600 text-[11px]">(Simulation active)</span>}
                </span>
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.2 rounded border ${
                    isExcess
                      ? 'bg-rose-100 text-rose-800 border-rose-300'
                      : isCarbonSaving
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                      : 'bg-slate-100 text-slate-700 border-slate-200'
                  }`}
                >
                  {isExcess ? `+${absDiffPct}% vs moyenne` : isCarbonSaving ? `-${absDiffPct}% vs moyenne` : 'Conforme'}
                </span>
              </div>
              <span
                className={`font-extrabold font-mono-numbers ${
                  isExcess ? 'text-rose-700' : isCarbonSaving ? 'text-emerald-700' : 'text-slate-900'
                }`}
              >
                {totalCarbonKgCO2e.toFixed(2)} kg CO₂e
              </span>
            </div>
            <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  isExcess ? 'bg-rose-600' : isCarbonSaving ? 'bg-emerald-600' : 'bg-slate-600'
                }`}
                style={{ width: `${Math.min(100, (totalCarbonKgCO2e / maxBenchmarkKg) * 100)}%` }}
              />
            </div>
          </div>

          {/* 3. Eco-designed Target */}
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-teal-700 font-medium">Cible d'éco-conception haute performance (Best in class)</span>
              <span className="font-bold text-teal-800 font-mono-numbers">{targetKg.toFixed(2)} kg CO₂e</span>
            </div>
            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
              <div
                className="bg-teal-500 h-full rounded-full transition-all duration-300"
                style={{ width: `${Math.min(100, (targetKg / maxBenchmarkKg) * 100)}%` }}
              />
            </div>
          </div>

          {/* Diagnostic Expert Callout */}
          <div
            className={`p-3 rounded-xl border text-xs flex items-start gap-2.5 mt-2 ${
              isExcess
                ? 'bg-rose-50/80 border-rose-200 text-rose-900'
                : 'bg-emerald-50/80 border-emerald-200 text-emerald-900'
            }`}
          >
            <div className="font-bold shrink-0">
              {isExcess ? '⚠️ Diagnostic d\'Alerte Sectorielle :' : '✅ Validation de Performance Sectorielle :'}
            </div>
            <div className="leading-relaxed">
              {isExcess
                ? `L'empreinte du procédé dépasse de +${absDiffPct}% (+${diffPerUnitKg.toFixed(2)} kg CO₂e/unité) la moyenne conventionnelle du marché. ${benchmark.commentary}`
                : `Le procédé affiche une réduction carbone de -${absDiffPct}% (-${diffPerUnitKg.toFixed(2)} kg CO₂e/unité évitée) par rapport aux pratiques du marché. ${benchmark.commentary}`}
            </div>
          </div>
        </div>

        {/* Visual Multi-segment Bar */}
        <div className="space-y-2 pt-2">
          <div className="flex justify-between text-xs text-slate-600">
            <span className="font-bold text-slate-900">Répartition par étape du cycle de vie</span>
            <span className="font-mono-numbers">Total : {totalCarbonKgCO2e.toFixed(2)} kg CO₂e</span>
          </div>
          <div className="w-full h-3 rounded-full overflow-hidden flex bg-slate-100">
            {stagesWithPct.map((s) => (
              <div
                key={s.id}
                className={`${CATEGORY_COLORS[s.category] || 'bg-slate-400'} h-full transition-all duration-300`}
                style={{ width: `${s.percentage}%` }}
                title={`${s.name} : ${s.emissionKgCO2e.toFixed(2)} kg (${s.percentage.toFixed(1)}%)`}
              />
            ))}
          </div>
          <div className="flex flex-wrap gap-4 pt-1 text-xs">
            {stagesWithPct.map((s) => (
              <div key={s.id} className="flex items-center gap-1.5">
                <div className={`w-2.5 h-2.5 rounded-full ${CATEGORY_COLORS[s.category] || 'bg-slate-400'}`} />
                <span className="text-slate-600">{s.name} :</span>
                <strong className="text-slate-900 font-mono-numbers">{s.percentage.toFixed(1)}%</strong>
              </div>
            ))}
          </div>
        </div>

        {/* Eco-design scenario buttons */}
        <div className="pt-2 border-t border-slate-100">
          <span className="text-xs font-bold text-slate-900 block mb-2">
            Simuler des leviers d'éco-conception en direct :
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
            <button
              type="button"
              onClick={() => applySimulationLever('green_energy')}
              className={`p-3 rounded-xl border text-left transition-all ${
                appliedSimulation === 'green_energy'
                  ? 'border-emerald-600 bg-emerald-50 text-emerald-900'
                  : 'border-slate-200 hover:border-slate-300 bg-slate-50'
              }`}
            >
              <span className="font-bold text-xs block text-slate-900">Électricité 100% Verte</span>
              <span className="text-[11px] text-slate-500">-35% sur la fabrication</span>
            </button>

            <button
              type="button"
              onClick={() => applySimulationLever('bio_packaging')}
              className={`p-3 rounded-xl border text-left transition-all ${
                appliedSimulation === 'bio_packaging'
                  ? 'border-emerald-600 bg-emerald-50 text-emerald-900'
                  : 'border-slate-200 hover:border-slate-300 bg-slate-50'
              }`}
            >
              <span className="font-bold text-xs block text-slate-900">Packaging Consigné</span>
              <span className="text-[11px] text-slate-500">-55% sur l'emballage</span>
            </button>

            <button
              type="button"
              onClick={() => applySimulationLever('rail_freight')}
              className={`p-3 rounded-xl border text-left transition-all ${
                appliedSimulation === 'rail_freight'
                  ? 'border-emerald-600 bg-emerald-50 text-emerald-900'
                  : 'border-slate-200 hover:border-slate-300 bg-slate-50'
              }`}
            >
              <span className="font-bold text-xs block text-slate-900">Fret Ferroviaire</span>
              <span className="text-[11px] text-slate-500">-45% sur le transport</span>
            </button>

            <button
              type="button"
              onClick={() => applySimulationLever('extended_life')}
              className={`p-3 rounded-xl border text-left transition-all ${
                appliedSimulation === 'extended_life'
                  ? 'border-emerald-600 bg-emerald-50 text-emerald-900'
                  : 'border-slate-200 hover:border-slate-300 bg-slate-50'
              }`}
            >
              <span className="font-bold text-xs block text-slate-900">Réparabilité Prolongée</span>
              <span className="text-[11px] text-slate-500">Amortissement matière x2</span>
            </button>
          </div>
        </div>

        {/* Detailed numerical adjustment inputs */}
        <div className="space-y-3 pt-3 border-t border-slate-100">
          <span className="text-xs font-bold text-slate-900 block">
            Ajuster manuellement chaque étape (kg CO₂e) :
          </span>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {stagesWithPct.map((stage) => (
              <div
                key={stage.id}
                className="p-3 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between gap-3"
              >
                <div>
                  <span className="font-bold text-xs text-slate-900 block">{stage.name}</span>
                  <span className="text-[11px] text-slate-500 font-mono-numbers">
                    {stage.percentage.toFixed(1)}% du total
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={stage.emissionKgCO2e}
                    onChange={(e) => handleStageEmissionChange(stage.id, parseFloat(e.target.value) || 0)}
                    className="w-20 px-2 py-1.5 rounded-lg border border-slate-300 text-base sm:text-xs font-bold font-mono-numbers text-slate-900 text-right bg-white focus:outline-none focus:ring-1 focus:ring-emerald-700 min-h-[36px]"
                  />
                  <span className="text-xs text-slate-500">kg</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Key Metrics Table */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 shadow-2xs">
        <h4 className="font-bold text-sm text-slate-900 font-heading">
          Matrice des Indicateurs Clés de Performance Durable
        </h4>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[11px] bg-slate-50/60">
                <th className="py-2.5 px-3">Indicateur d'Impact</th>
                <th className="py-2.5 px-3">Valeur Mesurée</th>
                <th className="py-2.5 px-3">Unité de Référence</th>
                <th className="py-2.5 px-3">Interprétation & Impact Écologique</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {indicators.keyMetrics.map((km, idx) => (
                <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3 px-3 font-bold text-slate-900">{km.label}</td>
                  <td className="py-3 px-3 font-extrabold text-emerald-800 font-mono-numbers">{km.value}</td>
                  <td className="py-3 px-3 text-slate-500">{km.unit}</td>
                  <td className="py-3 px-3 text-slate-700">{km.interpretation}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
