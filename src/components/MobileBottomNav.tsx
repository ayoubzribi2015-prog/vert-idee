import React, { useState } from 'react';
import {
  FileText,
  Leaf,
  Users,
  Rocket,
  Globe,
  Gauge,
  Award,
  Target,
  Bot,
  PlusCircle,
  Download,
  History,
  LogIn,
  X,
  Layers,
  ChevronRight,
} from 'lucide-react';
import { SIDEBAR_TABS, TabKey, ProjectAudit } from '../types';
import { User as FirebaseUser } from 'firebase/auth';

interface MobileBottomNavProps {
  activeTab: TabKey;
  onNavigateTab: (tabKey: TabKey) => void;
  hasActiveProject: boolean;
  activeProject?: ProjectAudit | null;
  onNewProject: () => void;
  onDownloadWord: () => void;
  onOpenHistory: () => void;
  isDownloading: boolean;
  historyCount: number;
  user?: FirebaseUser | null;
  onLogin?: () => void;
}

const getTabIcon = (key: TabKey) => {
  switch (key) {
    case 'synthesis': return <FileText className="w-4 h-4" />;
    case 'environmental': return <Leaf className="w-4 h-4" />;
    case 'social': return <Users className="w-4 h-4" />;
    case 'greenBusiness': return <Rocket className="w-4 h-4" />;
    case 'sdg': return <Globe className="w-4 h-4" />;
    case 'impact': return <Gauge className="w-4 h-4" />;
    case 'financing': return <Award className="w-4 h-4" />;
    case 'actionPlan': return <Target className="w-4 h-4" />;
    case 'assistant': return <Bot className="w-4 h-4" />;
    default: return <FileText className="w-4 h-4" />;
  }
};

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeTab,
  onNavigateTab,
  hasActiveProject,
  activeProject,
  onNewProject,
  onDownloadWord,
  onOpenHistory,
  isDownloading,
  historyCount,
  user,
  onLogin,
}) => {
  const [isSectionsSheetOpen, setIsSectionsSheetOpen] = useState(false);

  // Active section title lookup
  const currentTabItem = SIDEBAR_TABS.find((t) => t.key === activeTab);
  const activeLabel = activeTab === 'assistant' ? 'Assistant IA' : currentTabItem?.shortLabel || 'Diagnostic';

  return (
    <>
      {/* Fixed Bottom Navigation Bar for Smartphones */}
      <nav
        aria-label="Navigation mobile"
        className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-[#fafbf9]/95 backdrop-blur-md border-t border-stone-200/90 shadow-[0_-4px_20px_rgba(4,33,26,0.08)] px-2 py-1.5 pb-[max(0.5rem,env(safe-area-inset-bottom))]"
      >
        <div className="flex items-center justify-around gap-1 max-w-lg mx-auto">
          {/* Action 1: Sections Drawer Button */}
          {hasActiveProject ? (
            <button
              type="button"
              onClick={() => setIsSectionsSheetOpen(true)}
              className={`flex flex-col items-center justify-center gap-1 py-1 px-2.5 rounded-xl min-w-[58px] min-h-[48px] touch-manipulation active:scale-[0.96] transition-all ${
                activeTab !== 'assistant'
                  ? 'text-[#063428] font-bold'
                  : 'text-stone-500 hover:text-stone-800'
              }`}
            >
              <div className={`p-1 rounded-lg ${activeTab !== 'assistant' ? 'bg-[#edf5f0] text-[#10634e]' : 'text-stone-500'}`}>
                <Layers className="w-4 h-4" />
              </div>
              <span className="text-[10px] leading-tight truncate max-w-[68px]">
                {activeLabel}
              </span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onNewProject}
              className="flex flex-col items-center justify-center gap-1 py-1 px-2.5 rounded-xl min-w-[58px] min-h-[48px] text-[#063428] font-bold touch-manipulation active:scale-[0.96] transition-all"
            >
              <div className="p-1 rounded-lg bg-[#edf5f0] text-[#10634e]">
                <FileText className="w-4 h-4" />
              </div>
              <span className="text-[10px] leading-tight">Accueil</span>
            </button>
          )}

          {/* Action 2: Assistant IA */}
          <button
            type="button"
            onClick={() => onNavigateTab('assistant')}
            className={`flex flex-col items-center justify-center gap-1 py-1 px-2.5 rounded-xl min-w-[58px] min-h-[48px] touch-manipulation active:scale-[0.96] transition-all ${
              activeTab === 'assistant'
                ? 'text-[#063428] font-bold'
                : 'text-stone-500 hover:text-stone-800'
            }`}
          >
            <div className={`p-1 rounded-lg ${activeTab === 'assistant' ? 'bg-[#063428] text-emerald-300' : 'text-stone-500'}`}>
              <Bot className="w-4 h-4" />
            </div>
            <span className="text-[10px] leading-tight">Conseiller</span>
          </button>

          {/* Action 3: Nouveau Diagnostic */}
          <button
            type="button"
            onClick={onNewProject}
            className="flex flex-col items-center justify-center gap-1 py-1 px-2.5 rounded-xl min-w-[58px] min-h-[48px] text-stone-700 hover:text-[#063428] touch-manipulation active:scale-[0.96] transition-all"
            title="Démarrer un nouveau diagnostic"
          >
            <div className="p-1 rounded-lg text-emerald-700 hover:bg-emerald-50">
              <PlusCircle className="w-4 h-4" />
            </div>
            <span className="text-[10px] leading-tight font-medium">Nouveau</span>
          </button>

          {/* Action 4: Export Word (if active project) */}
          {hasActiveProject && (
            <button
              type="button"
              onClick={onDownloadWord}
              disabled={isDownloading}
              className="flex flex-col items-center justify-center gap-1 py-1 px-2.5 rounded-xl min-w-[58px] min-h-[48px] text-stone-700 hover:text-[#063428] disabled:opacity-50 touch-manipulation active:scale-[0.96] transition-all"
              title="Télécharger le rapport Word (.docx)"
            >
              <div className="p-1 rounded-lg text-[#10634e]">
                <Download className={`w-4 h-4 ${isDownloading ? 'animate-bounce' : ''}`} />
              </div>
              <span className="text-[10px] leading-tight font-medium">
                {isDownloading ? 'Export...' : 'Export Docx'}
              </span>
            </button>
          )}

          {/* Action 5: Historique Cloud or Connexion */}
          {user ? (
            <button
              type="button"
              onClick={onOpenHistory}
              className="flex flex-col items-center justify-center gap-1 py-1 px-2.5 rounded-xl min-w-[58px] min-h-[48px] text-stone-700 hover:text-[#063428] touch-manipulation active:scale-[0.96] transition-all"
              title="Consulter l'historique de vos audits"
            >
              <div className="relative p-1 rounded-lg text-stone-600">
                <History className="w-4 h-4" />
                {historyCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-[#10634e] text-white text-[9px] font-bold flex items-center justify-center">
                    {historyCount}
                  </span>
                )}
              </div>
              <span className="text-[10px] leading-tight font-medium">Historique</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onLogin}
              className="flex flex-col items-center justify-center gap-1 py-1 px-2.5 rounded-xl min-w-[58px] min-h-[48px] text-stone-700 hover:text-[#063428] touch-manipulation active:scale-[0.96] transition-all"
              title="Se connecter avec Gmail"
            >
              <div className="p-1 rounded-lg text-emerald-700">
                <LogIn className="w-4 h-4" />
              </div>
              <span className="text-[10px] leading-tight font-medium">Connexion</span>
            </button>
          )}
        </div>
      </nav>

      {/* Mobile Bottom Sheet: All 8 Sections Selector */}
      {isSectionsSheetOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex flex-col justify-end">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs animate-in fade-in"
            onClick={() => setIsSectionsSheetOpen(false)}
          />

          {/* Sheet Panel */}
          <div className="relative bg-white rounded-t-3xl border-t border-stone-200 p-5 max-h-[82vh] overflow-y-auto space-y-4 shadow-2xl animate-in slide-in-from-bottom duration-250 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
            {/* Sheet Handle */}
            <div className="w-12 h-1 bg-stone-300 rounded-full mx-auto -mt-1" />

            {/* Sheet Header */}
            <div className="flex items-center justify-between pb-2 border-b border-stone-200">
              <div>
                <h3 className="text-base font-black text-[#063428] font-serif-title">
                  Rubriques du Diagnostic
                </h3>
                <p className="text-xs text-stone-500">
                  Sélectionnez un volet pour y accéder directement
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsSectionsSheetOpen(false)}
                className="p-2 rounded-xl text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* List of 8 Sections */}
            <div className="space-y-1.5">
              {SIDEBAR_TABS.map((tab) => {
                const isActive = activeTab === tab.key;
                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => {
                      onNavigateTab(tab.key);
                      setIsSectionsSheetOpen(false);
                    }}
                    className={`w-full flex items-center justify-between p-3 rounded-2xl text-xs font-semibold transition-all border text-left touch-manipulation active:scale-[0.99] ${
                      isActive
                        ? 'bg-[#edf5f0] text-[#063428] border-[#0b4a3a]/40 shadow-2xs font-bold'
                        : 'bg-[#fafbf9] text-stone-700 border-stone-200/80 hover:bg-stone-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-xl ${isActive ? 'bg-[#063428] text-emerald-300' : 'bg-white text-[#10634e] border border-stone-200'}`}>
                        {getTabIcon(tab.key)}
                      </div>
                      <div>
                        <span className="block text-xs font-bold text-stone-900">
                          {tab.label}
                        </span>
                        <span className="block text-[11px] text-stone-500 font-normal">
                          {tab.shortLabel}
                        </span>
                      </div>
                    </div>
                    <ChevronRight className={`w-4 h-4 ${isActive ? 'text-[#10634e]' : 'text-stone-300'}`} />
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
