import React, { useState, useEffect, useCallback } from 'react';
import {
  Package,
  Save,
  Trash2,
  Search,
  Database,
  Plus,
  Loader2,
  ExternalLink,
  CheckCircle2,
  Sparkles,
  Gauge,
} from 'lucide-react';
import {
  ImpactIndicators,
  CarbonFootprintModel,
  LifecycleStageCarbon,
  AdemeReferenceFactor,
  CarbonFactorApplication,
} from '../types';
import {
  buildDefaultLifecycleStages,
  applyFunctionalUnitScale,
  computeCarbonUncertainty,
  getFactorDenominator,
  getCompatibleActivityUnits,
  convertActivityToDenominator,
  BASE_CARBONE_VERSION,
  BASE_CARBONE_DOC_URL,
} from '../utils/normalizeProject';

interface ImpactIndicatorsTabProps {
  indicators: ImpactIndicators;
  projectId: string;
  projectContext?: {
    title?: string;
    sector?: string;
    description?: string;
    location?: string;
  };
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

/** Emission of a factor line is always quantity × factor, never trusted from the model. */
const lineEmission = (quantity: number, factorKgCO2e: number): number =>
  Number((Math.max(0, quantity) * Math.max(0, factorKgCO2e)).toFixed(6));

/** A stage emission is the sum of its factor lines when factor-based calculation is active. */
const withRecomputedEmission = (stage: LifecycleStageCarbon): LifecycleStageCarbon => {
  if (!stage.factorApplications?.length) return stage;
  const emission = stage.factorApplications.reduce(
    (sum, line) => sum + lineEmission(line.quantity, line.factorKgCO2e),
    0
  );
  return { ...stage, emissionKgCO2e: Number(emission.toFixed(4)) };
};

export const ImpactIndicatorsTab: React.FC<ImpactIndicatorsTabProps> = ({
  indicators,
  projectId,
  projectContext,
  onSaveCarbonUpdates,
  isSaving,
}) => {
  const initialModel = indicators.carbonFootprint;
  // The headline figure is the sum of stages: never render 0.00 when the model
  // carries a positive footprint total but no usable stage breakdown.
  const baselineStages =
    initialModel.totalCarbonKgCO2e > 0
      ? initialModel.lifecycleStages?.length
        ? initialModel.lifecycleStages
        : buildDefaultLifecycleStages(initialModel.totalCarbonKgCO2e)
      : [];

  const [stages, setStages] = useState<LifecycleStageCarbon[]>(baselineStages);
  const [ademeFactors, setAdemeFactors] = useState<AdemeReferenceFactor[]>(
    initialModel.ademeReferenceFactors || []
  );
  const [selectedUnitId, setSelectedUnitId] = useState<string>(
    initialModel.selectedFunctionalUnitId || initialModel.functionalUnitOptions?.[0]?.id || ''
  );
  const [appliedScale, setAppliedScale] = useState<number>(
    Number.isFinite(Number(initialModel.appliedFunctionalUnitScale)) &&
      Number(initialModel.appliedFunctionalUnitScale) > 0
      ? Number(initialModel.appliedFunctionalUnitScale)
      : 1
  );
  const [functionalUnitLabel, setFunctionalUnitLabel] = useState<string>(
    initialModel.functionalUnit
  );
  const [benchmarkState, setBenchmarkState] = useState(initialModel.benchmarkComparison);
  const [annualVolume, setAnnualVolume] = useState<number>(10000);
  const [hasChanges, setHasChanges] = useState<boolean>(false);
  const [appliedSimulation, setAppliedSimulation] = useState<string | null>(null);

  // ADEME Base Carbone® offline search against the frozen V23.11 index & calculator state
  const [ademeQuery, setAdemeQuery] = useState<string>('');
  const [ademeResults, setAdemeResults] = useState<AdemeReferenceFactor[]>([]);
  const [ademeSuggestions, setAdemeSuggestions] = useState<AdemeReferenceFactor[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState<boolean>(false);
  const [isSearchingAdeme, setIsSearchingAdeme] = useState<boolean>(false);
  const [ademeError, setAdemeError] = useState<string | null>(null);
  const [selectedAdemeFactor, setSelectedAdemeFactor] = useState<AdemeReferenceFactor | null>(null);
  const [ademeQuantity, setAdemeQuantity] = useState<string>('1');
  const [ademeInputUnit, setAdemeInputUnit] = useState<string>('unité');
  const [ademePosteLabel, setAdemePosteLabel] = useState<string>('');
  const [ademeJustification, setAdemeJustification] = useState<string>('');
  const [targetStageId, setTargetStageId] = useState<string>(baselineStages[0]?.id || '');

  useEffect(() => {
    setStages(baselineStages);
    setAdemeFactors(initialModel.ademeReferenceFactors || []);
    setSelectedUnitId(
      initialModel.selectedFunctionalUnitId || initialModel.functionalUnitOptions?.[0]?.id || ''
    );
    setAppliedScale(
      Number.isFinite(Number(initialModel.appliedFunctionalUnitScale)) &&
        Number(initialModel.appliedFunctionalUnitScale) > 0
        ? Number(initialModel.appliedFunctionalUnitScale)
        : 1
    );
    setFunctionalUnitLabel(initialModel.functionalUnit);
    setBenchmarkState(initialModel.benchmarkComparison);
    setHasChanges(false);
    setAppliedSimulation(null);
    if (baselineStages.length > 0) {
      setTargetStageId(baselineStages[0].id);
    }
  }, [initialModel]);

  useEffect(() => {
    if (selectedAdemeFactor) {
      setAdemeInputUnit(getFactorDenominator(selectedAdemeFactor.unit));
    }
  }, [selectedAdemeFactor]);

  const targetStageObj = stages.find((s) => s.id === targetStageId);
  const targetStageCategory = targetStageObj?.category || 'raw_materials';

  const fetchStageSuggestions = useCallback(
    async (stageCategory: string, signal?: AbortSignal) => {
      try {
        setIsLoadingSuggestions(true);
        const params = new URLSearchParams({
          stage: stageCategory,
          size: '6',
        });
        if (projectContext?.title) params.set('title', projectContext.title);
        if (projectContext?.sector) params.set('sector', projectContext.sector);
        if (projectContext?.description) params.set('description', projectContext.description.slice(0, 600));
        if (projectContext?.location) params.set('location', projectContext.location);
        const res = await fetch(`/api/base-carbone/suggest?${params.toString()}`, { signal });
        if (!res.ok) return;
        const data = await res.json();
        if (data?.success && Array.isArray(data.results)) {
          setAdemeSuggestions(data.results);
        }
      } catch (err: any) {
        if (err?.name !== 'AbortError') {
          console.warn('Impossible de charger les suggestions ADEME ACV:', err?.message);
        }
      } finally {
        setIsLoadingSuggestions(false);
      }
    },
    [projectContext?.title, projectContext?.sector, projectContext?.description, projectContext?.location]
  );

  useEffect(() => {
    if (!targetStageId) return;
    const controller = new AbortController();
    void fetchStageSuggestions(targetStageCategory, controller.signal);
    return () => controller.abort();
  }, [targetStageId, targetStageCategory, projectId, fetchStageSuggestions]);

  const totalCarbonKgCO2e = stages.reduce((acc, s) => acc + (s.emissionKgCO2e || 0), 0);
  const uncertaintySummary = computeCarbonUncertainty(stages);

  const stagesWithPct = stages.map((s) => ({
    ...s,
    percentage: totalCarbonKgCO2e > 0 ? (s.emissionKgCO2e / totalCarbonKgCO2e) * 100 : 0,
  }));

  const benchmark = benchmarkState;
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
      prev.map((stage) =>
        stage.id === id && !stage.factorApplications?.length
          ? { ...stage, emissionKgCO2e: validEmission }
          : stage
      )
    );
    setHasChanges(true);
  };

  /** Switch among the 4 expert Functional Units reversibly without compounding scale. */
  const handleSwitchFunctionalUnit = (optionId: string) => {
    if (!initialModel.functionalUnitOptions || initialModel.functionalUnitOptions.length !== 4) return;
    const scaled = applyFunctionalUnitScale(
      {
        ...initialModel,
        functionalUnit: functionalUnitLabel,
        selectedFunctionalUnitId: selectedUnitId,
        appliedFunctionalUnitScale: appliedScale,
        lifecycleStages: stages,
        benchmarkComparison: benchmarkState,
        ademeReferenceFactors: ademeFactors,
      },
      optionId
    );
    if (!scaled) return;
    setStages(scaled.lifecycleStages || []);
    setSelectedUnitId(scaled.selectedFunctionalUnitId || optionId);
    setAppliedScale(Number(scaled.appliedFunctionalUnitScale) || 1);
    setFunctionalUnitLabel(scaled.functionalUnit);
    if (scaled.benchmarkComparison) setBenchmarkState(scaled.benchmarkComparison);
    setHasChanges(true);
  };

  /** Simulation levers scale the activity quantities, so emissions stay factor-derived. */
  const applyLeverToStage = (stage: LifecycleStageCarbon, factor: number): LifecycleStageCarbon => {
    if (!stage.factorApplications?.length) {
      return { ...stage, emissionKgCO2e: Number((stage.emissionKgCO2e * factor).toFixed(4)) };
    }
    return withRecomputedEmission({
      ...stage,
      factorApplications: stage.factorApplications.map((line) => {
        const quantity = Number((line.quantity * factor).toFixed(6));
        return { ...line, quantity, emissionKgCO2e: lineEmission(quantity, line.factorKgCO2e) };
      }),
    });
  };

  const applySimulationLever = (type: 'green_energy' | 'bio_packaging' | 'rail_freight' | 'extended_life') => {
    setStages((prev) =>
      prev.map((s) => {
        if (type === 'green_energy' && s.category === 'manufacturing') return applyLeverToStage(s, 0.65);
        if (type === 'bio_packaging' && s.category === 'packaging') return applyLeverToStage(s, 0.45);
        if (type === 'rail_freight' && s.category === 'transport') return applyLeverToStage(s, 0.55);
        if (type === 'extended_life' && (s.category === 'raw_materials' || s.category === 'usage')) {
          return applyLeverToStage(s, 0.75);
        }
        return s;
      })
    );
    setAppliedSimulation(type);
    setHasChanges(true);
  };

  const handleResetToBaseline = () => {
    setStages(baselineStages);
    setAdemeFactors(initialModel.ademeReferenceFactors || []);
    setSelectedUnitId(
      initialModel.selectedFunctionalUnitId || initialModel.functionalUnitOptions?.[0]?.id || ''
    );
    setAppliedScale(
      Number.isFinite(Number(initialModel.appliedFunctionalUnitScale)) &&
        Number(initialModel.appliedFunctionalUnitScale) > 0
        ? Number(initialModel.appliedFunctionalUnitScale)
        : 1
    );
    setFunctionalUnitLabel(initialModel.functionalUnit);
    setBenchmarkState(initialModel.benchmarkComparison);
    setHasChanges(false);
    setAppliedSimulation(null);
  };

  const handleSearchAdeme = async (overrideQuery?: string) => {
    const q = (overrideQuery !== undefined ? overrideQuery : ademeQuery).trim();
    if (!q) return;
    if (overrideQuery !== undefined) setAdemeQuery(overrideQuery);
    try {
      setIsSearchingAdeme(true);
      setAdemeError(null);
      const params = new URLSearchParams({
        q,
        size: '12',
      });
      if (targetStageCategory) params.set('stage', targetStageCategory);
      if (projectContext?.location) params.set('geography', projectContext.location);
      const res = await fetch(`/api/base-carbone/search?${params.toString()}`);
      const data = await res.json();
      if (!res.ok || !data?.success) {
        throw new Error(data?.error || 'Erreur de consultation ADEME Base Carbone®');
      }
      setAdemeResults(Array.isArray(data.results) ? data.results : []);
      if (Array.isArray(data.results) && data.results.length > 0) {
        setSelectedAdemeFactor(data.results[0]);
      } else {
        setSelectedAdemeFactor(null);
      }
    } catch (err: any) {
      setAdemeError(err?.message || 'Impossible d’interroger l’index local Base Carbone ADEME.');
    } finally {
      setIsSearchingAdeme(false);
    }
  };

  const handleFocusStageCalculator = (stageId: string) => {
    setTargetStageId(stageId);
    const el = document.getElementById('ademe-calculator-box');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const convertedAdemeQty = selectedAdemeFactor
    ? convertActivityToDenominator(
        Math.max(0, Number(ademeQuantity) || 0),
        ademeInputUnit,
        selectedAdemeFactor.unit
      )
    : 0;

  const handleApplyAdemeFactor = (mode: 'add' | 'replace') => {
    if (!selectedAdemeFactor || !targetStageId) return;
    const rawQty = Math.max(0, Number(ademeQuantity) || 0);
    if (rawQty <= 0) return;
    const qty = Number(
      convertActivityToDenominator(rawQty, ademeInputUnit, selectedAdemeFactor.unit).toFixed(6)
    );
    if (qty <= 0) return;
    const stageObj = stages.find((s) => s.id === targetStageId);
    const factor = selectedAdemeFactor;
    const cleanPoste = ademePosteLabel.trim();
    const cleanJustification = ademeJustification.trim();
    const newLine: CarbonFactorApplication = {
      id: `line_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      ademeId: factor.id,
      name: factor.name,
      ...(cleanPoste ? { posteLabel: cleanPoste } : {}),
      ...(cleanJustification
        ? { technicalJustification: cleanJustification }
        : {
            technicalJustification: `Quantité saisie (${rawQty} ${ademeInputUnit}) rattachée à l'étape ${
              stageObj?.name || targetStageId
            } pour ${functionalUnitLabel}.`,
          }),
      sourceBasis: 'Saisie utilisateur / étude technique',
      verifiedAdeme: true,
      quantity: qty,
      unit: factor.unit,
      factorKgCO2e: factor.factorKgCO2e,
      emissionKgCO2e: lineEmission(qty, factor.factorKgCO2e),
      ...(factor.category ? { category: factor.category } : {}),
      ...(factor.geography ? { geography: factor.geography } : {}),
      ...(factor.uncertaintyPct ? { uncertaintyPct: factor.uncertaintyPct } : {}),
      ...(factor.version ? { version: factor.version } : {}),
      ...(factor.program ? { program: factor.program } : {}),
      appliedStage: stageObj?.name || targetStageId,
    };

    setStages((prev) =>
      prev.map((stage) => {
        if (stage.id !== targetStageId) return stage;
        const factorApplications =
          mode === 'replace' ? [newLine] : [...(stage.factorApplications || []), newLine];
        return withRecomputedEmission({ ...stage, factorApplications });
      })
    );

    const enrichedFactor: AdemeReferenceFactor = {
      ...factor,
      appliedStage: stageObj?.name || targetStageId,
    };
    setAdemeFactors((prev) => {
      const filtered = prev.filter((f) => f.id !== enrichedFactor.id);
      return [enrichedFactor, ...filtered].slice(0, 20);
    });
    setAdemePosteLabel('');
    setAdemeJustification('');
    setHasChanges(true);
  };

  const handleFactorQuantityChange = (stageId: string, lineId: string, rawQuantity: string) => {
    const quantity = Math.max(0, Number(rawQuantity) || 0);
    setStages((prev) =>
      prev.map((stage) => {
        if (stage.id !== stageId) return stage;
        const factorApplications = stage.factorApplications?.map((line) =>
          line.id === lineId
            ? { ...line, quantity, emissionKgCO2e: lineEmission(quantity, line.factorKgCO2e) }
            : line
        );
        return withRecomputedEmission({ ...stage, factorApplications });
      })
    );
    setHasChanges(true);
  };

  const handleRemoveFactorLine = (stageId: string, lineId: string) => {
    setStages((prev) =>
      prev.map((stage) => {
        if (stage.id !== stageId) return stage;
        const factorApplications = (stage.factorApplications || []).filter((line) => line.id !== lineId);
        if (!factorApplications.length) {
          return { ...stage, factorApplications: undefined, emissionKgCO2e: 0 };
        }
        return withRecomputedEmission({ ...stage, factorApplications });
      })
    );
    setHasChanges(true);
  };

  const handleSaveToCloud = async () => {
    const updatedModel: CarbonFootprintModel = {
      ...initialModel,
      functionalUnit: functionalUnitLabel,
      ...(selectedUnitId ? { selectedFunctionalUnitId: selectedUnitId } : {}),
      appliedFunctionalUnitScale: appliedScale,
      ...(initialModel.functionalUnitValidated || selectedUnitId ? { functionalUnitValidated: true } : {}),
      benchmarkComparison: benchmarkState,
      totalCarbonKgCO2e: Number(totalCarbonKgCO2e.toFixed(2)),
      lifecycleStages: stagesWithPct.map((s) => ({
        ...s,
        emissionKgCO2e: Number(s.emissionKgCO2e.toFixed(2)),
        percentage: Number(s.percentage.toFixed(1)),
      })),
      ademeReferenceFactors: ademeFactors,
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
              <a
                href={BASE_CARBONE_DOC_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-[#edf5f0] text-[#063428] border border-[#0b4a3a]/25 hover:bg-[#dfeee5] transition-colors"
                title={`Base Empreinte® / Base Carbone® ADEME — version figée ${BASE_CARBONE_VERSION} (index local, sans repli réseau)`}
              >
                <Database className="w-3 h-3 text-[#10634e]" />
                <span>ADEME Base Empreinte® · {BASE_CARBONE_VERSION}</span>
                <ExternalLink className="w-2.5 h-2.5" />
              </a>
            </div>
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2 text-base font-bold text-stone-900 font-heading">
                <span>Unité fonctionnelle :</span>
                <span className="text-[#10634e]">{functionalUnitLabel}</span>
                {(initialModel.functionalUnitValidated || selectedUnitId) && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#d8f3dc] text-[#063428] border border-emerald-300">
                    <CheckCircle2 className="w-3 h-3" /> Validée par l’utilisateur
                  </span>
                )}
              </div>
              {initialModel.functionalUnitOptions && initialModel.functionalUnitOptions.length === 4 && (
                <div className="space-y-1.5">
                  <p className="text-[11px] text-stone-500 leading-relaxed">
                    Choix {Math.max(1, initialModel.functionalUnitOptions.findIndex((o) => o.id === selectedUnitId) + 1)}/4
                    {appliedScale ? ` · échelle ×${appliedScale.toLocaleString('fr-FR', { maximumFractionDigits: 4 })}` : ''} parmi les 4 propositions des experts (bascule réversible sur quantités ADEME × facteur) :
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {initialModel.functionalUnitOptions.map((option, idx) => {
                      const active = option.id === selectedUnitId;
                      return (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() => handleSwitchFunctionalUnit(option.id)}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all cursor-pointer ${
                            active
                              ? 'bg-[#063428] text-white border-[#04211a] shadow-2xs'
                              : 'bg-[#fafbf9] hover:bg-[#edf5f0] text-stone-700 border-stone-200'
                          }`}
                          title={`${option.proposedBy} — ${option.rationale}`}
                        >
                          <Gauge className={`w-3 h-3 ${active ? 'text-emerald-300' : 'text-[#10634e]'}`} />
                          <span className="truncate max-w-[220px]">
                            {idx + 1}. {option.label}
                          </span>
                          <span className={`font-mono-numbers text-[10px] ${active ? 'text-emerald-200' : 'text-stone-500'}`}>
                            ×{option.scaleFactor}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
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
          <div className="p-4 rounded-xl bg-[#fafbf9] border border-stone-200/80 space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500 block">Empreinte Carbone Unitaire</span>
              {uncertaintySummary.totalLines > 0 && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#edf5f0] text-[#063428] border border-emerald-200 font-mono-numbers">
                  {uncertaintySummary.verifiedCount}/{uncertaintySummary.totalLines} V23.11
                </span>
              )}
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-black text-[#063428] font-mono-numbers">
                {totalCarbonKgCO2e > 0 ? totalCarbonKgCO2e.toFixed(2) : '—'}
              </span>
              <span className="text-xs font-semibold text-stone-600">
                {totalCarbonKgCO2e > 0 ? 'kg CO₂e / unité' : 'empreinte non calculée'}
              </span>
            </div>
            <p className="text-[11px] text-stone-600 font-medium">
              {totalCarbonKgCO2e > 0 && uncertaintySummary.totalLines > 0
                ? `Incertitude propagée ±${uncertaintySummary.relativePct}% [${uncertaintySummary.minKgCO2e.toFixed(2)} – ${uncertaintySummary.maxKgCO2e.toFixed(2)} kg CO₂e]`
                : 'Cycle complet du berceau à la tombe'}
            </p>
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
                {industryKg <= 0
                  ? 'Référence indisponible'
                  : isExcess
                  ? 'Sur-émission sectorielle'
                  : isCarbonSaving
                  ? 'Surperformance bas-carbone'
                  : 'Parité marché'}
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span
                className={`text-3xl font-black font-mono-numbers ${
                  isExcess ? 'text-rose-700' : isCarbonSaving ? 'text-[#10634e]' : 'text-stone-800'
                }`}
              >
                {industryKg <= 0 ? '—' : isExcess ? `+${absDiffPct}%` : isCarbonSaving ? `-${absDiffPct}%` : '0%'}
              </span>
              <span className="text-xs text-stone-600 font-mono-numbers font-medium">
                {industryKg > 0 ? `(Moyenne : ${industryKg.toFixed(2)} kg)` : 'référence sectorielle indisponible'}
              </span>
            </div>
            <p className="text-[11px] leading-tight text-stone-600">
              {industryKg <= 0
                ? 'Référence sectorielle non renseignée par le modèle : aucun écart calculé.'
                : isExcess
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

        {/* Factor-based calculation: stage = Σ(quantity × ADEME factor) */}
        <div className="space-y-3 pt-3 border-t border-slate-100">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <div>
              <span className="text-xs font-bold text-slate-900 block">
                Calcul par facteurs ADEME (quantité × facteur) :
              </span>
              <span className="text-[11px] text-slate-500">
                Postes / Intrants calibrés selon l'ACV et l'étude technique pour :{' '}
                <strong className="text-[#063428]">{functionalUnitLabel}</strong>
              </span>
            </div>
            <span className="text-[11px] text-slate-700 font-bold font-mono-numbers">
              Total recalculé : {totalCarbonKgCO2e.toFixed(2)} kg CO₂e
            </span>
          </div>
          <div className="space-y-2.5">
            {stagesWithPct.map((stage) => (
              <div key={stage.id} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/80">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${CATEGORY_COLORS[stage.category] || 'bg-slate-400'}`} />
                    <div className="min-w-0">
                      <span className="font-bold text-xs text-slate-900 block">{stage.name}</span>
                      <span className="text-[11px] text-slate-500 font-mono-numbers">
                        {stage.percentage.toFixed(1)}% du total · {stage.emissionKgCO2e.toFixed(2)} kg CO₂e
                        {stage.factorApplications?.length
                          ? ` · ${stage.factorApplications.length} poste${stage.factorApplications.length > 1 ? 's' : ''} ADEME`
                          : ''}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {!stage.factorApplications?.length && (
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={stage.emissionKgCO2e}
                          onChange={(e) => handleStageEmissionChange(stage.id, parseFloat(e.target.value) || 0)}
                          className="w-20 px-2 py-1.5 rounded-lg border border-slate-300 text-base sm:text-xs font-bold font-mono-numbers text-slate-900 text-right bg-white focus:outline-none focus:ring-1 focus:ring-emerald-700 min-h-[34px]"
                          aria-label={`Émission estimée pour ${stage.name}`}
                        />
                        <span className="text-xs text-slate-500">kg</span>
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => handleFocusStageCalculator(stage.id)}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-colors cursor-pointer ${
                        targetStageId === stage.id
                          ? 'bg-[#063428] text-white border-[#04211a]'
                          : 'bg-white hover:bg-[#edf5f0] text-[#063428] border-stone-300'
                      }`}
                      title="Sélectionner un facteur ADEME pertinent pour cette étape ACV"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Poste ADEME</span>
                    </button>
                  </div>
                </div>

                {!!stage.factorApplications?.length && (
                  <div className="mt-2.5 space-y-2 border-t border-slate-200 pt-2.5">
                    {stage.factorApplications.map((line) => {
                      const denom = getFactorDenominator(line.unit);
                      return (
                        <div
                          key={line.id}
                          className="p-2.5 rounded-lg bg-white border border-slate-200/80 space-y-1.5 text-[11px]"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                            <div className="min-w-0 flex-1 space-y-0.5">
                              <div className="flex flex-wrap items-center gap-1.5">
                                <span className="font-bold text-slate-900">
                                  {line.posteLabel || line.name}
                                </span>
                                {line.verifiedAdeme && (
                                  <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-[#d8f3dc] text-[#063428] border border-emerald-300">
                                    V23.11 vérifié
                                  </span>
                                )}
                                {line.iso14064Category && (
                                  <span className="px-1.5 py-0.2 rounded text-[9px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                                    {line.iso14064Category}
                                  </span>
                                )}
                              </div>
                              {line.posteLabel && line.posteLabel !== line.name && (
                                <span className="block text-[10px] text-slate-600 truncate" title={line.name}>
                                  Facteur ADEME : {line.name}
                                </span>
                              )}
                              <span className="block text-[10px] text-slate-500 font-mono-numbers">
                                {line.factorKgCO2e.toFixed(4)} kg CO₂e / {denom}
                                {line.ademeId ? ` · #${line.ademeId}` : ''}
                                {line.version ? ` · v${line.version}` : ''}
                                {line.geography ? ` · ${line.geography}` : ''}
                                {line.uncertaintyPct ? ` · ±${line.uncertaintyPct}%` : ''}
                              </span>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                              <input
                                type="number"
                                step="any"
                                min="0"
                                value={line.quantity}
                                onChange={(e) => handleFactorQuantityChange(stage.id, line.id, e.target.value)}
                                className="w-24 px-2 py-1 rounded-lg border border-slate-300 text-xs font-bold font-mono-numbers text-slate-900 text-right bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-700"
                                aria-label={`Quantité pour ${line.posteLabel || line.name}`}
                              />
                              <span className="text-[10px] font-semibold text-slate-500 max-w-[90px] truncate" title={denom}>
                                {denom}
                              </span>
                              <span className="text-slate-400 font-bold">×</span>
                              <span className="font-mono-numbers text-[10px] text-slate-600">
                                {line.factorKgCO2e.toFixed(3)}
                              </span>
                              <span className="text-slate-400 font-bold">=</span>
                              <span className="w-20 text-right font-extrabold font-mono-numbers text-[#063428]">
                                {line.emissionKgCO2e.toFixed(2)} kg
                              </span>
                              <button
                                type="button"
                                onClick={() => handleRemoveFactorLine(stage.id, line.id)}
                                className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                                aria-label={`Retirer ${line.posteLabel || line.name}`}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          {(line.technicalJustification || line.sourceBasis) && (
                            <p className="text-[10px] text-slate-600 bg-[#fafbf9] border border-slate-100 rounded-md px-2 py-1 leading-relaxed">
                              {line.sourceBasis && (
                                <strong className="text-[#063428] mr-1">[{line.sourceBasis}]</strong>
                              )}
                              {line.technicalJustification}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
          <p className="text-[10px] text-slate-500 leading-normal">
            Total et pourcentages recalculés automatiquement à partir des quantités et des facteurs ADEME. Une étape sans facteur affiché reste une estimation à confirmer.
          </p>
        </div>

        {/* ADEME Base Carbone® Reference Factors & Offline Calculator (frozen index) */}
        <div className="space-y-4 pt-4 border-t border-stone-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-[#063428] flex items-center gap-1.5">
                <Database className="w-4 h-4 text-[#10634e]" />
                <span>Calculateur &amp; Référentiel ADEME Base Empreinte® / Base Carbone®</span>
              </h4>
              <p className="text-[11px] text-stone-500 mt-0.5">
                Chaque poste est calculé par quantité × facteur ADEME (Base Empreinte® / Base Carbone® {BASE_CARBONE_VERSION}, index local figé, sans appel réseau), avec ID, version, unité et incertitude conservés.
              </p>
            </div>
          </div>

          {ademeFactors.length > 0 && (
            <div className="overflow-x-auto rounded-xl border border-stone-200 bg-[#fafbf9]">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-stone-200 bg-[#edf5f0] text-[#063428] font-bold text-[11px]">
                    <th className="py-2 px-3">ID ADEME</th>
                    <th className="py-2 px-3">Poste / Intrant</th>
                    <th className="py-2 px-3">Facteur d'émission</th>
                    <th className="py-2 px-3">Localisation &amp; Incertitude</th>
                    <th className="py-2 px-3">Étape ACV</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {ademeFactors.map((f, idx) => (
                    <tr key={`${f.id}-${idx}`} className="hover:bg-white transition-colors">
                      <td className="py-2 px-3 font-mono-numbers font-bold text-[#10634e] whitespace-nowrap">
                        #{f.id || 'ADEME'}
                      </td>
                      <td className="py-2 px-3 text-stone-800">
                        <span className="font-semibold block">
                          {f.name}
                          {f.attribute ? ` — ${f.attribute}` : ''}
                        </span>
                        <span className="text-[10px] text-stone-500 line-clamp-1">{f.category}</span>
                      </td>
                      <td className="py-2 px-3 font-mono-numbers font-extrabold text-[#063428] whitespace-nowrap">
                        {f.factorKgCO2e} <span className="font-normal text-stone-600">{f.unit}</span>
                      </td>
                      <td className="py-2 px-3 text-[11px] text-stone-600">
                        {f.geography}
                        {f.uncertaintyPct ? ` (±${f.uncertaintyPct}%)` : ''}
                      </td>
                      <td className="py-2 px-3 text-[11px] text-stone-700 font-medium">
                        {f.appliedStage || 'Référence audit'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Live ADEME Search & Apply Box */}
          <div id="ademe-calculator-box" className="p-4 rounded-xl border border-stone-200 bg-stone-50/70 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs">
                <span className="font-bold text-[#063428]">Étape ACV ciblée :</span>
                <select
                  value={targetStageId}
                  onChange={(e) => setTargetStageId(e.target.value)}
                  className="px-2.5 py-1 rounded-lg border border-stone-300 bg-white text-xs font-semibold text-stone-900"
                >
                  {stages.map((st) => (
                    <option key={st.id} value={st.id}>
                      {st.name} ({st.emissionKgCO2e.toFixed(2)} kg)
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="button"
                onClick={() => void fetchStageSuggestions(targetStageCategory)}
                disabled={isLoadingSuggestions}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-[#edf5f0] hover:bg-[#dfeee5] text-[#063428] border border-emerald-300/70 transition-colors cursor-pointer"
              >
                {isLoadingSuggestions ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Sparkles className="w-3 h-3 text-[#10634e]" />
                )}
                <span>Actualiser suggestions ACV</span>
              </button>
            </div>

            {ademeSuggestions.length > 0 && (
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500 block">
                  Postes / Intrants ADEME recommandés pour « {targetStageObj?.name || targetStageCategory} » :
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {ademeSuggestions.map((item) => {
                    const active = selectedAdemeFactor?.id === item.id;
                    return (
                      <button
                        key={`sug-${item.id}`}
                        type="button"
                        onClick={() => {
                          setSelectedAdemeFactor(item);
                          if (!ademeResults.some((r) => r.id === item.id)) {
                            setAdemeResults((prev) => [item, ...prev].slice(0, 12));
                          }
                        }}
                        className={`px-2.5 py-1 rounded-lg text-[11px] border text-left transition-all cursor-pointer ${
                          active
                            ? 'bg-[#063428] text-white border-[#04211a] font-bold'
                            : 'bg-white hover:bg-[#edf5f0] text-stone-700 border-stone-200 font-medium'
                        }`}
                        title={`${item.name} · ${item.geography} · #${item.id}`}
                      >
                        <span className="truncate max-w-[230px] inline-block align-bottom">
                          {item.name}
                        </span>{' '}
                        <span className={`font-mono-numbers text-[10px] ${active ? 'text-emerald-200' : 'text-[#10634e] font-bold'}`}>
                          ({item.factorKgCO2e} {item.unit})
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={ademeQuery}
                  onChange={(e) => setAdemeQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearchAdeme()}
                  placeholder="Rechercher un facteur ADEME (ex: électricité tunisie, PEHD, acier, carton, routier...)"
                  className="w-full pl-9 pr-3 py-2 rounded-lg border border-stone-300 bg-white text-xs text-stone-900 focus:outline-none focus:ring-1 focus:ring-[#10634e]"
                />
              </div>
              <button
                type="button"
                onClick={() => handleSearchAdeme()}
                disabled={isSearchingAdeme || !ademeQuery.trim()}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold bg-[#063428] hover:bg-[#0b4a3a] text-white disabled:opacity-40 transition-colors cursor-pointer shrink-0"
              >
                {isSearchingAdeme ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Search className="w-3.5 h-3.5" />
                )}
                <span>Rechercher ADEME</span>
              </button>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {[
                { label: 'Électricité Tunisie', q: 'Tunisie' },
                { label: 'Électricité PV', q: 'Electricité photovoltaïque' },
                { label: 'Gaz naturel', q: 'Gaz naturel kWh PCI' },
                { label: 'PEHD / Plastique', q: 'Plastique PEHD tonne' },
                { label: 'Emballage Carton', q: 'Emballages Carton' },
                { label: 'Fret routier (t.km)', q: '"Transport de marchandises" routier' },
              ].map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => handleSearchAdeme(preset.q)}
                  className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-white hover:bg-[#edf5f0] text-stone-700 hover:text-[#063428] border border-stone-200 transition-colors cursor-pointer"
                >
                  {preset.label}
                </button>
              ))}
            </div>

            {ademeError && (
              <p className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
                {ademeError}
              </p>
            )}

            {(ademeResults.length > 0 || selectedAdemeFactor) && (
              <div className="space-y-3">
                {ademeResults.length > 0 && (
                  <div className="max-h-52 overflow-y-auto rounded-lg border border-stone-200 bg-white divide-y divide-stone-100">
                    {ademeResults.map((item) => {
                      const isSelected = selectedAdemeFactor?.id === item.id;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setSelectedAdemeFactor(item)}
                          className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between gap-3 transition-colors cursor-pointer ${
                            isSelected ? 'bg-[#edf5f0] text-[#063428]' : 'hover:bg-stone-50 text-stone-700'
                          }`}
                        >
                          <div className="min-w-0">
                            <span className="font-bold block truncate">
                              #{item.id} — {item.name}
                              {item.attribute ? ` (${item.attribute})` : ''}
                            </span>
                            <span className="text-[10px] text-stone-500 block truncate">
                              {item.category} • {item.geography}
                            </span>
                          </div>
                          <span className="font-mono-numbers font-extrabold text-[#063428] shrink-0">
                            {item.factorKgCO2e} {item.unit}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {selectedAdemeFactor && (
                  <div className="p-3.5 rounded-lg border border-[#10634e]/35 bg-white space-y-3 text-xs">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] text-stone-600 font-mono-numbers">
                      <span>
                        <strong className="text-[#063428]">#{selectedAdemeFactor.id}</strong> · {selectedAdemeFactor.name} ·{' '}
                        {selectedAdemeFactor.version ? `v${selectedAdemeFactor.version}` : 'V23.11'}
                        {selectedAdemeFactor.uncertaintyPct ? ` · ±${selectedAdemeFactor.uncertaintyPct}%` : ''}
                        {selectedAdemeFactor.program ? ` · ${selectedAdemeFactor.program}` : ''}
                      </span>
                      <span className="font-bold text-[#063428]">
                        {selectedAdemeFactor.factorKgCO2e} {selectedAdemeFactor.unit}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-end">
                      <div className="sm:col-span-3 space-y-1">
                        <label className="text-[10px] font-bold uppercase text-stone-500 block">
                          Quantité saisie
                        </label>
                        <input
                          type="number"
                          step="any"
                          min="0"
                          value={ademeQuantity}
                          onChange={(e) => setAdemeQuantity(e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded-lg border border-stone-300 font-mono-numbers font-bold text-stone-900"
                        />
                      </div>

                      <div className="sm:col-span-3 space-y-1">
                        <label className="text-[10px] font-bold uppercase text-stone-500 block">
                          Unité d'entrée (conversion)
                        </label>
                        <select
                          value={ademeInputUnit}
                          onChange={(e) => setAdemeInputUnit(e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded-lg border border-stone-300 bg-white text-stone-900 font-medium"
                        >
                          {getCompatibleActivityUnits(selectedAdemeFactor.unit).map((u) => (
                            <option key={u.id} value={u.id}>
                              {u.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="sm:col-span-3 text-center sm:text-left">
                        <span className="text-[10px] uppercase font-bold text-stone-500 block">
                          Équiv. {getFactorDenominator(selectedAdemeFactor.unit)} & Impact
                        </span>
                        <span className="font-mono-numbers font-black text-sm text-[#10634e]">
                          {(convertedAdemeQty * selectedAdemeFactor.factorKgCO2e).toFixed(3)} kg CO₂e
                        </span>
                        <span className="block text-[10px] text-stone-500 font-mono-numbers">
                          {convertedAdemeQty.toFixed(4)} {getFactorDenominator(selectedAdemeFactor.unit)}
                        </span>
                      </div>

                      <div className="sm:col-span-3 flex gap-1.5 justify-end">
                        <button
                          type="button"
                          onClick={() => handleApplyAdemeFactor('add')}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#063428] hover:bg-[#0b4a3a] text-white font-bold cursor-pointer"
                          title="Ajouter une ligne de calcul (quantité × facteur) à l'étape sélectionnée"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Ajouter</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleApplyAdemeFactor('replace')}
                          className="px-2.5 py-1.5 rounded-lg border border-stone-300 hover:bg-stone-100 text-stone-800 font-semibold cursor-pointer"
                          title="Remplacer toutes les lignes de calcul de l'étape par cette seule ligne"
                        >
                          Remplacer
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <input
                        type="text"
                        value={ademePosteLabel}
                        onChange={(e) => setAdemePosteLabel(e.target.value)}
                        placeholder="Nom du poste / intrant dans le projet (optionnel, ex: Semelle PU injectée)"
                        className="w-full px-2.5 py-1.5 rounded-lg border border-stone-200 bg-stone-50 focus:bg-white text-[11px] text-stone-900"
                      />
                      <input
                        type="text"
                        value={ademeJustification}
                        onChange={(e) => setAdemeJustification(e.target.value)}
                        placeholder="Justification technique / ACV (optionnel, ex: 320g par paire selon nomenclature)"
                        className="w-full px-2.5 py-1.5 rounded-lg border border-stone-200 bg-stone-50 focus:bg-white text-[11px] text-stone-900"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
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
