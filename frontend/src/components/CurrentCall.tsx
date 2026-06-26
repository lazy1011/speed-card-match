'use client';

import { CardValue } from '@/types/game';
import { cardValueToString } from '@/utils/cardUtils';

interface CurrentCallProps {
  currentCall: CardValue;
  stackSize: number;
}

export default function CurrentCall({ currentCall, stackSize }: CurrentCallProps) {
  return (
    <div className="flex items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-br from-indigo-600 to-blue-700 ring-1 ring-white/10 shadow-xl text-white">
      <div>
        <h2 className="text-xs font-bold tracking-[0.3em] text-blue-200">CURRENT CALL</h2>
        <p className="text-sm text-blue-200 mt-2">Match this value to claim the stack</p>
        <p className="text-xs text-blue-300 mt-1">{stackSize} cards on the table</p>
      </div>
      <div className="flex h-24 w-20 items-center justify-center rounded-xl bg-white text-indigo-700 text-5xl font-extrabold shadow-inner shrink-0">
        {cardValueToString(currentCall as CardValue)}
      </div>
    </div>
  );
}
