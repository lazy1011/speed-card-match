// Fun emoji avatars assigned to players, UNO-style.
const AVATARS = ['🦊', '🐼', '🐸', '🦁', '🐯', '🐵', '🐧', '🦄', '🐶', '🐱', '🐰', '🐻'];

/**
 * Stable avatar for a player. Prefers a turn-order index (so each seat keeps the
 * same avatar); otherwise hashes the name.
 */
export function avatarFor(name: string, index?: number): string {
  if (typeof index === 'number' && index >= 0) {
    return AVATARS[index % AVATARS.length];
  }
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  }
  return AVATARS[hash % AVATARS.length];
}
