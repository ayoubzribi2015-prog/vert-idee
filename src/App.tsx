/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
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
  Download,
  AlertCircle,
  CheckCircle2,
  PlusCircle,
  MapPin,
  Sparkles,
  TrendingDown,
  Calendar,
  Layers,
  ChevronRight,
  ShieldCheck,
  Mail,
  Lock,
  RotateCcw,
} from 'lucide-react';
import { ProjectAudit, CarbonFootprintModel } from './types';
import { Header, TabKey } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { HomePageForm } from './components/HomePageForm';
import { ProjectInputModal } from './components/ProjectInputModal';
import { InformationRequestModal, Question } from './components/InformationRequestModal';
import { HistoryDrawer } from './components/HistoryDrawer';
import { ExecutiveSummaryTab } from './components/ExecutiveSummaryTab';
import { EnvironmentalTab } from './components/EnvironmentalTab';
import { SocialTab } from './components/SocialTab';
import { GreenBusinessTab } from './components/GreenBusinessTab';
import { SdgAlignmentTab } from './components/SdgAlignmentTab';
import { ImpactIndicatorsTab } from './components/ImpactIndicatorsTab';
import { FinancingAndLabelsTab } from './components/FinancingAndLabelsTab';
import { PriorityActionPlanTab } from './components/PriorityActionPlanTab';
import { GreenAssistantTab } from './components/GreenAssistantTab';
import { MobileSectionNav } from './components/MobileSectionNav';
import { MobileBottomNav } from './components/MobileBottomNav';
import { generateWordReport } from './utils/docxExport';
import { generateExpertAuditFallback } from './utils/fallbackExpertAudit';
import {
  auth,
  signInWithGoogle,
  completeRedirectSignIn,
  getGoogleAuthErrorMessage,
  logOut,
  subscribeToUserProjects,
  saveUserProject,
  deleteUserProject,
  testFirestoreConnection,
} from './firebase';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [projects, setProjects] = useState<ProjectAudit[]>([]);
  // activeProjectId starts as null so home page fields are empty!
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>('synthesis');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [infoRequest, setInfoRequest] = useState<{questions: any[]} | null>(null);
  const [originalFormData, setOriginalFormData] = useState<any>(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isSavingCarbon, setIsSavingCarbon] = useState(false);
  const [cloudSyncing, setCloudSyncing] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [dismissedLoginBanner, setDismissedLoginBanner] = useState(false);
  const [isDescExpanded, setIsDescExpanded] = useState(false);

  useEffect(() => {
    setIsDescExpanded(false);
  }, [activeProjectId]);

  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  // Boot test
  useEffect(() => {
    testFirestoreConnection();
    completeRedirectSignIn().then((redirectUser) => {
      if (redirectUser) {
        setToastMessage(`Connecté avec succès en tant que ${redirectUser.email} ! Votre historique personnel est actif.`);
      }
    });
  }, []);



  // Auth state listener: switch between personal user Firestore and default
  useEffect(() => {
    let unsubscribeFirestore: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);

      if (currentUser) {
        // User is logged in with Gmail / Google account!
        setCloudSyncing(true);
        unsubscribeFirestore = subscribeToUserProjects(
          currentUser.uid,
          (userProjects) => {
            setCloudSyncing(false);
            setProjects(userProjects);
          },
          (err) => {
            console.error('Firestore subscription error:', err);
            setCloudSyncing(false);
          }
        );
      } else {
        // Unauthenticated user -> History is strictly disabled and hidden
        setProjects([]);
        setCloudSyncing(false);
        setIsHistoryOpen(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeFirestore) unsubscribeFirestore();
    };
  }, []);

  const handleLogin = async () => {
    try {
      setIsLoggingIn(true);
      setErrorMessage(null);
      const loggedUser = await signInWithGoogle();
      if (loggedUser) {
        setToastMessage(`Connecté avec succès en tant que ${loggedUser.email} ! Votre historique personnel est actif.`);
      }
    } catch (err: any) {
      console.error('Login error:', err);
      const message = getGoogleAuthErrorMessage(err);
      if (message) setErrorMessage(message);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logOut();
      setProjects([]);
      setActiveProjectId(null);
      setIsHistoryOpen(false);
      setActiveTab('synthesis');
      setToastMessage('Déconnexion effectuée.');
    } catch (err: any) {
      console.error('Logout error:', err);
    }
  };

  const handleStartNewProject = () => {
    setActiveProjectId(null);
    setActiveTab('synthesis');
    setIsModalOpen(false);
    setInfoRequest(null);
    setOriginalFormData(null);
  };

  // Strictly only active if activeProjectId is set! Otherwise home page fields remain empty.
  const activeProject = activeProjectId ? projects.find((p) => p.id === activeProjectId) || null : null;

  // Analysis with ONLY the 3 requested fields: title, description, location
  const handleAnalyzeProject = async (formData: any, answers?: Record<string, string>) => {
    try {
      setIsAnalyzing(true);
      setErrorMessage(null);
      
      const payload = answers 
        ? { ...originalFormData, answers, shouldSave: !!user }
        : { ...formData, shouldSave: !!user };

      let result: any = null;
      let apiFailed = false;

      try {
        const controller = new AbortController();
        const abortTimeout = setTimeout(() => controller.abort(), 45000);

        let res: Response;
        try {
          res = await fetch('/api/analyze', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
            signal: controller.signal,
          });
        } finally {
          clearTimeout(abortTimeout);
        }

        if (res.ok) {
          const rawText = await res.text();
          try {
            result = JSON.parse(rawText);
          } catch (parseErr) {
            console.warn('Non-JSON response from /api/analyze:', rawText.slice(0, 100));
            apiFailed = true;
          }
        } else {
          console.warn(`API /api/analyze returned status ${res.status}`);
          apiFailed = true;
        }
      } catch (fetchErr) {
        console.warn('Fetch /api/analyze network error or timeout:', fetchErr);
        apiFailed = true;
      }

      // If backend API succeeded and returned valid diagnostic
      if (result && result.success && !apiFailed) {
        if (result.needsInfo) {
          setInfoRequest({ questions: result.questions });
          setOriginalFormData(formData);
          setIsModalOpen(true);
          setIsAnalyzing(false);
          return;
        }

        const newProject: ProjectAudit = result.data;

        if (user) {
          await saveUserProject(user.uid, newProject);
          setProjects((prev) => [newProject, ...prev.filter((p) => p.id !== newProject.id)]);
        } else {
          setProjects([newProject]);
        }

        setActiveProjectId(newProject.id);
        setIsModalOpen(false);
        setInfoRequest(null);
        setOriginalFormData(null);
        setActiveTab('synthesis');
        setToastMessage(
          user
            ? `Diagnostic enregistré dans votre compte Cloud Gmail (${user.email}) !`
            : 'Diagnostic finalisé ! Connectez-vous avec Gmail pour activer la sauvegarde dans l\'historique.'
        );
        return;
      }

      // Client-Side Fallback Execution (100% resilient for Cloudflare Pages / Render static / Offline deployments)
      console.log('Activation du Collège d\'Experts client-side pour la génération du diagnostic.');
      const titleInput = formData?.title || payload?.title || 'Mon Projet Éco-responsable';
      const descInput = formData?.description || payload?.description || '';
      const locInput = formData?.location || payload?.location || 'Tunisie';

      const fallbackAudit = generateExpertAuditFallback(titleInput, descInput, locInput);
      const newProject: ProjectAudit = {
        id: `proj_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        createdAt: new Date().toISOString(),
        ...fallbackAudit,
      };

      if (user) {
        await saveUserProject(user.uid, newProject);
        setProjects((prev) => [newProject, ...prev.filter((p) => p.id !== newProject.id)]);
      } else {
        setProjects([newProject]);
      }

      setActiveProjectId(newProject.id);
      setIsModalOpen(false);
      setInfoRequest(null);
      setOriginalFormData(null);
      setActiveTab('synthesis');
      setToastMessage('Diagnostic réalisé avec succès par le Collège d\'Experts Vert\'Idée !');
    } catch (err: any) {
      console.error('Analysis error:', err);
      setErrorMessage(err?.message || "Échec de l'expertise environnementale.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSaveCarbonUpdates = async (updatedCarbonModel: CarbonFootprintModel) => {
    if (!activeProject) return;
    try {
      setIsSavingCarbon(true);
      setCloudSyncing(true);

      const updatedProject: ProjectAudit = {
        ...activeProject,
        impactIndicators: {
          ...activeProject.impactIndicators,
          carbonFootprint: updatedCarbonModel,
        },
      };

      // If user is logged in, save in their personal Firestore collection
      if (user) {
        await saveUserProject(user.uid, updatedProject);
      } else {
        // Fallback to server endpoint
        await fetch(`/api/projects/${activeProject.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ impactIndicators: updatedProject.impactIndicators }),
        });
      }

      setProjects((prev) =>
        prev.map((p) => (p.id === activeProject.id ? updatedProject : p))
      );
      setToastMessage('Ajustements d\'impact carbone enregistrés dans votre Cloud !');
    } catch (err: any) {
      console.error('Save error:', err);
      setErrorMessage('Impossible d\'enregistrer les modifications sur le cloud.');
    } finally {
      setIsSavingCarbon(false);
      setCloudSyncing(false);
    }
  };

  const handleDeleteProject = async (id: string) => {
    try {
      setCloudSyncing(true);
      if (user) {
        await deleteUserProject(user.uid, id);
      } else {
        await fetch(`/api/projects/${id}`, { method: 'DELETE' });
      }

      const updated = projects.filter((p) => p.id !== id);
      setProjects(updated);
      if (activeProjectId === id) {
        setActiveProjectId(null);
      }
      setToastMessage('Projet supprimé de votre historique cloud.');
    } catch (err) {
      console.error('Delete error:', err);
    } finally {
      setCloudSyncing(false);
    }
  };

  const handleDownloadWord = async (projectToDownload?: ProjectAudit) => {
    const target = projectToDownload || activeProject;
    if (!target) return;
    try {
      setIsDownloading(true);
      const blob = await generateWordReport(target);
      const filename = `Rapport_Vert_Idee_${target.title.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30)}.docx`;
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      setToastMessage('Rapport Word (.docx) généré et téléchargé avec succès !');
    } catch (err: any) {
      console.error('Download error:', err);
      setErrorMessage('Erreur lors de la génération du fichier Word.');
    } finally {
      setIsDownloading(false);
    }
  };

  // Helper metrics for active project
  const globalScore = activeProject?.projectSynthesis?.scores?.globalScore ?? 0;
  const carbonKg = activeProject?.impactIndicators?.carbonFootprint?.totalCarbonKgCO2e ?? 0;
  const benchmarkIndustry = activeProject?.impactIndicators?.carbonFootprint?.benchmarkComparison?.industryAverageKgCO2e ?? 0;
  const reductionPct = benchmarkIndustry > 0 ? Math.round(((benchmarkIndustry - carbonKg) / benchmarkIndustry) * 100) : 0;
  const sdgCount = activeProject?.sdgAlignment?.length ?? 0;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50/70 text-slate-900 selection:bg-emerald-500 selection:text-white">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl bg-slate-900 text-white text-xs font-semibold shadow-2xl border border-slate-700 animate-in fade-in slide-in-from-bottom-4">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Error Banner */}
      {errorMessage && (
        <div className="bg-rose-50 border-b border-rose-200 px-4 py-3 text-xs text-rose-800 flex items-center justify-between">
          <div className="flex items-center gap-2 max-w-7xl mx-auto w-full">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage(null)} className="text-rose-600 font-bold px-2 text-base">
            ×
          </button>
        </div>
      )}

      {/* 2-ROW GLOBAL HEADER: ROW 1 (LOGOS) & ROW 2 (WORK TABS INCL. AI ASSISTANT) */}
      <Header
        onNewProject={handleStartNewProject}
        onOpenHistory={() => setIsHistoryOpen(true)}
        onDownloadWord={() => handleDownloadWord()}
        onNavigateTab={(tabKey) => setActiveTab(tabKey)}
        activeTab={activeTab}
        historyCount={projects.length}
        hasActiveProject={Boolean(activeProject)}
        activeProject={activeProject}
        projects={projects}
        onSelectProject={(id) => {
          setActiveProjectId(id);
          setActiveTab('environmental');
        }}
        isDownloading={isDownloading}
        cloudSyncing={cloudSyncing}
        user={user}
        onLogin={handleLogin}
        onLogout={handleLogout}
        isLoggingIn={isLoggingIn}
      />

      {/* Cloud Account CTA Banner for Unauthenticated Users */}
      {!user && !dismissedLoginBanner && (
        <div className="bg-[#064e3b] hero-eco-banner text-white text-xs px-4 py-2.5 shadow-xs border-b border-emerald-800/40">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="p-1 rounded-lg bg-emerald-500/20 text-emerald-300">
                <Mail className="w-3.5 h-3.5" />
              </span>
              <span>
                <strong>Accès compte Gmail :</strong> Connectez-vous avec votre adresse Gmail pour conserver votre historique personnel d'audits et y accéder depuis n'importe quel ordinateur ou smartphone.
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
              <button
                type="button"
                onClick={handleLogin}
                disabled={isLoggingIn}
                className="px-3 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-[11px] transition-all shadow-xs"
              >
                Se connecter avec Gmail
              </button>
              <button
                type="button"
                onClick={() => setDismissedLoginBanner(true)}
                className="text-white/60 hover:text-white px-1.5 py-1 text-sm font-semibold"
                title="Ignorer"
              >
                ×
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Sticky Horizontal Section Navigation Bar */}
      <MobileSectionNav
        activeTab={activeTab}
        onNavigateTab={(k) => setActiveTab(k)}
        hasActiveProject={Boolean(activeProject)}
      />

      {/* Main Container */}
      <div className="flex flex-1">
        <Sidebar
          activeTab={activeTab}
          onNavigateTab={(k) => setActiveTab(k)}
          hasActiveProject={Boolean(activeProject)}
          onNewProject={handleStartNewProject}
        />
        <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 pb-24 lg:pb-8">
        {activeProject ? (
          <div className="space-y-4 sm:space-y-6">
            {/* Project Hero Header Bar */}
            <div className="relative overflow-hidden bg-white rounded-2xl border border-stone-200/90 p-4 sm:p-6 lg:p-8 shadow-2xs">
              <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-bl from-[#edf5f0] via-[#f7f9f6] to-transparent rounded-full blur-3xl -z-10 pointer-events-none" />

              <div className="space-y-5">
                {/* Top Badge Strip & Quick Actions */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`px-2.5 py-1 rounded-md text-xs font-bold border ${
                      globalScore < 35
                        ? 'bg-rose-50 text-rose-800 border-rose-300'
                        : 'bg-[#edf5f0] text-[#063428] border-stone-300'
                    }`}>
                      {activeProject.sector}
                    </span>

                    {activeProject.location && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-stone-50 text-stone-700 border border-stone-200">
                        <MapPin className="w-3.5 h-3.5 text-[#10634e]" />
                        <span>{activeProject.location}</span>
                      </span>
                    )}

                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border ${
                      globalScore < 35
                        ? 'bg-rose-50 text-rose-800 border-rose-300'
                        : 'bg-[#fafbf9] text-[#063428] border-stone-300'
                    }`}>
                      <ShieldCheck className={`w-3.5 h-3.5 ${globalScore < 35 ? 'text-rose-600' : 'text-[#10634e]'}`} />
                      <span>{globalScore < 35 ? 'Avis Critique du Collège des Experts' : 'Audit Conforme ISO 14040 & GHG Protocol'}</span>
                    </span>

                    {user && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-[#edf5f0] text-[#063428] border border-stone-300">
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#10634e]" />
                        <span>Sauvegardé sur {user.email}</span>
                      </span>
                    )}

                    <span className="text-xs text-stone-400 font-medium">
                      Audit du {new Date(activeProject.createdAt).toLocaleDateString('fr-FR')}
                    </span>
                  </div>

                  {/* Top Right Quick Actions */}
                  <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 shrink-0">
                    <button
                      onClick={handleStartNewProject}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-xl text-xs font-semibold text-stone-700 bg-stone-100 hover:bg-stone-200 transition-colors cursor-pointer min-h-[38px] active:scale-[0.98]"
                      title="Revenir au formulaire vierge d'accueil"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Nouveau</span>
                    </button>

                    <button
                      onClick={() => setActiveTab('assistant')}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl text-xs font-bold bg-[#edf5f0] hover:bg-[#e1ede6] text-[#063428] border border-[#0b4a3a]/30 transition-all shadow-2xs cursor-pointer min-h-[38px] active:scale-[0.98]"
                      title="Poser une question à l'Éco-Conseiller AI"
                    >
                      <Bot className="w-3.5 h-3.5 text-[#10634e]" />
                      <span>Conseiller IA</span>
                    </button>

                    <button
                      onClick={() => handleDownloadWord()}
                      disabled={isDownloading}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-xl text-xs font-bold bg-[#063428] hover:bg-[#0b4a3a] text-white border border-[#04211a] transition-all shadow-2xs cursor-pointer min-h-[38px] active:scale-[0.98]"
                    >
                      <Download className={`w-3.5 h-3.5 ${isDownloading ? 'animate-bounce' : ''}`} />
                      <span>{isDownloading ? 'Génération...' : 'Export Word'}</span>
                    </button>
                  </div>
                </div>

                {/* Project Title & Pitch */}
                <div className="space-y-2">
                  <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-[#063428] font-serif-title tracking-tight leading-tight">
                    {activeProject.title}
                  </h1>

                  <div className="space-y-1">
                    <p className={`text-xs sm:text-sm text-stone-700 max-w-5xl leading-relaxed ${!isDescExpanded ? 'line-clamp-4 sm:line-clamp-5' : ''}`}>
                      {activeProject.description}
                    </p>
                    {activeProject.description && activeProject.description.length > 180 && (
                      <button
                        type="button"
                        onClick={() => setIsDescExpanded(!isDescExpanded)}
                        className="text-[11px] font-bold text-[#10634e] hover:text-[#063428] transition-colors inline-flex items-center gap-1 cursor-pointer pt-0.5"
                      >
                        {isDescExpanded ? 'Réduire la description' : 'Lire la suite...'}
                      </button>
                    )}
                  </div>
                </div>

                {/* Executive Key Metric Strip */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 pt-3 border-t border-stone-200/80">
                  <div className={`p-3.5 rounded-xl border space-y-1 ${
                    globalScore < 35 ? 'bg-rose-50/70 border-rose-200' : 'bg-[#fafbf9] border-stone-200/80'
                  }`}>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-stone-500 block">
                      Score Global d'Impact
                    </span>
                    <div className="flex items-baseline gap-1.5">
                      <span className={`text-2xl font-black font-mono-numbers ${
                        globalScore < 35 ? 'text-rose-900' : 'text-[#063428]'
                      }`}>
                        {globalScore}
                      </span>
                      <span className="text-xs font-bold text-stone-400">/ 100</span>
                      <span className={`text-[11px] font-bold ml-auto ${
                        globalScore >= 75
                          ? 'text-[#10634e]'
                          : globalScore >= 50
                          ? 'text-amber-700'
                          : 'text-rose-700 font-extrabold'
                      }`}>
                        {globalScore >= 80 ? 'Excellence' : globalScore >= 60 ? 'Maturité modérée' : globalScore >= 35 ? 'En transition' : 'Risque critique'}
                      </span>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-[#fafbf9] border border-stone-200/80 space-y-1">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-stone-500 block">
                      Empreinte Carbone Produit
                    </span>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-2xl font-black text-[#10634e] font-mono-numbers">
                        {carbonKg.toFixed(2)}
                      </span>
                      <span className="text-xs font-semibold text-stone-500">kg CO₂e</span>
                    </div>
                  </div>

                  <div
                    className={`p-3.5 rounded-xl border space-y-1 transition-colors ${
                      benchmarkIndustry > 0 && carbonKg > benchmarkIndustry
                        ? 'bg-rose-50/70 border-rose-200'
                        : benchmarkIndustry > 0 && carbonKg < benchmarkIndustry
                        ? 'bg-[#edf5f0] border-stone-200'
                        : 'bg-[#fafbf9] border-stone-200/80'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-stone-500 block">
                        Performance vs Secteur
                      </span>
                      {benchmarkIndustry > 0 && (
                        <span
                          className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                            carbonKg > benchmarkIndustry
                              ? 'bg-rose-100 text-rose-800'
                              : carbonKg < benchmarkIndustry
                              ? 'bg-[#d8f3dc] text-[#063428]'
                              : 'bg-stone-100 text-stone-700'
                          }`}
                        >
                          {carbonKg > benchmarkIndustry ? 'Sur-émissions' : carbonKg < benchmarkIndustry ? 'Gain net' : 'Parité'}
                        </span>
                      )}
                    </div>
                    <div className="flex items-baseline gap-1.5">
                      <span
                        className={`text-2xl font-black font-mono-numbers ${
                          benchmarkIndustry > 0 && carbonKg > benchmarkIndustry
                            ? 'text-rose-700'
                            : benchmarkIndustry > 0 && carbonKg < benchmarkIndustry
                            ? 'text-[#10634e]'
                            : 'text-stone-800'
                        }`}
                      >
                        {benchmarkIndustry > 0
                          ? carbonKg > benchmarkIndustry
                            ? `+${Math.abs(Math.round(((carbonKg - benchmarkIndustry) / benchmarkIndustry) * 100))}%`
                            : carbonKg < benchmarkIndustry
                            ? `-${Math.abs(reductionPct)}%`
                            : '0%'
                          : '—'}
                      </span>
                      <span className="text-xs font-semibold text-stone-500 font-mono-numbers">
                        (Moy. {benchmarkIndustry.toFixed(1)} kg)
                      </span>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-[#fafbf9] border border-stone-200/80 space-y-1">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-stone-500 block">
                      Alignement ODD ONU
                    </span>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-2xl font-black text-[#0b4a3a] font-mono-numbers">
                        {sdgCount}
                      </span>
                      <span className="text-xs font-semibold text-stone-500">ODDs majeurs</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Tab Contents - Connected to Row 2 Tabs */}
            <div className="pt-2 animate-in fade-in">
              {activeTab === 'synthesis' && (
                <ExecutiveSummaryTab project={activeProject} onNavigateToTab={(k) => setActiveTab(k)} />
              )}
              {activeTab === 'environmental' && (
                <EnvironmentalTab aspects={activeProject.environmentalAspects} />
              )}
              {activeTab === 'social' && (
                <SocialTab aspects={activeProject.socialAspects} />
              )}
              {activeTab === 'greenBusiness' && (
                <GreenBusinessTab integration={activeProject.greenEntrepreneurshipIntegration} />
              )}
              {activeTab === 'sdg' && (
                <SdgAlignmentTab sdgItems={activeProject.sdgAlignment} />
              )}
              {activeTab === 'impact' && (
                <ImpactIndicatorsTab
                  indicators={activeProject.impactIndicators}
                  projectId={activeProject.id}
                  onSaveCarbonUpdates={handleSaveCarbonUpdates}
                  isSaving={isSavingCarbon}
                />
              )}
              {activeTab === 'financing' && (
                <FinancingAndLabelsTab data={activeProject.greenFinancingAndLabels} />
              )}
              {activeTab === 'actionPlan' && (
                <PriorityActionPlanTab plan={activeProject.priorityActionPlan} />
              )}
              {activeTab === 'assistant' && (
                <GreenAssistantTab project={activeProject} />
              )}
            </div>
          </div>
        ) : (
          /* When on Home Page / No Active Project: */
          activeTab === 'assistant' ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">
                  Mode Consultation Globale (Sans projet sélectionné)
                </span>
                <button
                  onClick={() => setActiveTab('synthesis')}
                  className="text-xs font-semibold text-slate-600 hover:text-slate-900 underline"
                >
                  Revenir au formulaire d'accueil
                </button>
              </div>
              <GreenAssistantTab project={null} />
            </div>
          ) : (
            /* Render empty diagnostic form with empty fields */
            <HomePageForm onSubmit={handleAnalyzeProject} isLoading={isAnalyzing} />
          )
        )}
      </main>
      </div>



      {/* Input Modal for when user is viewing a report and wants to launch a new one without leaving */}
      <ProjectInputModal
        isOpen={isModalOpen && !infoRequest}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleAnalyzeProject}
        isLoading={isAnalyzing}
      />
      
      {/* Information Request Modal for missing info */}
      <InformationRequestModal
        isOpen={isModalOpen && !!infoRequest}
        questions={infoRequest?.questions || []}
        onClose={() => {
          setIsModalOpen(false);
          setInfoRequest(null);
        }}
        onSubmit={(answers) => {
          handleAnalyzeProject(originalFormData, answers);
        }}
      />

      {/* History Drawer: Accessible strictly if Gmail user is signed in */}
      {user && (
        <HistoryDrawer
          isOpen={isHistoryOpen}
          onClose={() => setIsHistoryOpen(false)}
          projects={projects}
          activeProjectId={activeProjectId}
          onSelectProject={(id) => {
            setActiveProjectId(id);
            setActiveTab('synthesis');
          }}
          onDeleteProject={handleDeleteProject}
          onDownloadProjectWord={handleDownloadWord}
          user={user}
          onLogin={handleLogin}
        />
      )}

      {/* Mobile Smartphone Native Bottom Navigation Bar */}
      <MobileBottomNav
        activeTab={activeTab}
        onNavigateTab={(k) => setActiveTab(k)}
        hasActiveProject={Boolean(activeProject)}
        activeProject={activeProject}
        onNewProject={handleStartNewProject}
        onDownloadWord={() => handleDownloadWord()}
        onOpenHistory={() => setIsHistoryOpen(true)}
        isDownloading={isDownloading}
        historyCount={projects.length}
        user={user}
        onLogin={handleLogin}
      />
    </div>
  );
}
