import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Card Games',
    short_name: 'CardGames',
    description: 'Multiplayer card games — Speed Match, Bluff & Guess Who',
    start_url: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#0d0a24',
    theme_color: '#7c3aed',
    icons: [
      {
        src: '/icon.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
    categories: ['games', 'entertainment'],
    screenshots: [],
  };
}
