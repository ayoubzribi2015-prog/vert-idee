import React from 'react';
import {
  FileText,
  Leaf,
  Users,
  Rocket,
  Globe,
  Gauge,
  Award,
  Target,
  PlusCircle,
} from 'lucide-react';
import { SIDEBAR_TABS, TabKey } from '../types';

interface SidebarProps {
  activeTab: TabKey;
  onNavigateTab: (tabKey: TabKey) => void;
  hasActiveProject: boolean;
  onNewProject: () => void;
}

const getIcon = (key: TabKey) => {
  switch (key) {
    case 'synthesis': return <FileText className="w-4 h-4" />;
    case 'environmental': return <Leaf className="w-4 h-4" />;
    case 'social': return <Users className="w-4 h-4" />;
    case 'greenBusiness': return <Rocket className="w-4 h-4" />;
    case 'sdg': return <Globe className="w-4 h-4" />;
    case 'impact': return <Gauge className="w-4 h-4" />;
    case 'financing': return <Award className="w-4 h-4" />;
    case 'actionPlan': return <Target className="w-4 h-4" />;
    default: return <FileText className="w-4 h-4" />;
  }
};

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onNavigateTab,
  hasActiveProject,
  onNewProject,
}) => {
  return (
    <aside
      dir="ltr"
      className="w-64 shrink-0 bg-[#fbfcf9] border-r border-stone-200/90 sticky top-[114px] self-start h-[calc(100vh-114px)] overflow-y-auto block z-20 text-left select-none"
    >
      <div className="p-3.5 space-y-2 text-left">
        {/* Nouveau diagnostic action placed before Rubriques du Diagnostic */}
        <div className="pb-2.5 border-b border-stone-200/70">
          <button
            type="button"
            onClick={onNewProject}
            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold bg-[#063428] hover:bg-[#0b4a3a] text-white active:scale-[0.98] transition-all shadow-2xs cursor-pointer border border-[#04211a] group"
            title="Démarrer un nouveau diagnostic écologique"
          >
            <PlusCircle className="w-4 h-4 text-emerald-300 group-hover:scale-110 transition-transform shrink-0" />
            <span className="tracking-wide">Nouveau diagnostic</span>
          </button>
        </div>

        <div className="px-3 pt-2 pb-1 mb-1 flex items-center justify-between">
          <p className="text-[10px] font-bold uppercase tracking-wider text-stone-500 text-left">
            Rubriques de l'Audit
          </p>
          <span className="text-[10px] text-stone-400 font-mono-numbers">8 volets</span>
        </div>
        {SIDEBAR_TABS.map((tab, idx) => {
          const isActive = hasActiveProject && activeTab === tab.key;
          const isDisabled = !hasActiveProject;

          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => onNavigateTab(tab.key)}
              disabled={isDisabled}
              title={tab.label}
              dir="ltr"
              className={`w-full flex items-start justify-start text-left gap-2.5 px-3 py-2 rounded-xl text-xs transition-all border ${
                isActive
                  ? 'border-[#0b4a3a]/40 bg-[#eaf4ef] text-[#063428] font-bold shadow-2xs'
                  : 'border-transparent text-stone-600 hover:text-stone-900 hover:bg-stone-100/70 font-medium'
              } ${isDisabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              <div className={`mt-0.5 shrink-0 ${isActive ? 'text-[#10634e]' : 'text-stone-400'}`}>
                {getIcon(tab.key)}
              </div>
              <span className="text-left leading-snug break-words">
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </aside>
  );
};
