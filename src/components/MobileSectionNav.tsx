import React, { useRef, useEffect } from 'react';
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
} from 'lucide-react';
import { SIDEBAR_TABS, TabKey } from '../types';

interface MobileSectionNavProps {
  activeTab: TabKey;
  onNavigateTab: (tabKey: TabKey) => void;
  hasActiveProject: boolean;
}

const getSectionIcon = (key: TabKey) => {
  switch (key) {
    case 'synthesis': return <FileText className="w-3.5 h-3.5" />;
    case 'environmental': return <Leaf className="w-3.5 h-3.5" />;
    case 'social': return <Users className="w-3.5 h-3.5" />;
    case 'greenBusiness': return <Rocket className="w-3.5 h-3.5" />;
    case 'sdg': return <Globe className="w-3.5 h-3.5" />;
    case 'impact': return <Gauge className="w-3.5 h-3.5" />;
    case 'financing': return <Award className="w-3.5 h-3.5" />;
    case 'actionPlan': return <Target className="w-3.5 h-3.5" />;
    case 'assistant': return <Bot className="w-3.5 h-3.5" />;
    default: return <FileText className="w-3.5 h-3.5" />;
  }
};

export const MobileSectionNav: React.FC<MobileSectionNavProps> = ({
  activeTab,
  onNavigateTab,
  hasActiveProject,
}) => {
  const activeTabRef = useRef<HTMLButtonElement>(null);

  // Automatically scroll active tab into view horizontally
  useEffect(() => {
    if (activeTabRef.current) {
      activeTabRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center',
      });
    }
  }, [activeTab]);

  if (!hasActiveProject) return null;

  return (
    <div className="lg:hidden sticky top-[57px] sm:top-[73px] z-20 bg-[#fafbf9]/95 backdrop-blur-md border-b border-stone-200/90 shadow-2xs">
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar px-3 py-2 scroll-smooth">
        {SIDEBAR_TABS.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              ref={isActive ? activeTabRef : null}
              type="button"
              onClick={() => onNavigateTab(tab.key)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 transition-all border min-h-[40px] touch-manipulation active:scale-[0.98] ${
                isActive
                  ? 'bg-[#063428] text-white border-[#04211a] shadow-xs'
                  : 'bg-white hover:bg-stone-50 text-stone-700 border-stone-200/90'
              }`}
            >
              <span className={isActive ? 'text-emerald-300' : 'text-[#10634e]'}>
                {getSectionIcon(tab.key)}
              </span>
              <span>{tab.shortLabel}</span>
            </button>
          );
        })}

        {/* Assistant Tab in the horizontal switcher */}
        <button
          ref={activeTab === 'assistant' ? activeTabRef : null}
          type="button"
          onClick={() => onNavigateTab('assistant')}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 transition-all border min-h-[40px] touch-manipulation active:scale-[0.98] ${
            activeTab === 'assistant'
              ? 'bg-[#063428] text-white border-[#04211a] shadow-xs'
              : 'bg-[#edf5f0] text-[#063428] border-[#0b4a3a]/30'
          }`}
        >
          <Bot className={`w-3.5 h-3.5 ${activeTab === 'assistant' ? 'text-emerald-300' : 'text-[#10634e]'}`} />
          <span>Éco-Conseiller AI</span>
        </button>
      </div>
    </div>
  );
};
