import React, { useState, useRef, useEffect } from 'react';
import { Bot, Send, Loader2, Table2 } from 'lucide-react';
import { ProjectAudit } from '../types';
import { AssistantMessageRenderer } from './AssistantMessageRenderer';

interface GreenAssistantTabProps {
  project: ProjectAudit | null;
}

const STARTER_PROMPTS = [
  'Fais un tableau des actions prioritaires pour réduire mon bilan carbone (avec graphique)',
  'Quels financements verts (ANME, FODEP, BERD) sont adaptés ? Résume en tableau',
  'Synthétise les principaux risques environnementaux et leurs mitigations en tableau',
];

export const GreenAssistantTab: React.FC<GreenAssistantTabProps> = ({ project }) => {
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>([
    {
      role: 'assistant',
      content:
        '### Prêt pour un conseil ciblé et structuré\nPosez-moi votre question : je vous répondrai de façon **synthétique**, avec **tableaux comparatifs** et **graphiques** à l\'appui pour faciliter la prise de décision.',
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, isLoading]);

  const sendMessage = async (textToSend: string) => {
    if (!textToSend.trim() || isLoading) return;

    const userMessage = textToSend.trim();
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      const history = messages.map((m) => ({ role: m.role, content: m.content }));

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          history,
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
        setMessages((prev) => [...prev, { role: 'assistant', content: data.reply }]);
      } else {
        throw new Error(data?.error || `[Mode STRICT_IA] Réponse invalide du modèle d'intelligence artificielle.`);
      }
    } catch (error: any) {
      console.error('[Mode STRICT_IA] Chat error:', error);
      const errMsg =
        error?.message ||
        `[Mode STRICT_IA] Le modèle d'intelligence artificielle est indisponible ou n'a pas répondu. Conformément au Mode STRICT_IA, aucun fallback n'est autorisé.`;
      setMessages((prev) => [...prev, { role: 'assistant', content: `⚠️ **Erreur Mode STRICT_IA** :\n${errMsg}` }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSend = () => {
    sendMessage(input);
  };

  return (
    <div className="bg-white rounded-xl border border-stone-200/90 shadow-2xs p-4 sm:p-6 h-[calc(100vh-270px)] sm:h-[600px] min-h-[400px] flex flex-col space-y-3 sm:space-y-4">
      <div className="flex items-center justify-between gap-3 pb-3 border-b border-stone-200 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-lg bg-[#edf5f0] text-[#063428] border border-[#0b4a3a]/20 flex items-center justify-center shrink-0">
            <Bot className="w-5 h-5 text-[#10634e]" />
          </div>
          <div className="min-w-0">
            <h3 className="text-base sm:text-lg font-black text-[#063428] font-serif-title leading-tight">
              Éco-Conseiller AI Vert'Idée
            </h3>
            <p className="text-[11px] sm:text-xs text-stone-500 line-clamp-1 sm:line-clamp-none">
              Réponses synthétiques avec tableaux décisionnels et graphiques visuels
            </p>
          </div>
        </div>
        <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#edf5f0] text-[#063428] border border-stone-200 text-[11px] font-semibold shrink-0">
          <Table2 className="w-3.5 h-3.5 text-[#10634e]" />
          Tableaux &amp; Graphiques
        </span>
      </div>

      <div className="flex-1 overflow-y-auto py-2 space-y-3 pr-1">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
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

        {messages.length === 1 && !isLoading && (
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
            L'éco-conseiller structure sa réponse (synthèse, tableau &amp; graphique)...
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
