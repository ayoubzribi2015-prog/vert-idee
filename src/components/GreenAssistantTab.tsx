import React, { useState } from 'react';
import { Bot, Send, Loader2 } from 'lucide-react';
import { ProjectAudit } from '../types';

interface GreenAssistantTabProps {
  project: ProjectAudit | null;
}

export const GreenAssistantTab: React.FC<GreenAssistantTabProps> = ({ project }) => {
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>([
    { role: 'assistant', content: 'Bonjour ! Je suis votre assistant expert en transition écologique. Comment puis-je vous aider à améliorer la maturité environnementale de votre projet ?' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSend = async () => {
    if (!input.trim()) return;
    
    const userMessage = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      const history = messages.map(m => ({ role: m.role, content: m.content }));
      
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          history,
          projectContext: project
        }),
      });

      const data = await res.json();
      
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Erreur lors de la conversation');
      }

      setMessages(prev => [...prev, { role: 'assistant', content: data.reply }]);
    } catch (error: any) {
      console.error('Chat error:', error);
      setMessages(prev => [...prev, { role: 'assistant', content: `Erreur: ${error?.message || 'Désolé, une erreur est survenue lors de l\'analyse.'}` }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-stone-200/90 shadow-2xs p-4 sm:p-6 h-[calc(100vh-270px)] sm:h-[560px] min-h-[380px] flex flex-col space-y-3 sm:space-y-4">
      <div className="flex items-center gap-3 pb-3 border-b border-stone-200 shrink-0">
        <div className="w-9 h-9 rounded-lg bg-[#edf5f0] text-[#063428] border border-[#0b4a3a]/20 flex items-center justify-center shrink-0">
          <Bot className="w-5 h-5 text-[#10634e]" />
        </div>
        <div>
          <h3 className="text-base sm:text-lg font-black text-[#063428] font-serif-title leading-tight">
            Éco-Conseiller AI Vert'Idée
          </h3>
          <p className="text-[11px] sm:text-xs text-stone-500 line-clamp-1 sm:line-clamp-none">
            Conseils stratégiques personnalisés sur votre ACV, écoconception et trajectoire bas-carbone
          </p>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto py-2 space-y-3 pr-1">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[90%] sm:max-w-[85%] px-3.5 py-2.5 rounded-xl text-xs leading-relaxed ${
              msg.role === 'user'
                ? 'bg-[#063428] text-white shadow-2xs'
                : 'bg-[#fafbf9] border border-stone-200 text-stone-800 shadow-2xs'
            }`}>
              {msg.content}
            </div>
          </div>
        ))}
        {isLoading && <div className="text-stone-400 text-xs italic">L'éco-conseiller analyse votre projet...</div>}
      </div>

      <div className="pt-2 sm:pt-3 border-t border-stone-200 flex gap-2 shrink-0">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          className="flex-1 px-3.5 py-2.5 text-base sm:text-xs rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-[#10634e]/30 focus:border-[#10634e] min-h-[44px]"
          placeholder="Ex: Comment réduire l'empreinte carbone du transport ?"
        />
        <button
          onClick={handleSend}
          disabled={isLoading}
          className="px-4 py-2.5 bg-[#063428] text-white rounded-xl text-xs font-bold hover:bg-[#0b4a3a] disabled:opacity-40 transition-all shadow-2xs cursor-pointer border border-[#04211a] min-h-[44px] min-w-[44px] flex items-center justify-center touch-manipulation active:scale-[0.98]"
        >
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
};
