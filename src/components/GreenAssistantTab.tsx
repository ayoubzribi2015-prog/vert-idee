import React, { useState, useRef, useEffect } from 'react';
import {
  Bot,
  Send,
  Loader2,
  Table2,
  Download,
  Cloud,
  CheckCircle2,
  Trash2,
} from 'lucide-react';
import { AssistantChatMessage, ProjectAudit } from '../types';
import { AssistantMessageRenderer } from './AssistantMessageRenderer';

interface GreenAssistantTabProps {
  project: ProjectAudit | null;
  onSaveProjectChat?: (projectId: string, messages: AssistantChatMessage[]) => Promise<void> | void;
  onDownloadDiscussionWord?: (messages: AssistantChatMessage[]) => Promise<void> | void;
  isDownloadingWord?: boolean;
  isAuthenticated?: boolean;
}

const WELCOME_MESSAGE_CONTENT =
  "### Prêt pour un conseil ciblé et structuré\nPosez-moi votre question : je vous répondrai avec une **synthèse claire**, une **analyse narrative approfondie**, des **tableaux comparatifs** et des **graphiques** à l'appui pour faciliter la prise de décision.";

const STARTER_PROMPTS = [
  'Fais un tableau des actions prioritaires pour réduire mon bilan carbone (avec graphique)',
  'Quels financements verts (ANME, FODEP, BERD) sont adaptés ? Résume en tableau',
  'Synthétise les principaux risques environnementaux et leurs mitigations en tableau',
];

export const GreenAssistantTab: React.FC<GreenAssistantTabProps> = ({
  project,
  onSaveProjectChat,
  onDownloadDiscussionWord,
  isDownloadingWord = false,
  isAuthenticated = false,
}) => {
  const [messages, setMessages] = useState<AssistantChatMessage[]>(
    () => project?.assistantHistory || []
  );
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const lastProjectIdRef = useRef<string | null>(project?.id ?? null);

  // Sync local messages when switching projects or when persisted history loads from cloud
  useEffect(() => {
    const incomingId = project?.id ?? null;
    const incomingHistory = project?.assistantHistory || [];

    if (incomingId !== lastProjectIdRef.current) {
      lastProjectIdRef.current = incomingId;
      setMessages(incomingHistory);
      setConfirmClear(false);
      return;
    }

    if (!isLoading && incomingHistory.length > messages.length) {
      setMessages(incomingHistory);
    }
  }, [project?.id, project?.assistantHistory, isLoading, messages.length]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, isLoading]);

  const sendMessage = async (textToSend: string) => {
    if (!textToSend.trim() || isLoading) return;

    const targetProjectId = project?.id ?? null;
    const userMessage = textToSend.trim();
    const userMsg: AssistantChatMessage = {
      id: `msg_${Date.now()}_u`,
      role: 'user',
      content: userMessage,
      createdAt: new Date().toISOString(),
    };

    const historyForApi = messages.map((m) => ({ role: m.role, content: m.content }));
    const nextAfterUser = [...messages, userMsg];

    setInput('');
    setConfirmClear(false);
    setMessages(nextAfterUser);
    setIsLoading(true);

    if (targetProjectId && onSaveProjectChat) {
      onSaveProjectChat(targetProjectId, nextAfterUser);
    }

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          history: historyForApi,
          projectContext: project,
        }),
      });

      const raw = await res.text();
      let data: any = null;
      if (raw.trim()) {
        data = JSON.parse(raw);
      }
      if (!res.ok) {
        throw new Error(data?.error || `Erreur serveur (${res.status})`);
      }

      if (data && data.success && data.reply) {
        const assistantMsg: AssistantChatMessage = {
          id: `msg_${Date.now()}_a`,
          role: 'assistant',
          content: data.reply,
          createdAt: new Date().toISOString(),
        };
        const finalMessages = [...nextAfterUser, assistantMsg];

        if (targetProjectId && onSaveProjectChat) {
          await onSaveProjectChat(targetProjectId, finalMessages);
        }
        if (lastProjectIdRef.current === targetProjectId) {
          setMessages(finalMessages);
        }
      } else {
        throw new Error(data?.error || `[Mode STRICT_IA] Réponse invalide du modèle d'intelligence artificielle.`);
      }
    } catch (error: any) {
      console.error('[Mode STRICT_IA] Chat error:', error);
      const errMsg =
        error?.message ||
        `[Mode STRICT_IA] Le modèle d'intelligence artificielle est indisponible ou n'a pas répondu. Conformément au Mode STRICT_IA, aucun fallback n'est autorisé.`;
      const errorAssistantMsg: AssistantChatMessage = {
        id: `msg_${Date.now()}_err`,
        role: 'assistant',
        content: `⚠️ **Erreur Mode STRICT_IA** :\n${errMsg}`,
        createdAt: new Date().toISOString(),
      };
      if (lastProjectIdRef.current === targetProjectId) {
        setMessages((prev) => [...prev, errorAssistantMsg]);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSend = () => {
    sendMessage(input);
  };

  const handleClearDiscussion = async () => {
    setMessages([]);
    setConfirmClear(false);
    if (project?.id && onSaveProjectChat) {
      await onSaveProjectChat(project.id, []);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-stone-200/90 shadow-2xs p-4 sm:p-6 h-[calc(100vh-270px)] sm:h-[620px] min-h-[420px] flex flex-col space-y-3 sm:space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b border-stone-200 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-lg bg-[#edf5f0] text-[#063428] border border-[#0b4a3a]/20 flex items-center justify-center shrink-0">
            <Bot className="w-5 h-5 text-[#10634e]" />
          </div>
          <div className="min-w-0">
            <h3 className="text-base sm:text-lg font-black text-[#063428] font-serif-title leading-tight">
              Éco-Conseiller AI Vert'Idée
            </h3>
            <p className="text-[11px] sm:text-xs text-stone-500 line-clamp-1 sm:line-clamp-none">
              Synthèse, analyse narrative, tableaux décisionnels et graphiques
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {project ? (
            <span
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#edf5f0] text-[#063428] border border-stone-200 text-[11px] font-semibold"
              title={
                isAuthenticated
                  ? "Les échanges sont automatiquement sauvegardés dans votre historique Cloud avec le projet."
                  : "Les échanges sont conservés avec ce projet pendant votre session."
              }
            >
              {isAuthenticated ? (
                <Cloud className="w-3.5 h-3.5 text-[#10634e]" />
              ) : (
                <CheckCircle2 className="w-3.5 h-3.5 text-[#10634e]" />
              )}
              <span>
                {messages.length > 0
                  ? isAuthenticated
                    ? `Sauvegardé (${messages.length} msg)`
                    : `Enregistré (${messages.length} msg)`
                  : isAuthenticated
                  ? 'Synchro Cloud active'
                  : 'Lié au projet'}
              </span>
            </span>
          ) : (
            <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#edf5f0] text-[#063428] border border-stone-200 text-[11px] font-semibold">
              <Table2 className="w-3.5 h-3.5 text-[#10634e]" />
              Tableaux &amp; Graphiques
            </span>
          )}

          {messages.length > 0 && onDownloadDiscussionWord && (
            <button
              type="button"
              onClick={() => onDownloadDiscussionWord(messages)}
              disabled={isDownloadingWord}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold bg-[#063428] hover:bg-[#0b4a3a] text-white border border-[#04211a] transition-all shadow-2xs cursor-pointer disabled:opacity-50"
              title="Télécharger cette discussion en document Word (.docx)"
            >
              {isDownloadingWord ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Download className="w-3.5 h-3.5" />
              )}
              <span>{isDownloadingWord ? 'Export...' : 'Export Word (.docx)'}</span>
            </button>
          )}

          {messages.length > 0 && !isLoading && (
            confirmClear ? (
              <div className="inline-flex items-center gap-1">
                <button
                  type="button"
                  onClick={handleClearDiscussion}
                  className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-rose-600 hover:bg-rose-700 text-white transition-colors cursor-pointer"
                >
                  Confirmer
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmClear(false)}
                  className="px-2 py-1.5 rounded-lg text-[11px] font-semibold bg-stone-100 hover:bg-stone-200 text-stone-700 transition-colors cursor-pointer"
                >
                  Annuler
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmClear(true)}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-stone-600 hover:text-rose-700 hover:bg-rose-50 border border-stone-200 transition-colors cursor-pointer"
                title="Effacer l'historique de cette discussion"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Effacer</span>
              </button>
            )
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-2 space-y-3 pr-1">
        {/* Static welcome card when conversation is empty */}
        {messages.length === 0 && (
          <div className="flex justify-start">
            <div className="max-w-[96%] sm:max-w-[90%] w-full sm:w-auto px-4 py-3 rounded-xl bg-[#fafbf9] border border-stone-200 text-stone-800 shadow-2xs">
              <AssistantMessageRenderer content={WELCOME_MESSAGE_CONTENT} />
            </div>
          </div>
        )}

        {messages.map((msg, idx) => (
          <div key={msg.id || idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'user' ? (
              <div className="max-w-[85%] sm:max-w-[75%] px-3.5 py-2.5 rounded-xl text-xs leading-relaxed bg-[#063428] text-white shadow-2xs whitespace-pre-wrap">
                {msg.content}
              </div>
            ) : (
              <div className="max-w-[96%] sm:max-w-[90%] w-full sm:w-auto px-4 py-3 rounded-xl bg-[#fafbf9] border border-stone-200 text-stone-800 shadow-2xs">
                <AssistantMessageRenderer content={msg.content} />
              </div>
            )}
          </div>
        ))}

        {messages.length === 0 && !isLoading && (
          <div className="pt-1 flex flex-wrap gap-2">
            {STARTER_PROMPTS.map((prompt, pIdx) => (
              <button
                key={pIdx}
                type="button"
                onClick={() => sendMessage(prompt)}
                className="text-left px-3 py-2 rounded-lg border border-stone-200 bg-white hover:bg-[#edf5f0] hover:border-[#10634e]/40 text-[11px] font-medium text-stone-700 hover:text-[#063428] transition-colors cursor-pointer"
              >
                {prompt}
              </button>
            ))}
          </div>
        )}

        {isLoading && (
          <div className="flex items-center gap-2 text-stone-500 text-xs italic px-1">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-[#10634e]" />
            L'éco-conseiller structure sa réponse (synthèse, analyse narrative, tableau &amp; graphique)...
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="pt-2 sm:pt-3 border-t border-stone-200 flex gap-2 shrink-0">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          className="flex-1 px-3.5 py-2.5 text-base sm:text-xs rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-[#10634e]/30 focus:border-[#10634e] min-h-[44px]"
          placeholder="Ex: Compare les leviers de réduction carbone en tableau..."
        />
        <button
          onClick={handleSend}
          disabled={isLoading || !input.trim()}
          className="px-4 py-2.5 bg-[#063428] text-white rounded-xl text-xs font-bold hover:bg-[#0b4a3a] disabled:opacity-40 transition-all shadow-2xs cursor-pointer border border-[#04211a] min-h-[44px] min-w-[44px] flex items-center justify-center touch-manipulation active:scale-[0.98]"
        >
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
};
