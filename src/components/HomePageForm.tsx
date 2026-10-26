import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  MapPin,
  ArrowRight,
  Lightbulb,
  ShieldCheck,
  FileText,
  Gauge,
  Leaf,
  Users,
  Compass,
} from 'lucide-react';
import { DescriptionFileInput } from './DescriptionFileInput';

interface HomePageFormProps {
  onSubmit: (data: {
    title: string;
    description: string;
    location: string;
  }) => Promise<void>;
  isLoading: boolean;
}

const PRESET_EXAMPLES = [
  {
    name: 'Algopack (Bretagne)',
    title: 'Algopack Pro - Emballages bio-sourcés à base de macro-algues brunes',
    description: 'Production locale d\'emballages rigides et souples 100% biodégradables à partir de résidus de récolte d\'algues marines bretonnes, sans plastique fossile ni perturbateurs endocriniens, compostables à domicile en 60 jours.',
    location: 'Bretagne (France) - Côtes d\'Armor',
  },
  {
    name: 'Bouteille Consignée (Auvergne)',
    title: 'BoucleVerre - Réseau de bouteilles standardisées consignées et lavées',
    description: 'Mise en place d\'une filière régionale de collecte, tri et lavage industriel de bouteilles en verre réutilisables jusqu\'à 50 fois, mutualisant des formats de bouteilles standard pour éliminer le besoin de refonte du verre neuf.',
    location: 'Région Auvergne-Rhône-Alpes (France)',
  },
  {
    name: 'Isolant Mycélium (Normandie)',
    title: 'MycoIsol - Panneaux isolants thermiques et acoustiques en mycélium et paille locale',
    description: 'Production de panneaux d\'isolation thermique et phonique 100% compostables à bilan carbone négatif, obtenus par culture de mycélium de champignon sur des sous-produits de paille de chanvre et de lin locaux, sans dérivés pétrochimiques.',
    location: 'Normandie (France)',
  },
];

export const HomePageForm: React.FC<HomePageFormProps> = ({ onSubmit, isLoading }) => {
  // All fields start completely empty
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [loadingStep, setLoadingStep] = useState(0);

  const loadingSteps = [
    'Analyse de l\'idée de projet & caractérisation de l\'ancrage territorial...',
    'Évaluation du cycle de vie (ACV ISO 14040) & risques environnementaux critiques...',
    'Diagnostic des aspects sociaux, conditions de travail et gouvernance RSE...',
    'Identification des opportunités d\'entrepreneuriat vert & modèles circulaires...',
    'Calcul de l\'empreinte carbone du produit (Facteurs Base Empreinte ADEME)...',
    'Alignement avec les 17 Objectifs de Développement Durable (ODD de l\'ONU)...',
    'Finalisation du rapport aux 8 sections officielles & enregistrement cloud...',
  ];

  useEffect(() => {
    let interval: any;
    if (isLoading) {
      setLoadingStep(0);
      interval = setInterval(() => {
        setLoadingStep((prev) => (prev < loadingSteps.length - 1 ? prev + 1 : prev));
      }, 2300);
    }
    return () => clearInterval(interval);
  }, [isLoading]);

  const handleApplyPreset = (preset: typeof PRESET_EXAMPLES[0]) => {
    setTitle(preset.title);
    setDescription(preset.description);
    setLocation(preset.location);
  };

  const handleReset = () => {
    setTitle('');
    setDescription('');
    setLocation('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) return;
    await onSubmit({
      title: title.trim(),
      description: description.trim(),
      location: location.trim() || 'Tunisie',
    });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6">
      {/* Hero Welcome Banner */}
      <div className="relative overflow-hidden bg-gradient-to-br from-[#04211a] via-[#063428] to-[#0b4a3a] text-white rounded-2xl p-4 sm:p-7 sm:p-9 shadow-sm border border-[#0b4a3a]/60">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#2d7a5e]/10 rounded-full blur-3xl pointer-events-none -z-0" />

        <div className="relative z-10 space-y-2.5 sm:space-y-3.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider bg-white/10 text-emerald-200 border border-white/15">
              Diagnostic & Bilan Carbone
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium bg-[#04211a]/60 text-stone-200 border border-white/10">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Conforme 8 Rubriques Officielles</span>
            </span>
          </div>

          <h1 className="text-xl sm:text-3xl lg:text-4xl font-black text-white font-serif-title tracking-tight leading-tight">
            Évaluez l'impact écologique & l'empreinte carbone de votre projet vert
          </h1>

          <p className="text-xs sm:text-sm text-stone-200/90 max-w-2xl leading-relaxed font-light">
            Communiquez votre idée de produit ou d'entreprise écologique. Le moteur d'audit environnemental génère votre diagnostic complet (ACV ISO 14040, RSE, modèles circulaires, ODD, financements et plan d'action) avec calcul interactif de l'empreinte carbone et export Word (.docx).
          </p>

          {/* 3 Key Pillars preview */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3 pt-3 sm:pt-4 border-t border-white/10 text-xs">
            <div className="flex items-center gap-2 text-stone-200">
              <Leaf className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>ACV & Éco-conception ISO 14040</span>
            </div>
            <div className="flex items-center gap-2 text-stone-200">
              <Gauge className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Calculateur Carbone (kg CO₂e)</span>
            </div>
            <div className="flex items-center gap-2 text-stone-200">
              <Compass className="w-4 h-4 text-amber-300 shrink-0" />
              <span>Accompagnement Éco-Conseiller AI</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Diagnostic Card with Empty Fields */}
      <div className="bg-white rounded-2xl border border-stone-200/90 shadow-2xs overflow-hidden">
        {/* Card Header */}
        <div className="px-4 py-3.5 sm:px-7 sm:py-5 bg-slate-50/80 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900 font-heading">
              Nouveau Diagnostic Environnemental & Carbone
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Renseignez les 3 champs ci-dessous pour lancer l'analyse de votre idée
            </p>
          </div>

          {(title || description || location) && !isLoading && (
            <button
              type="button"
              onClick={handleReset}
              className="text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors self-start sm:self-auto"
            >
              Vider les champs
            </button>
          )}
        </div>

        {/* Loading State or Form */}
        {isLoading ? (
          <div className="p-12 text-center space-y-6">
            <div className="relative mx-auto w-24 h-24">
              <div className="absolute inset-0 rounded-full border-4 border-emerald-100 animate-pulse" />
              <div className="absolute inset-0 rounded-full border-4 border-emerald-600 border-t-transparent animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                <Sparkles className="w-9 h-9 text-emerald-600 animate-bounce" />
              </div>
            </div>
            <div className="space-y-2 max-w-md mx-auto">
              <h3 className="text-lg font-extrabold text-slate-900 font-heading">
                Expertise Environnementale en Cours
              </h3>
              <p className="text-sm text-emerald-700 font-semibold min-h-[44px] flex items-center justify-center px-4">
                {loadingSteps[loadingStep]}
              </p>
              <p className="text-xs text-slate-400">
                Génération des 8 sections officielles et calcul de l'empreinte carbone
              </p>
            </div>

            <div className="max-w-md mx-auto grid grid-cols-7 gap-1.5 pt-2">
              {loadingSteps.map((_, idx) => (
                <div
                  key={idx}
                  className={`h-2 rounded-full transition-all duration-500 ${
                    idx <= loadingStep ? 'bg-emerald-600 shadow-xs' : 'bg-slate-200'
                  }`}
                />
              ))}
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-4 sm:p-7 space-y-4 sm:space-y-6">
            {/* Field 1: Titre du projet / Produit (starts empty) */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-800 mb-1.5 sm:mb-2">
                Titre du projet / Produit <span className="text-emerald-600">*</span>
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: BioCoat - Emballage barrière compostable à base de caséine de lait"
                className="w-full px-3.5 sm:px-4 py-3 rounded-2xl border border-slate-300 text-base sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/25 focus:border-emerald-600 transition-all shadow-2xs min-h-[46px]"
              />
            </div>

            {/* Field 2: Description de l'idée de projet & Proposition de valeur (starts empty, supports file import) */}
            <DescriptionFileInput
              value={description}
              onChange={setDescription}
              onSuggestedTitle={(suggested) => {
                if (!title.trim()) setTitle(suggested);
              }}
              currentTitle={title}
            />

            {/* Field 3: Lieu d'implantation (starts empty) */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-800 mb-1.5 sm:mb-2">
                Lieu d'implantation
              </label>
              <div className="relative">
                <MapPin className="w-4 h-4 text-emerald-600 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Ex: Bretagne (France), Lyon (Auvergne-Rhône-Alpes), Marseille, Tunisie, Europe..."
                  className="w-full pl-11 pr-4 py-3 rounded-2xl border border-slate-300 text-base sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/25 focus:border-emerald-600 transition-all shadow-2xs min-h-[46px]"
                />
              </div>
              <p className="text-[11px] text-slate-500 mt-1.5">
                Permet d'évaluer l'ancrage territorial, les gisements de matières locales, les circuits courts et les subventions régionales adaptées.
              </p>
            </div>

            {/* Optional Presets Bar for Inspiration */}
            <div className="pt-2 border-t border-stone-100">
              <div className="flex items-center gap-1.5 text-xs font-bold text-stone-600 mb-2">
                <Lightbulb className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Tester en un clic un cas réel d'éco-entreprise :</span>
              </div>
              <div className="flex flex-wrap gap-1.5 sm:gap-2">
                {PRESET_EXAMPLES.map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleApplyPreset(preset)}
                    className="text-xs px-2.5 sm:px-3 py-1.5 rounded-lg bg-stone-50 border border-stone-200 hover:border-[#10634e]/50 hover:bg-[#edf5f0] text-stone-700 hover:text-[#063428] font-medium transition-all min-h-[34px] touch-manipulation active:scale-[0.98]"
                  >
                    {preset.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Submit Action */}
            <div className="pt-3 sm:pt-4 border-t border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <p className="text-xs text-stone-500 order-2 sm:order-1">
                Génération instantanée du rapport complet et calcul d'impact carbone.
              </p>

              <button
                type="submit"
                disabled={!title.trim() || !description.trim()}
                className="order-1 sm:order-2 w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-bold bg-[#063428] hover:bg-[#0b4a3a] border border-[#04211a] active:scale-[0.99] text-white transition-all shadow-sm disabled:opacity-40 cursor-pointer min-h-[48px] touch-manipulation"
              >
                <Sparkles className="w-4 h-4 text-emerald-300" />
                <span>Lancer le Diagnostic Expert</span>
                <ArrowRight className="w-4 h-4 ml-1" />
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
