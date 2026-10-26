import React, { useState, useEffect } from 'react';
import {
  Gauge,
  Sliders,
  TrendingDown,
  Cloud,
  CheckCircle,
  Sparkles,
  Zap,
  Truck,
  Package,
  RotateCcw,
  Factory,
  Save,
  Info,
} from 'lucide-react';
import { CarbonFootprintModel, LifecycleStageCarbon } from '../types';

interface CarbonCalculatorTabProps {
  initialModel: CarbonFootprintModel;
  projectId: string;
  onSaveCarbonUpdates: (updatedModel: CarbonFootprintModel) => Promise<void>;
  isSaving: boolean;
}

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  raw_materials: <Zap className="w-4 h-4 text-emerald-600" />,
  manufacturing: <Factory className="w-4 h-4 text-teal-600" />,
  packaging: <Package className="w-4 h-4 text-amber-600" />,
  transport: <Truck className="w-4 h-4 text-blue-600" />,
  usage: <Sliders className="w-4 h-4 text-purple-600" />,
  end_of_life: <RotateCcw className="w-4 h-4 text-rose-600" />,
};

const CATEGORY_COLORS: Record<string, string> = {
  raw_materials: 'bg-emerald-500',
  manufacturing: 'bg-teal-500',
  packaging: 'bg-amber-500',
  transport: 'bg-blue-500',
  usage: 'bg-purple-500',
  end_of_life: 'bg-rose-500',
};

export const CarbonCalculatorTab: React.FC<CarbonCalculatorTabProps> = ({
  initialModel,
  projectId,
  onSaveCarbonUpdates,
  isSaving,
}) => {
  const [stages, setStages] = useState<LifecycleStageCarbon[]>(initialModel.lifecycleStages);
  const [annualVolume, setAnnualVolume] = useState<number>(10000);
  const [hasChanges, setHasChanges] = useState<boolean>(false);
  const [appliedSimulation, setAppliedSimulation] = useState<string | null>(null);

  // Sync when initialModel changes
  useEffect(() => {
    setStages(initialModel.lifecycleStages);
    setHasChanges(false);
    setAppliedSimulation(null);
  }, [initialModel]);

  // Recalculate totals
  const totalCarbonKgCO2e = stages.reduce((acc, s) => acc + (s.emissionKgCO2e || 0), 0);

  // Update percentages
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

  // Preset simulation levers
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
      {/* Top Banner: Functional unit & total emission */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-slate-100">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                <Gauge className="w-3.5 h-3.5 text-emerald-700" />
                ISO 14067:2018 (ECP Produit)
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold bg-teal-100 text-teal-800 border border-teal-200">
                ISO 14064-1:2018 (Catégories 1 à 6)
              </span>
              <span className="text-[11px] font-semibold text-slate-500">
                ACV & Base Empreinte ADEME
              </span>
            </div>
            <h3 className="text-xl font-bold text-slate-900 font-heading">
              Unité fonctionnelle : {initialModel.functionalUnit}
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Quantification normée par unité fonctionnelle du berceau à la tombe (ISO 14067), décomposition en 6 catégories d’émissions (ISO 14064-1) et exclusion formelle des compensations carbone fictives.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {hasChanges && (
              <button
                onClick={handleResetToBaseline}
                type="button"
                className="px-3 py-2 rounded-xl text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors border border-slate-200"
              >
                Réinitialiser
              </button>
            )}
            <button
              onClick={handleSaveToCloud}
              disabled={!hasChanges || isSaving}
              type="button"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white transition-all disabled:opacity-50 shadow-xs"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isSaving ? 'Enregistrement...' : 'Enregistrer dans le Cloud'}</span>
            </button>
          </div>
        </div>

        {/* 3 Main KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-5">
          {/* KPI 1: Per unit */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-600">
              Empreinte Carbone Unitaire
            </span>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-3xl font-extrabold text-slate-900 font-mono-numbers">
                {totalCarbonKgCO2e.toFixed(2)}
              </span>
              <span className="text-sm font-semibold text-slate-600">kg CO2e / unité</span>
            </div>
            <p className="text-[11px] text-slate-600 mt-1 font-medium">
              Cycle de vie complet (Cradle-to-Grave)
            </p>
          </div>

          {/* KPI 2: Industry comparison */}
          <div
            className={`p-4 rounded-xl border transition-colors ${
              isExcess
                ? 'bg-rose-50/60 border-rose-200'
                : isCarbonSaving
                ? 'bg-emerald-50/60 border-emerald-200'
                : 'bg-slate-50 border-slate-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                Performance vs Moyenne Secteur
              </span>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                  isExcess
                    ? 'bg-rose-100 text-rose-800 border-rose-300'
                    : isCarbonSaving
                    ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                    : 'bg-slate-100 text-slate-700 border-slate-300'
                }`}
              >
                {isExcess ? 'Sur-émission' : isCarbonSaving ? 'Surperformance' : 'Parité'}
              </span>
            </div>
            <div className="flex items-baseline gap-2 mt-2">
              <span
                className={`text-3xl font-extrabold font-mono-numbers ${
                  isExcess ? 'text-rose-700' : isCarbonSaving ? 'text-emerald-700' : 'text-slate-800'
                }`}
              >
                {isExcess ? `+${absDiffPct}%` : isCarbonSaving ? `-${absDiffPct}%` : '0%'}
              </span>
              <span className="text-xs text-slate-500 font-medium font-mono-numbers">
                (Moyenne : {industryKg.toFixed(2)} kg)
              </span>
            </div>
            <p className="text-[11px] text-slate-600 mt-1 leading-tight">
              {isExcess
                ? `Excédent critique de +${diffPerUnitKg.toFixed(2)} kg CO₂e / unité vs le marché`
                : isCarbonSaving
                ? `Gain net de ${diffPerUnitKg.toFixed(2)} kg CO₂e / unité par éco-conception`
                : 'Intensité carbone conforme aux moyennes sectorielles'}
            </p>
          </div>

          {/* KPI 3: Annual volume impact */}
          <div
            className={`p-4 rounded-xl border transition-colors ${
              isExcess ? 'bg-rose-50/40 border-rose-200' : 'bg-teal-50/40 border-teal-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                {isExcess ? 'Sur-Émissions / An' : 'Émissions Évitées / An'}
              </span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-mono-numbers">
                {annualVolume.toLocaleString('fr-FR')} u/an
              </span>
            </div>
            <div className="flex items-baseline gap-2 mt-2">
              <span
                className={`text-3xl font-extrabold font-mono-numbers ${
                  isExcess ? 'text-rose-700' : 'text-teal-800'
                }`}
              >
                {isExcess ? `+${netAnnualTonnesDelta.toFixed(1)}` : netAnnualTonnesDelta.toFixed(1)}
              </span>
              <span className="text-sm font-semibold text-slate-600">tonnes CO2e</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              {isExcess
                ? 'Sur-pollution annuelle nette par rapport au standard marché'
                : 'Émissions nettes évitées par rapport à un produit conventionnel'}
            </p>
          </div>
        </div>

        {/* Volume slider */}
        <div className="mt-5 p-3 sm:p-3.5 bg-slate-50/70 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3 text-xs">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-semibold text-slate-800">
              Simuler selon votre volume de production annuel :
            </span>
          </div>
          <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto">
            <input
              type="range"
              min="1000"
              max="200000"
              step="1000"
              value={annualVolume}
              onChange={(e) => setAnnualVolume(Number(e.target.value))}
              className="flex-1 sm:w-48 accent-emerald-600 cursor-pointer h-2 min-h-[32px]"
            />
            <span className="font-bold text-slate-900 font-mono-numbers text-right shrink-0">
              {annualVolume.toLocaleString('fr-FR')} unités
            </span>
          </div>
        </div>
      </div>

      {/* Visual Benchmark Comparison Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <TrendingDown className="w-5 h-5 text-emerald-600" />
            <h4 className="font-bold text-sm text-slate-900 font-heading">
              Benchmark Comparatif du Secteur
            </h4>
          </div>
          <span className="text-xs text-slate-500 italic max-w-md text-right">
            {benchmark.commentary}
          </span>
        </div>

        {/* Bars */}
        <div className="space-y-3 pt-1">
          {/* Industry Average */}
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="font-medium text-slate-600">Produit standard conventionnel (Moyenne marché)</span>
              <span className="font-bold text-slate-700 font-mono-numbers">{industryKg.toFixed(2)} kg CO2e</span>
            </div>
            <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
              <div
                className="bg-slate-400 h-full rounded-full transition-all duration-300"
                style={{ width: `${Math.min(100, (industryKg / maxBenchmarkKg) * 100)}%` }}
              />
            </div>
          </div>

          {/* Your product */}
          <div>
            <div className="flex justify-between items-center text-xs mb-1">
              <div className="flex items-center gap-2">
                <span
                  className={`font-bold ${
                    isExcess ? 'text-rose-800' : isCarbonSaving ? 'text-emerald-800' : 'text-slate-800'
                  }`}
                >
                  Votre Produit (Actuel / Simulé)
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
                {hasChanges && <span className="text-[10px] text-amber-600 font-normal">(Simulation active)</span>}
              </div>
              <span
                className={`font-extrabold font-mono-numbers ${
                  isExcess ? 'text-rose-700' : isCarbonSaving ? 'text-emerald-700' : 'text-slate-900'
                }`}
              >
                {totalCarbonKgCO2e.toFixed(2)} kg CO2e
              </span>
            </div>
            <div className="w-full bg-slate-100 h-3.5 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  isExcess ? 'bg-rose-600' : isCarbonSaving ? 'bg-emerald-600' : 'bg-slate-600'
                }`}
                style={{ width: `${Math.min(100, (totalCarbonKgCO2e / maxBenchmarkKg) * 100)}%` }}
              />
            </div>
          </div>

          {/* Target eco-designed */}
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="font-medium text-teal-700">Cible d'éco-conception haute performance (Best in class)</span>
              <span className="font-bold text-teal-800 font-mono-numbers">{targetKg.toFixed(2)} kg CO2e</span>
            </div>
            <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
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
                ? `Le procédé présente une intensité carbone supérieure de +${absDiffPct}% (+${diffPerUnitKg.toFixed(2)} kg CO₂e/u) aux standards sectoriels. ${benchmark.commentary}`
                : `Le procédé démontre une réduction d'émissions de -${absDiffPct}% (-${diffPerUnitKg.toFixed(2)} kg CO₂e/u) par rapport aux pratiques du marché. ${benchmark.commentary}`}
            </div>
          </div>
        </div>
      </div>

      {/* Lifecycle Breakdown Visual Stack */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <h4 className="font-bold text-sm text-slate-900 font-heading">
            Répartition des Émissions par Étape du Cycle de Vie (ACV)
          </h4>
          <span className="text-xs text-slate-500">
            Total : {totalCarbonKgCO2e.toFixed(2)} kg CO2e = 100%
          </span>
        </div>

        {/* Multi-segment progress bar */}
        <div className="w-full h-4 rounded-full overflow-hidden flex bg-slate-100 shadow-inner">
          {stagesWithPct.map((s) => (
            <div
              key={s.id}
              className={`${CATEGORY_COLORS[s.category] || 'bg-slate-400'} h-full transition-all duration-300`}
              style={{ width: `${s.percentage}%` }}
              title={`${s.name} : ${s.emissionKgCO2e.toFixed(2)} kg (${s.percentage.toFixed(1)}%)`}
            />
          ))}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-4 pt-1 text-xs">
          {stagesWithPct.map((s) => (
            <div key={s.id} className="flex items-center gap-1.5">
              <div className={`w-3 h-3 rounded-full ${CATEGORY_COLORS[s.category] || 'bg-slate-400'}`} />
              <span className="text-slate-600">{s.name} :</span>
              <strong className="text-slate-900 font-mono-numbers">{s.percentage.toFixed(1)}%</strong>
            </div>
          ))}
        </div>
      </div>

      {/* Interactive Simulation Levers */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
          <Sparkles className="w-5 h-5 text-emerald-600" />
          <div>
            <h4 className="font-bold text-sm text-slate-900 font-heading">
              Simulateur de Leviers de Décarbonation Rapides
            </h4>
            <p className="text-xs text-slate-500">
              Testez l'impact direct de modifications éco-responsables sur l'empreinte carbone
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <button
            type="button"
            onClick={() => applySimulationLever('green_energy')}
            className={`p-3.5 rounded-xl border text-left transition-all ${
              appliedSimulation === 'green_energy'
                ? 'border-emerald-500 bg-emerald-50 text-emerald-900'
                : 'border-slate-200 hover:border-emerald-300 bg-slate-50/60'
            }`}
          >
            <div className="flex items-center gap-1.5 font-bold text-xs text-slate-900 mb-1">
              <Zap className="w-3.5 h-3.5 text-emerald-600" />
              <span>Électricité 100% Verte</span>
            </div>
            <p className="text-[11px] text-slate-600">
              Réduction de ~35% des émissions de fabrication.
            </p>
          </button>

          <button
            type="button"
            onClick={() => applySimulationLever('bio_packaging')}
            className={`p-3.5 rounded-xl border text-left transition-all ${
              appliedSimulation === 'bio_packaging'
                ? 'border-emerald-500 bg-emerald-50 text-emerald-900'
                : 'border-slate-200 hover:border-emerald-300 bg-slate-50/60'
            }`}
          >
            <div className="flex items-center gap-1.5 font-bold text-xs text-slate-900 mb-1">
              <Package className="w-3.5 h-3.5 text-amber-600" />
              <span>Emballage Réutilisable</span>
            </div>
            <p className="text-[11px] text-slate-600">
              Réduction de ~55% de l'impact du packaging.
            </p>
          </button>

          <button
            type="button"
            onClick={() => applySimulationLever('rail_freight')}
            className={`p-3.5 rounded-xl border text-left transition-all ${
              appliedSimulation === 'rail_freight'
                ? 'border-emerald-500 bg-emerald-50 text-emerald-900'
                : 'border-slate-200 hover:border-emerald-300 bg-slate-50/60'
            }`}
          >
            <div className="flex items-center gap-1.5 font-bold text-xs text-slate-900 mb-1">
              <Truck className="w-3.5 h-3.5 text-blue-600" />
              <span>Fret Ferroviaire / Fluvial</span>
            </div>
            <p className="text-[11px] text-slate-600">
              Réduction de ~45% du transport de distribution.
            </p>
          </button>

          <button
            type="button"
            onClick={() => applySimulationLever('extended_life')}
            className={`p-3.5 rounded-xl border text-left transition-all ${
              appliedSimulation === 'extended_life'
                ? 'border-emerald-500 bg-emerald-50 text-emerald-900'
                : 'border-slate-200 hover:border-emerald-300 bg-slate-50/60'
            }`}
          >
            <div className="flex items-center gap-1.5 font-bold text-xs text-slate-900 mb-1">
              <RotateCcw className="w-3.5 h-3.5 text-purple-600" />
              <span>Durabilité & Réparabilité</span>
            </div>
            <p className="text-[11px] text-slate-600">
              Amortissement prolongé de la matière première.
            </p>
          </button>
        </div>
      </div>

      {/* Detailed Stage-by-Stage Sliders / Inputs */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h4 className="font-bold text-sm text-slate-900 font-heading">
              Ajustement Précis des Émissions par Étape (kg CO2e)
            </h4>
            <p className="text-xs text-slate-500">
              Modifiez manuellement les valeurs selon vos mesures réelles de laboratoire ou données fournisseurs
            </p>
          </div>
        </div>

        <div className="space-y-4">
          {stagesWithPct.map((stage) => (
            <div
              key={stage.id}
              className="p-4 rounded-xl border border-slate-200 bg-slate-50/40 hover:bg-slate-50 transition-colors space-y-2"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-white border border-slate-200 shadow-2xs">
                    {CATEGORY_ICONS[stage.category]}
                  </div>
                  <div>
                    <span className="font-bold text-sm text-slate-900">{stage.name}</span>
                    <span className="ml-2 text-xs font-semibold text-slate-500">
                      ({stage.percentage.toFixed(1)}% du total)
                    </span>
                  </div>
                </div>

                {/* Input box */}
                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={stage.emissionKgCO2e}
                    onChange={(e) => handleStageEmissionChange(stage.id, parseFloat(e.target.value) || 0)}
                    className="w-24 px-2.5 py-1.5 rounded-lg border border-slate-300 text-base sm:text-sm font-bold font-mono-numbers text-slate-900 text-right bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 min-h-[36px]"
                  />
                  <span className="text-xs text-slate-600 font-medium">kg CO2e</span>
                </div>
              </div>

              <p className="text-xs text-slate-600">
                {stage.description}
              </p>

              <div className="text-[11px] font-medium text-emerald-800 bg-emerald-50/70 p-2 rounded-lg flex items-start gap-1.5">
                <Info className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                <span>
                  <strong>Levier recommandé : </strong>
                  {stage.reductionOpportunity}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* High-Impact Actions Table */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
          <TrendingDown className="w-5 h-5 text-emerald-600" />
          <div>
            <h4 className="font-bold text-sm text-slate-900 font-heading">
              Plan de Décarbonation Prioritaire
            </h4>
            <p className="text-xs text-slate-500">
              Actions à plus fort potentiel de réduction des émissions de GES
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 font-semibold text-slate-600 uppercase tracking-wider">
                <th className="py-2.5 px-3">Priorité</th>
                <th className="py-2.5 px-3">Action de Décarbonation</th>
                <th className="py-2.5 px-3">Potentiel de Réduction</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {initialModel.highImpactDecarbonizationActions.map((action, idx) => (
                <tr key={idx} className="hover:bg-slate-50/50">
                  <td className="py-3 px-3 whitespace-nowrap">
                    <span
                      className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                        action.priority === 'P1'
                          ? 'bg-rose-100 text-rose-800'
                          : action.priority === 'P2'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}
                    >
                      {action.priority} (Priorité haute)
                    </span>
                  </td>
                  <td className="py-3 px-3 font-medium text-slate-800">
                    {action.action}
                  </td>
                  <td className="py-3 px-3 font-bold text-emerald-700 font-mono-numbers">
                    -{action.estimatedReductionPct}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
