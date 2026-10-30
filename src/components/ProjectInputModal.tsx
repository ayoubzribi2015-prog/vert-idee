import React, { useState, useEffect } from 'react';
import { X, Sparkles, Lightbulb, Compass, MapPin, ArrowRight, CheckCircle2 } from 'lucide-react';
import { DescriptionFileInput } from './DescriptionFileInput';

interface ProjectInputModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    title: string;
    description: string;
    location: string;
    fullDocumentContent?: string;
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

export const ProjectInputModal: React.FC<ProjectInputModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  isLoading,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [fullDocumentContent, setFullDocumentContent] = useState('');
  const [loadingStep, setLoadingStep] = useState(0);

  const loadingSteps = [
    'Analyse de l\'idée & caractérisation de l\'ancrage territorial...',
    'Évaluation du cycle de vie (ACV) & risques environnementaux critiques...',
    'Diagnostic des aspects sociaux, conditions de travail et gouvernance RSE...',
    'Identification des opportunités d\'entrepreneuriat vert & modèles circulaires...',
    'Calcul de l\'empreinte carbone du produit (Facteurs Base Empreinte ADEME)...',
    'Alignement avec les Objectifs de Développement Durable (ODD de l\'ONU)...',
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

  if (!isOpen) return null;

  const handleApplyPreset = (preset: typeof PRESET_EXAMPLES[0]) => {
    setTitle(preset.title);
    setDescription(preset.description);
    setLocation(preset.location);
    setFullDocumentContent('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) return;
    await onSubmit({
      title,
      description,
      location: location.trim() || 'Tunisie',
      fullDocumentContent: fullDocumentContent.trim(),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm overflow-y-auto animate-in fade-in">
      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-8">
        {/* Header */}
        <div className="bg-[#064e3b] hero-eco-banner px-7 py-6 text-white flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="h-11 w-11 rounded-2xl bg-white/10 flex items-center justify-center backdrop-blur-md shadow-inner">
              <Compass className="w-6 h-6 text-emerald-200" />
            </div>
            <div>
              <h2 className="text-xl font-extrabold font-heading text-white">
                Nouveau Diagnostic Environnemental & Carbone
              </h2>
              <p className="text-xs text-emerald-100/90 mt-0.5">
                Renseignez les 3 informations clés de votre projet pour générer l'audit complet
              </p>
            </div>
          </div>
          {!isLoading && (
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white p-2 rounded-xl hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Loading Overlay */}
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
              <p className="text-sm text-emerald-700 font-semibold min-h-[40px] flex items-center justify-center">
                {loadingSteps[loadingStep]}
              </p>
              <p className="text-xs text-slate-400">
                Génération des 8 sections officielles et calcul de l'empreinte carbone
              </p>
            </div>
            {/* Progress indicators */}
            <div className="max-w-md mx-auto grid grid-cols-7 gap-1.5 pt-4">
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
          <form onSubmit={handleSubmit} className="p-7 space-y-6">
            {/* Presets Bar */}
            <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-2xl p-4">
              <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-900 mb-2.5">
                <Lightbulb className="w-4 h-4 text-emerald-600" />
                <span>Tester rapidement avec une idée inspirante :</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {PRESET_EXAMPLES.map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleApplyPreset(preset)}
                    className="text-xs px-3 py-1.5 rounded-xl bg-white border border-emerald-300 text-emerald-900 hover:bg-emerald-100 font-semibold transition-all shadow-2xs hover:scale-102"
                  >
                    {preset.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Field 1: Titre du projet / Produit */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-800 mb-2">
                Titre du projet / Produit <span className="text-emerald-600">*</span>
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: BioCoat - Emballage barrière compostable à base de caséine de lait"
                className="w-full px-4 py-3 rounded-2xl border border-slate-300 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/25 focus:border-emerald-600 transition-all shadow-2xs"
              />
            </div>

            {/* Field 2: Description de l'idée de projet & Proposition de valeur (supports file import) */}
            <DescriptionFileInput
              value={description}
              onChange={setDescription}
              onFullContentChange={setFullDocumentContent}
              onSuggestedTitle={(suggested) => {
                if (!title.trim()) setTitle(suggested);
              }}
              onSuggestedLocation={(suggestedLoc) => {
                if (!location.trim()) setLocation(suggestedLoc);
              }}
              currentTitle={title}
            />

            {/* Field 3: Lieu d'implantation */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-800 mb-2">
                Lieu d'implantation
              </label>
              <div className="relative">
                <MapPin className="w-4 h-4 text-emerald-600 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Ex: Bretagne (France), Lyon (Auvergne-Rhône-Alpes), Marseille, Tunisie, Europe..."
                  className="w-full pl-11 pr-4 py-3 rounded-2xl border border-slate-300 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/25 focus:border-emerald-600 transition-all shadow-2xs"
                />
              </div>
              <p className="text-[11px] text-slate-500 mt-1.5">
                Permet d'évaluer l'ancrage territorial, les gisements de matières locales, les circuits courts et les subventions régionales adaptées.
              </p>
            </div>

            {/* Footer Buttons */}
            <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl text-sm font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
              >
                Annuler
              </button>
              <button
                type="submit"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl text-sm font-bold bg-[#059669] btn-eco-gradient hover:opacity-90 active:scale-98 text-white transition-all shadow-md shadow-emerald-700/20"
              >
                <Sparkles className="w-4 h-4" />
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
