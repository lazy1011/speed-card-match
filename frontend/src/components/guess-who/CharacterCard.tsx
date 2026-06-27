'use client';

import { GWCharacter } from '@/data/guessWhoData';

const SKIN_COLORS: Record<string, string> = {
  Light: '#f5d0b5', Tan: '#c8956c', Medium: '#a0674a', Dark: '#5c3021',
};
const HAIR_COLORS: Record<string, string> = {
  Black: '#1a1a1a', Brown: '#5c3d1e', Blonde: '#e8c84a', Red: '#c0392b',
  Grey: '#999999', White: '#e8e8e8',
};
const EYE_COLORS: Record<string, string> = {
  Brown: '#5c3d1e', Blue: '#3498db', Green: '#27ae60', Hazel: '#8b6914', Grey: '#7f8c8d',
};

function Avatar({ character }: { character: GWCharacter }) {
  const skin = SKIN_COLORS[character.skinTone] ?? '#f5d0b5';
  const hair = HAIR_COLORS[character.hairColor] ?? '#333';
  const eye = EYE_COLORS[character.eyeColor] ?? '#333';
  const isLong = character.hairStyle === 'Long';
  const isCurly = character.hairStyle === 'Curly';
  const isWavy = character.hairStyle === 'Wavy';

  return (
    <div className="relative mx-auto" style={{ width: 56, height: 70 }}>
      {/* Hat */}
      {character.hat && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2 text-lg leading-none z-20">🎩</div>
      )}

      {/* Long hair — left side curtain */}
      {!character.bald && isLong && (
        <div className="absolute rounded-b-xl z-0"
          style={{ backgroundColor: hair, width: 10, height: 38, top: 14, left: 2 }} />
      )}

      {/* Top hair / head */}
      {!character.bald && (
        <div className="absolute left-1/2 -translate-x-1/2 z-10"
          style={{
            backgroundColor: hair,
            width: isCurly ? 50 : isWavy ? 48 : 44,
            height: isCurly ? 20 : isWavy ? 18 : 16,
            top: 0,
            borderRadius: isCurly ? '50% 50% 30% 30%' : '60% 60% 20% 20%',
          }} />
      )}

      {/* Long hair — right side curtain */}
      {!character.bald && isLong && (
        <div className="absolute rounded-b-xl z-0"
          style={{ backgroundColor: hair, width: 10, height: 38, top: 14, right: 2 }} />
      )}

      {/* Curly bumps extra */}
      {!character.bald && isCurly && (
        <>
          <div className="absolute rounded-full z-10"
            style={{ backgroundColor: hair, width: 14, height: 14, top: -4, left: 6 }} />
          <div className="absolute rounded-full z-10"
            style={{ backgroundColor: hair, width: 14, height: 14, top: -6, left: 18 }} />
          <div className="absolute rounded-full z-10"
            style={{ backgroundColor: hair, width: 14, height: 14, top: -4, right: 6 }} />
        </>
      )}

      {/* Face */}
      <div className="absolute z-10 rounded-2xl"
        style={{ backgroundColor: skin, width: 44, height: 52, top: 12, left: 6 }}>

        {/* Eyes */}
        <div className="absolute flex gap-2.5" style={{ top: 14, left: 7 }}>
          <div className="rounded-full" style={{ width: 7, height: 7, backgroundColor: eye }} />
          <div className="rounded-full" style={{ width: 7, height: 7, backgroundColor: eye }} />
        </div>

        {/* Glasses overlay */}
        {character.glasses && (
          <div className="absolute" style={{ top: 10, left: 3, fontSize: 16, lineHeight: 1 }}>👓</div>
        )}

        {/* Mustache */}
        {character.mustache && !character.beard && (
          <div className="absolute text-center" style={{ top: 28, left: 0, right: 0, fontSize: 10 }}>
            <span style={{ color: hair, fontWeight: 900 }}>▬▬</span>
          </div>
        )}

        {/* Beard */}
        {character.beard && (
          <div className="absolute rounded-b-xl"
            style={{ backgroundColor: hair, opacity: 0.85, height: 16, left: 2, right: 2, bottom: 0 }}>
            {character.mustache && (
              <div className="text-center" style={{ fontSize: 8, paddingTop: 0 }}>
                <span style={{ color: skin }}>  </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bald shine */}
      {character.bald && (
        <div className="absolute rounded-full z-10"
          style={{ backgroundColor: skin, width: 44, height: 20, top: 10, left: 6, opacity: 0.6 }} />
      )}
    </div>
  );
}

interface CharacterCardProps {
  character: GWCharacter;
  state: 'active' | 'eliminated' | 'selected' | 'secret' | 'guess-target';
  onClick?: () => void;
  size?: 'sm' | 'md';
}

export default function CharacterCard({ character, state, onClick, size = 'md' }: CharacterCardProps) {
  const isEliminated = state === 'eliminated';
  const isSelected = state === 'selected';
  const isSecret = state === 'secret';
  const isGuessTarget = state === 'guess-target';
  const isSm = size === 'sm';

  return (
    <button
      onClick={onClick}
      disabled={!onClick}
      className={`
        relative flex flex-col items-center rounded-2xl border-2 transition-all select-none
        ${isSm ? 'p-1.5 gap-1' : 'p-2 gap-1.5'}
        ${isEliminated
          ? 'opacity-30 grayscale border-slate-700/30 bg-slate-900/40 cursor-pointer'
          : isSelected
          ? 'border-emerald-400 bg-emerald-900/30 ring-2 ring-emerald-400/40 shadow-lg shadow-emerald-900/40 cursor-default'
          : isSecret
          ? 'border-amber-400 bg-amber-900/20 ring-2 ring-amber-400/40 shadow-lg cursor-default'
          : isGuessTarget
          ? 'border-violet-400 bg-violet-900/20 ring-2 ring-violet-400/40 cursor-pointer hover:bg-violet-900/40 active:scale-95'
          : 'border-slate-700/50 bg-slate-800/60 cursor-pointer hover:border-slate-500 hover:bg-slate-700/60 active:scale-95'
        }
      `}
      title={character.name}
    >
      {isSelected && (
        <span className="absolute -top-2 -right-2 bg-emerald-500 text-white text-xs font-black rounded-full w-5 h-5 flex items-center justify-center z-20">★</span>
      )}
      {isSecret && (
        <span className="absolute -top-2 -right-2 bg-amber-500 text-white text-xs font-black rounded-full w-5 h-5 flex items-center justify-center z-20">?</span>
      )}

      <div className={isSm ? 'scale-75 origin-top' : ''}>
        <Avatar character={character} />
      </div>

      <span className={`font-black text-center leading-tight truncate w-full
        ${isSm ? 'text-[10px]' : 'text-xs'}
        ${isEliminated ? 'text-slate-600' : isSelected ? 'text-emerald-300' : isSecret ? 'text-amber-300' : 'text-white'}
      `}>
        {character.name}
      </span>

      {isEliminated && (
        <span className="absolute inset-0 flex items-center justify-center text-2xl opacity-60 pointer-events-none">✗</span>
      )}
    </button>
  );
}
