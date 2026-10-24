import React, { useState } from 'react';
import {
  X,
  Cloud,
  Calendar,
  Trash2,
  ChevronRight,
  FileDown,
  Search,
  CheckCircle2,
  ShieldCheck,
  Mail,
  MapPin,
} from 'lucide-react';
import { ProjectAudit } from '../types';
import { User as FirebaseUser } from 'firebase/auth';

interface HistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  projects: ProjectAudit[];
  activeProjectId: string | null;
  onSelectProject: (id: string) => void;
  onDeleteProject: (id: string) => void;
  onDownloadProjectWord: (project: ProjectAudit) => void;
  user?: FirebaseUser | null;
  onLogin?: () => void;
}

export const HistoryDrawer: React.FC<HistoryDrawerProps> = ({
  isOpen,
  onClose,
  projects,
  activeProjectId,
  onSelectProject,
  onDeleteProject,
  onDownloadProjectWord,
  user,
  onLogin,
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  if (!isOpen) return null;

  const filteredProjects = projects.filter((p) => {
    const term = searchTerm.toLowerCase();
    return (
      p.title.toLowerCase().includes(term) ||
      p.description.toLowerCase().includes(term) ||
      (p.sector && p.sector.toLowerCase().includes(term)) ||
      (p.location && p.location.toLowerCase().includes(term))
    );
  });

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/60 backdrop-blur-xs animate-in fade-in">
      <div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col border-l border-slate-200">
        {/* Header */}
        <div className="p-5 border-b border-stone-200 flex items-center justify-between bg-[#fafbf9]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-[#edf5f0] text-[#063428] border border-[#0b4a3a]/20 shadow-2xs">
              <Cloud className="w-5 h-5 text-[#10634e]" />
            </div>
            <div>
              <h3 className="font-black text-[#063428] font-serif-title text-base">
                Historique Cloud
              </h3>
              <p className="text-xs text-stone-500">
                {projects.length} {projects.length > 1 ? 'projets enregistrés' : 'projet enregistré'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-stone-400 hover:text-stone-700 hover:bg-stone-200/60 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* User Account / Gmail Banner */}
        <div className="p-4 bg-[#edf5f0] border-b border-stone-200/80">
          {user ? (
            <div className="flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-[#10634e] shrink-0 mt-0.5" />
              <div className="text-xs">
                <span className="font-bold text-[#063428] block">
                  Synchronisé avec votre compte Gmail
                </span>
                <span className="text-[11px] text-[#10634e] font-mono-numbers block truncate max-w-xs">
                  {user.email}
                </span>
                <p className="text-[10px] text-emerald-700 mt-1">
                  Accédez à vos audits environnementaux depuis n'importe quel ordinateur, smartphone ou tablette.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-start gap-2 text-xs text-slate-700">
                <Mail className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>
                  <strong>Sauvegardez vos audits par compte Gmail</strong> pour y accéder de n'importe où.
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  onLogin && onLogin();
                }}
                className="w-full py-2 px-3 rounded-xl bg-white hover:bg-slate-50 border border-slate-300 hover:border-emerald-500 text-xs font-bold text-slate-800 shadow-2xs transition-all flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>Se connecter avec Google / Gmail</span>
              </button>
            </div>
          )}
        </div>

        {/* Search Bar */}
        {projects.length > 3 && (
          <div className="p-3 border-b border-slate-100">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Rechercher par titre, secteur, lieu..."
                className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>
        )}

        {/* Project List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {filteredProjects.length === 0 ? (
            <div className="text-center py-12 px-4 space-y-3">
              <div className="w-12 h-12 mx-auto rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                <Cloud className="w-6 h-6" />
              </div>
              <p className="text-sm font-medium text-slate-700">Aucun projet trouvé</p>
              <p className="text-xs text-slate-500">
                {searchTerm
                  ? 'Aucun projet ne correspond à votre recherche.'
                  : 'Lancez votre premier diagnostic pour l\'enregistrer dans votre compte cloud.'}
              </p>
            </div>
          ) : (
            filteredProjects.map((proj) => {
              const isActive = proj.id === activeProjectId;
              const dateStr = new Date(proj.createdAt).toLocaleDateString('fr-FR', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              });

              return (
                <div
                  key={proj.id}
                  className={`p-4 rounded-2xl border transition-all ${
                    isActive
                      ? 'border-emerald-500 bg-emerald-50/50 shadow-xs ring-1 ring-emerald-500/30'
                      : 'border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50/80'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                      {proj.sector}
                    </span>
                    <div className="flex items-center gap-1">
                      <span className="text-xs font-bold text-emerald-800 font-mono-numbers px-2 py-0.5 rounded-full bg-emerald-100/80">
                        {proj.projectSynthesis?.scores?.globalScore ?? '--'}/100
                      </span>
                    </div>
                  </div>

                  <h4
                    onClick={() => {
                      onSelectProject(proj.id);
                      onClose();
                    }}
                    className="font-bold text-sm text-slate-900 hover:text-emerald-700 cursor-pointer line-clamp-2 leading-snug mb-1 font-heading"
                  >
                    {proj.title}
                  </h4>

                  <p className="text-xs text-slate-500 line-clamp-2 mb-3 leading-relaxed">
                    {proj.description}
                  </p>

                  <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-100">
                    <span className="flex items-center gap-1 text-[11px]">
                      <Calendar className="w-3 h-3" />
                      {dateStr}
                    </span>

                    <div className="flex items-center gap-1.5">
                      {/* Download Word directly from history */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDownloadProjectWord(proj);
                        }}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 transition-colors"
                        title="Télécharger le rapport Word (.docx)"
                      >
                        <FileDown className="w-4 h-4" />
                      </button>

                      {/* Delete */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm(`Supprimer définitivement "${proj.title}" du cloud ?`)) {
                            onDeleteProject(proj.id);
                          }
                        }}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                        title="Supprimer du cloud"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>

                      {/* View */}
                      <button
                        onClick={() => {
                          onSelectProject(proj.id);
                          onClose();
                        }}
                        className="inline-flex items-center gap-0.5 px-2.5 py-1 rounded-lg text-xs font-bold text-emerald-800 bg-emerald-100/80 hover:bg-emerald-200 transition-colors"
                      >
                        <span>Ouvrir</span>
                        <ChevronRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer info */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 text-xs text-slate-500 text-center flex items-center justify-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Stockage Cloud sécurisé (Google Cloud & Firestore)</span>
        </div>
      </div>
    </div>
  );
};
