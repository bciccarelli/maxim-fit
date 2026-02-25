import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export const alt = 'Maxim - Evidence-Based Health Protocols';
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = 'image/png';

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#0f1a14',
          backgroundImage:
            'radial-gradient(circle at 25% 25%, #1a2f22 0%, transparent 50%), radial-gradient(circle at 75% 75%, #1a2f22 0%, transparent 50%)',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              fontSize: 24,
              fontWeight: 500,
              color: '#6b9b7a',
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              marginBottom: 16,
            }}
          >
            Evidence-Based Health Optimization
          </div>
          <div
            style={{
              fontSize: 72,
              fontWeight: 700,
              color: '#e8ece9',
              textAlign: 'center',
              lineHeight: 1.1,
              maxWidth: 900,
            }}
          >
            Your daily protocol,
          </div>
          <div
            style={{
              fontSize: 72,
              fontWeight: 700,
              color: '#4a8c5e',
              textAlign: 'center',
              lineHeight: 1.1,
            }}
          >
            precisely engineered
          </div>
          <div
            style={{
              display: 'flex',
              gap: 32,
              marginTop: 48,
              color: '#8faa97',
              fontSize: 20,
            }}
          >
            <span>Schedule</span>
            <span style={{ color: '#4a5c4f' }}>|</span>
            <span>Diet</span>
            <span style={{ color: '#4a5c4f' }}>|</span>
            <span>Supplements</span>
            <span style={{ color: '#4a5c4f' }}>|</span>
            <span>Training</span>
          </div>
        </div>
        <div
          style={{
            position: 'absolute',
            bottom: 40,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 8,
              backgroundColor: '#2d5a3d',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 24,
              fontWeight: 700,
              color: '#e8ece9',
            }}
          >
            M
          </div>
          <span
            style={{
              fontSize: 28,
              fontWeight: 600,
              color: '#e8ece9',
            }}
          >
            Maxim
          </span>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
