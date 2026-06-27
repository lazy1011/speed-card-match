'use client';

import { useState } from 'react';
import { GW_QUESTIONS, GW_QUESTION_CATEGORIES } from '@/data/guessWhoData';

interface QuestionPickerProps {
  onAsk: (questionId: string) => void;
  onClose: () => void;
  askedQuestionIds: Set<string>;
}

const CATEGORY_ICONS: Record<string, string> = {
  'Gender': '⚧',
  'Hair Color': '💇',
  'Hair Style': '✂️',
  'Eyes': '👁',
  'Skin Tone': '🎨',
  'Accessories': '👓',
  'Facial Hair': '🧔',
  'Age': '🎂',
};

export default function QuestionPicker({ onAsk, onClose, askedQuestionIds }: QuestionPickerProps) {
  const [activeCategory, setActiveCategory] = useState(GW_QUESTION_CATEGORIES[0]);

  const categoryQuestions = GW_QUESTIONS.filter(q => q.category === activeCategory);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4"
      onClick={onClose}>
      <div
        className="w-full max-w-md rounded-3xl shadow-2xl overflow-hidden border border-slate-700/50 animate-fade-in-up"
        style={{ background: '#0d1a24' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <h2 className="text-lg font-black text-white">Ask a Question</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-xl font-bold w-8 h-8 flex items-center justify-center rounded-xl hover:bg-slate-700 transition-all">✕</button>
        </div>

        {/* Category tabs — horizontally scrollable */}
        <div className="flex gap-2 px-4 pb-3 overflow-x-auto scrollbar-none">
          {GW_QUESTION_CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                activeCategory === cat
                  ? 'bg-violet-600 text-white'
                  : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
              }`}
            >
              <span>{CATEGORY_ICONS[cat] ?? '•'}</span>
              <span>{cat}</span>
            </button>
          ))}
        </div>

        {/* Questions */}
        <div className="px-4 pb-5 space-y-2 max-h-72 overflow-y-auto">
          {categoryQuestions.map(q => {
            const alreadyAsked = askedQuestionIds.has(q.id);
            return (
              <button
                key={q.id}
                onClick={() => { if (!alreadyAsked) onAsk(q.id); }}
                disabled={alreadyAsked}
                className={`w-full text-left px-4 py-3 rounded-2xl text-sm font-semibold transition-all ${
                  alreadyAsked
                    ? 'bg-slate-800/40 text-slate-600 cursor-not-allowed'
                    : 'bg-slate-800/60 text-slate-200 hover:bg-violet-800/40 hover:text-white border border-transparent hover:border-violet-600/40 active:scale-95'
                }`}
              >
                <span className="text-slate-500 mr-2">{alreadyAsked ? '✓' : '?'}</span>
                {q.text}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
