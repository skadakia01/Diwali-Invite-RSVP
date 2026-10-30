import { ImageResponse } from 'next/og';
import { DATE_STR, FULL_TITLE, PARTY, TIME_STR } from '@/lib/party';

// The preview card WhatsApp / iMessage show when an invite link is shared.
export const alt = `${FULL_TITLE}: you're invited`;
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const marigolds = Array.from({ length: 25 }, (_, i) => i);

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          background: 'radial-gradient(ellipse at 50% 20%, #8e1b32 0%, #4a0b1c 45%, #1c030a 100%)', color: '#fbf4e6', position: 'relative',
        }}
      >
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, display: 'flex', justifyContent: 'space-between', padding: '0 10px' }}>
          {marigolds.map(i => (
            <div key={i} style={{ width: 34, height: 34, marginTop: Math.round(14 + 22 * Math.sin((Math.PI * (i % 5)) / 4)), borderRadius: 17, background: i % 3 ? '#f59e0b' : '#fcd34d', border: '5px dashed #ea580c' }} />
          ))}
        </div>
        <div style={{ fontSize: 26, letterSpacing: 12, color: '#f3d27a', marginTop: 50 }}>YOU ARE WARMLY INVITED TO</div>
        <div style={{ fontSize: 132, fontWeight: 700, color: '#f3d27a', marginTop: 10 }}>{PARTY.title}</div>
        <div style={{ fontSize: 40, marginTop: 6 }}>{DATE_STR}</div>
        <div style={{ fontSize: 30, color: 'rgba(251,244,230,.7)', marginTop: 8 }}>{TIME_STR}</div>
        <div style={{ display: 'flex', gap: 46, marginTop: 40 }}>
          {[0, 1, 2, 3, 4].map(i => (
            <div key={i} style={{ width: 22, height: 22, borderRadius: 11, background: '#ffcf6b', boxShadow: '0 0 34px 14px rgba(255,150,40,.65)' }} />
          ))}
        </div>
      </div>
    ),
    size,
  );
}
