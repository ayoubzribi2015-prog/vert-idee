import React, { useState } from 'react';
import { X, Send } from 'lucide-react';

export interface Question {
  id: string;
  question: string;
  options: string[];
}

interface InformationRequestModalProps {
  isOpen: boolean;
  questions: Question[];
  onClose: () => void;
  onSubmit: (answers: Record<string, string>) => void;
}

export const InformationRequestModal: React.FC<InformationRequestModalProps> = ({
  isOpen,
  questions,
  onClose,
  onSubmit,
}) => {
  const [answers, setAnswers] = useState<Record<string, string>>({});

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-lg font-bold font-heading text-slate-900">Informations Complémentaires</h2>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
          {questions.map((q) => (
            <div key={q.id} className="space-y-2">
              <p className="text-sm font-semibold text-slate-800">{q.question}</p>
              <div className="space-y-1">
                {q.options.map((option) => (
                  <label key={option} className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer p-2 rounded-lg hover:bg-emerald-50">
                    <input
                      type="radio"
                      name={q.id}
                      value={option}
                      onChange={() => setAnswers({ ...answers, [q.id]: option })}
                      className="text-emerald-600"
                    />
                    {option}
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end">
          <button
            onClick={() => onSubmit(answers)}
            disabled={Object.keys(answers).length !== questions.length}
            className="px-5 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            Soumettre et Analyser
          </button>
        </div>
      </div>
    </div>
  );
};
