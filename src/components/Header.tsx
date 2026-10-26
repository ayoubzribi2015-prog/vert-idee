import React, { useState } from 'react';
import {
  Leaf,
  Cloud,
  History,
  ChevronDown,
  LogOut,
  Loader2,
  Bot,
} from 'lucide-react';
import { ProjectAudit, TabKey } from '../types';
import { User as FirebaseUser } from 'firebase/auth';

export type { TabKey };

export const LogoAPII: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div
    className={`flex items-center gap-3 px-3.5 py-1.5 rounded-xl bg-[#fafbf9] border border-stone-200/90 shadow-2xs hover:border-[#0b4a3a]/40 transition-all ${className}`}
    title="APII - Agence de Promotion de l'Industrie et de l'Innovation"
  >
    <div className="w-11 h-11 rounded-lg bg-white flex items-center justify-center shrink-0 border border-stone-200 overflow-hidden p-0.5">
      <img src="/assets/aistudio/Logo_APII_4be2db23.jpg" alt="APII" className="w-full h-full object-contain" />
    </div>
    <div className="leading-tight text-left">
      <div className="flex items-center gap-1.5">
        <span className="text-xs font-black tracking-tight text-[#063428] font-heading">APII</span>
      </div>
      <p className="text-[11px] font-medium text-stone-700 whitespace-nowrap">
        Industrie & Innovation
      </p>
    </div>
  </div>
);

export const LogoRNPE: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div
    className={`flex items-center gap-3 px-3.5 py-1.5 rounded-xl bg-[#fafbf9] border border-stone-200/90 shadow-2xs hover:border-[#0b4a3a]/40 transition-all ${className}`}
    title="RNPE - Réseau National des Pépinières d'Entreprises"
  >
    <div className="w-11 h-11 rounded-lg bg-white flex items-center justify-center shrink-0 border border-stone-200 overflow-hidden p-0.5">
      <img src="/assets/aistudio/logo_rnpe_page-0001_a99c9e81.jpg" alt="RNPE" className="w-full h-full object-contain" />
    </div>
    <div className="leading-tight text-left">
      <div className="flex items-center gap-1.5">
        <span className="text-xs font-black tracking-tight text-[#063428] font-heading">RNPE</span>
      </div>
      <p className="text-[11px] font-medium text-stone-700 whitespace-nowrap">
        Pépinières d'Entreprises
      </p>
    </div>
  </div>
);

interface HeaderProps {
  onNewProject: () => void;
  onOpenHistory: () => void;
  onDownloadWord: () => void;
  onNavigateTab: (tabKey: TabKey) => void;
  activeTab: TabKey;
  historyCount: number;
  hasActiveProject: boolean;
  activeProject?: ProjectAudit | null;
  projects?: ProjectAudit[];
  onSelectProject?: (id: string) => void;
  isDownloading: boolean;
  cloudSyncing: boolean;
  user?: FirebaseUser | null;
  onLogin?: () => void;
  onLogout?: () => void;
  isLoggingIn?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  onNewProject,
  onOpenHistory,
  onDownloadWord,
  onNavigateTab,
  activeTab,
  historyCount,
  hasActiveProject,
  activeProject,
  projects = [],
  onSelectProject,
  isDownloading,
  cloudSyncing,
  user,
  onLogin,
  onLogout,
  isLoggingIn,
}) => {
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 bg-[#fafbf9]/95 backdrop-blur-md border-b border-stone-200/90 shadow-2xs">
      {/* 1ère Ligne : Marque, Logos Institutionnels Principaux (APII & RNPE) & Compte utilisateur */}
      <div className="transition-all">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 sm:h-18 lg:h-20 gap-2 sm:gap-6">
            <div className="flex items-center gap-2 sm:gap-3.5 shrink-0">
              <div
                className="relative group cursor-pointer"
                onClick={onNewProject}
                title="Page d'accueil - Nouveau Diagnostic"
              >
                <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl logo-eco-leaf bg-[#063428] flex items-center justify-center text-white shadow-md shadow-[#04211a]/20 group-hover:scale-105 transition-transform">
                  <Leaf className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-200" />
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 sm:w-3.5 sm:h-3.5 bg-emerald-400 rounded-full border-2 border-white flex items-center justify-center">
                  <span className="w-1 h-1 sm:w-1.5 sm:h-1.5 bg-[#04211a] rounded-full" />
                </div>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span
                    onClick={onNewProject}
                    className="text-lg sm:text-2xl font-black tracking-tight text-[#063428] font-serif-title cursor-pointer hover:text-[#10634e] transition-colors"
                  >
                    Vert<span className="text-[#2d7a5e]">_</span>Idée
                  </span>
                </div>
                <p className="text-[11px] text-stone-600 font-medium hidden md:block">
                  Transition Écologique & Empreinte Carbone
                </p>
              </div>
            </div>

            {/* Logos Institutionnels Principaux (Desktop grands, Mobile compacts) */}
            <div className="hidden lg:flex items-center gap-3 shrink-0">
              <LogoAPII />
              <LogoRNPE />
            </div>

            {/* Mobile compact partner badges */}
            <div className="flex lg:hidden items-center gap-1.5 shrink-0" title="APII & RNPE Partenaires Officiels">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-white border border-stone-200 flex items-center justify-center p-0.5 shadow-2xs">
                <img src="/assets/aistudio/Logo_APII_4be2db23.jpg" alt="APII" className="w-full h-full object-contain" />
              </div>
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-white border border-stone-200 flex items-center justify-center p-0.5 shadow-2xs">
                <img src="/assets/aistudio/logo_rnpe_page-0001_a99c9e81.jpg" alt="RNPE" className="w-full h-full object-contain" />
              </div>
            </div>

            <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
              {/* Statut Synchronisation Cloud */}
              {user && (
                <div
                  className="hidden xl:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-600"
                  title={`Synchronisé avec ${user.email}`}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      cloudSyncing ? 'bg-amber-500 animate-ping' : 'bg-emerald-500'
                    }`}
                  />
                  <Cloud className="w-4 h-4 text-slate-400" />
                  <span>{cloudSyncing ? 'Sync...' : 'Cloud'}</span>
                </div>
              )}
              {user ? (
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-xl border border-emerald-300 hover:border-emerald-500 bg-emerald-50/60 hover:bg-emerald-100/60 transition-all text-xs font-bold text-emerald-950 shadow-2xs"
                    title={`Connecté avec Gmail : ${user.email}`}
                  >
                    {user.photoURL ? (
                      <img
                        src={user.photoURL}
                        alt="Avatar"
                        className="w-7 h-7 rounded-lg object-cover border border-emerald-500"
                      />
                    ) : (
                      <div className="w-7 h-7 rounded-lg bg-emerald-700 text-white flex items-center justify-center text-xs font-bold">
                        {(user.displayName || user.email || 'U')[0].toUpperCase()}
                      </div>
                    )}
                    <div className="text-left hidden md:block">
                      <span className="block text-xs font-extrabold text-slate-800 leading-none">
                        {user.displayName || 'Accès Gmail'}
                      </span>
                      <span className="block text-[10px] text-emerald-800 font-mono-numbers truncate max-w-[130px]">
                        {user.email}
                      </span>
                    </div>
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  </button>
                  {isUserMenuOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setIsUserMenuOpen(false)} />
                      <div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-xl border border-slate-200 p-3 z-50 animate-in fade-in slide-in-from-top-2 space-y-3">
                        <div className="flex items-center gap-2.5 pb-2.5 border-b border-slate-100">
                          {user.photoURL ? (
                            <img
                              src={user.photoURL}
                              alt="Avatar"
                              className="w-9 h-9 rounded-xl object-cover border border-emerald-500"
                            />
                          ) : (
                            <div className="w-9 h-9 rounded-xl bg-emerald-700 text-white flex items-center justify-center text-sm font-bold">
                              {(user.displayName || user.email || 'U')[0].toUpperCase()}
                            </div>
                          )}
                          <div className="overflow-hidden">
                            <span className="text-xs font-bold text-slate-900 block truncate">
                              {user.displayName || 'Utilisateur'}
                            </span>
                            <span className="text-[11px] text-slate-500 block truncate font-mono-numbers">
                              {user.email}
                            </span>
                          </div>
                        </div>
                        <div className="p-2.5 rounded-xl bg-emerald-50/70 border border-emerald-200/60 text-xs text-emerald-950 space-y-1">
                          <div className="flex items-center gap-1.5 font-bold text-emerald-800">
                            <Cloud className="w-3.5 h-3.5" />
                            <span>Historique Gmail Cloud</span>
                          </div>
                          <p className="text-[11px] text-emerald-800/90 leading-tight">
                            Vos audits sont rattachés à votre adresse Gmail et accessibles depuis n'importe où.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setIsUserMenuOpen(false);
                            onLogout && onLogout();
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-rose-700 hover:bg-rose-50 transition-colors"
                        >
                          <LogOut className="w-4 h-4 text-rose-600" />
                          <span>Se déconnecter de ce compte</span>
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <button
                  type="button"
                  onClick={onLogin}
                  disabled={isLoggingIn}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-white hover:bg-slate-50 border border-slate-300 hover:border-emerald-500 text-slate-800 transition-all shadow-2xs"
                  title="Se connecter avec Gmail pour sauvegarder vos audits"
                >
                  {isLoggingIn ? (
                    <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
                  ) : (
                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                    </svg>
                  )}
                  <span>Accès Gmail</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* 2ème Ligne : Historique & Assistant IA (Desktop & Tablette - sur mobile intégrés dans la barre inférieure native) */}
      <div className="hidden sm:block bg-[#f4f6f2]/90 backdrop-blur-md border-b border-stone-200/80 py-2 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-4 py-0.5">
            <div className="flex items-center gap-2.5 shrink-0">
              {user && (
                <button
                  type="button"
                  onClick={onOpenHistory}
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold text-stone-800 hover:text-stone-950 bg-white hover:bg-stone-50 border border-stone-300 shadow-2xs transition-all cursor-pointer"
                  title="Consulter l'historique de vos audits"
                >
                  <History className="w-3.5 h-3.5 text-[#10634e]" />
                  <span>Historique ({historyCount})</span>
                </button>
              )}
              {/* Sur petits écrans, afficher aussi APII et RNPE sur la 2ème ligne */}
              <div className="flex lg:hidden items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-white border border-stone-200 flex items-center justify-center p-1" title="APII">
                  <img src="/assets/aistudio/Logo_APII_4be2db23.jpg" alt="APII" className="w-full h-full object-contain" />
                </div>
                <div className="w-8 h-8 rounded-lg bg-white border border-stone-200 flex items-center justify-center p-1" title="RNPE">
                  <img src="/assets/aistudio/logo_rnpe_page-0001_a99c9e81.jpg" alt="RNPE" className="w-full h-full object-contain" />
                </div>
              </div>
            </div>

            <div className="shrink-0 ml-auto">
              <button
                onClick={() => onNavigateTab('assistant')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                  activeTab === 'assistant'
                    ? 'border-[#0b4a3a] bg-[#e5f1eb] text-[#063428] shadow-xs'
                    : 'bg-white hover:bg-[#fafbf9] text-[#063428] border-stone-300 shadow-2xs'
                }`}
              >
                <Bot className="w-3.5 h-3.5 text-[#10634e]" />
                <span>Assistant Éco-Conseil</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
