import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const size = { width: 512, height: 512 };
export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          background: 'linear-gradient(135deg, #0d0a24 0%, #1a1040 100%)',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 96,
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <div style={{ fontSize: 280, lineHeight: 1 }}>🃏</div>
          <div
            style={{
              color: '#a78bfa',
              fontSize: 56,
              fontWeight: 900,
              letterSpacing: -2,
              fontFamily: 'sans-serif',
            }}
          >
            CARDS
          </div>
        </div>
      </div>
    ),
    size,
  );
}
