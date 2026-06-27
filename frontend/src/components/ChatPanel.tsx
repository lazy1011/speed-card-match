'use client';

import { useEffect, useRef, useState } from 'react';

export interface ChatMessage {
  id: string;
  playerName: string;
  text: string;
  timestamp: number;
}

interface ChatPanelProps {
  messages: ChatMessage[];
  onSend: (text: string) => void;
  myName: string;
  accentColor?: 'emerald' | 'rose' | 'yellow';
}

export default function ChatPanel({ messages, onSend, myName, accentColor = 'emerald' }: ChatPanelProps) {
  const [input, setInput] = useState('');
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);
  const prevLen = useRef(messages.length);

  const colorMap = {
    emerald: { badge: 'bg-emerald-500', btn: 'bg-emerald-600 hover:bg-emerald-500', border: 'border-emerald-900/40', bg: '#0d2018' },
    rose:    { badge: 'bg-rose-500',    btn: 'bg-rose-700 hover:bg-rose-600',       border: 'border-rose-900/40',    bg: '#1a0810' },
    yellow:  { badge: 'bg-yellow-400',  btn: 'bg-yellow-500 hover:bg-yellow-400',   border: 'border-yellow-900/30',  bg: '#0d2018' },
  };
  const c = colorMap[accentColor];

  useEffect(() => {
    if (messages.length > prevLen.current) {
      if (!open) setUnread(u => u + (messages.length - prevLen.current));
      else if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
    }
    prevLen.current = messages.length;
  }, [messages.length, open]);

  useEffect(() => {
    if (open) {
      setUnread(0);
      setTimeout(() => { if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight; }, 50);
    }
  }, [open]);

  const handleSend = () => {
    const t = input.trim();
    if (!t) return;
    onSend(t);
    setInput('');
  };

  return (
    <div className="fixed bottom-4 right-4 z-40">
      {/* Toggle button */}
      <button
        onClick={() => setOpen(o => !o)}
        className={`relative flex items-center gap-2 px-4 py-2.5 rounded-2xl font-bold text-white shadow-xl transition-all active:scale-95 ${c.btn}`}
      >
        💬 Chat
        {unread > 0 && (
          <span className={`absolute -top-2 -right-2 w-5 h-5 rounded-full ${c.badge} text-white text-xs font-black flex items-center justify-center`}>
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          className={`absolute bottom-12 right-0 w-72 rounded-3xl border ${c.border} shadow-2xl flex flex-col animate-fade-in-up overflow-hidden`}
          style={{ background: c.bg, height: 320 }}
        >
          <div className={`px-4 py-2.5 border-b ${c.border} flex items-center justify-between`}>
            <span className="text-white font-black text-sm">Game Chat</span>
            <button onClick={() => setOpen(false)} className="text-slate-500 hover:text-white text-xs font-bold">✕</button>
          </div>

          <div ref={listRef} className="flex-1 overflow-y-auto px-3 py-2 space-y-1.5">
            {messages.length === 0 && (
              <p className="text-slate-600 text-xs text-center mt-4 font-semibold">No messages yet</p>
            )}
            {messages.map((m) => (
              <div key={m.id} className={`flex flex-col ${m.playerName === myName ? 'items-end' : 'items-start'}`}>
                <span className="text-slate-500 text-[10px] font-semibold mb-0.5">{m.playerName}</span>
                <div
                  className={`px-3 py-1.5 rounded-2xl text-sm font-semibold max-w-[85%] break-words ${
                    m.playerName === myName
                      ? 'bg-emerald-700/60 text-white'
                      : 'bg-slate-700/60 text-slate-100'
                  }`}
                >
                  {m.text}
                </div>
              </div>
            ))}
          </div>

          <div className={`px-3 pb-3 pt-2 border-t ${c.border} flex gap-2`}>
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyPress={e => { if (e.key === 'Enter') handleSend(); }}
              placeholder="Type a message…"
              maxLength={200}
              className="flex-1 px-3 py-1.5 rounded-xl bg-slate-900/60 border border-slate-700/50 text-white text-sm placeholder-slate-600 focus:outline-none focus:border-slate-500"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim()}
              className={`px-3 py-1.5 rounded-xl font-bold text-white text-sm transition-all ${c.btn} disabled:opacity-40 disabled:cursor-not-allowed`}
            >
              ↑
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
