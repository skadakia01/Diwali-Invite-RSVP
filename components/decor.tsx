// Hand-drawn Diwali ornaments as SVG. No client JS; all motion is CSS.
import { useId, type CSSProperties } from 'react';

type Props = { className?: string; style?: CSSProperties };
// useId() output contains characters that break url(#...) references, so keep it alphanumeric.
const useSvgId = () => useId().replace(/[^a-zA-Z0-9_-]/g, '');

export function Diya({ className = '', delay = 0 }: Props & { delay?: number }) {
  const id = useSvgId();
  return (
    <svg viewBox="0 0 120 120" className={className} aria-hidden>
      <defs>
        <radialGradient id={`${id}h`}>
          <stop offset="0" stopColor="#ffc35c" stopOpacity=".9" />
          <stop offset=".45" stopColor="#ff8a1e" stopOpacity=".3" />
          <stop offset="1" stopColor="#ff8a1e" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`${id}f`} cx=".5" cy=".78" r=".75">
          <stop offset="0" stopColor="#fffdf0" />
          <stop offset=".3" stopColor="#ffe066" />
          <stop offset=".65" stopColor="#ff9a1f" />
          <stop offset="1" stopColor="#e3460c" />
        </radialGradient>
        <linearGradient id={`${id}b`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#c8592a" />
          <stop offset=".55" stopColor="#8a3415" />
          <stop offset="1" stopColor="#4d1a08" />
        </linearGradient>
      </defs>
      <circle cx="60" cy="44" r="44" fill={`url(#${id}h)`} className="halo" style={{ animationDelay: `${delay}s` }} />
      <path d="M12 66 C18 92 40 104 60 104 C80 104 102 92 108 66 Z" fill={`url(#${id}b)`} />
      <path d="M26 82 Q60 98 94 82" fill="none" stroke="#f3d27a" strokeWidth="3" strokeDasharray="0.1 8" strokeLinecap="round" />
      <path d="M34 92 Q60 102 86 92" fill="none" stroke="#d4a017" strokeOpacity=".5" strokeWidth="1.5" />
      <ellipse cx="60" cy="66" rx="48" ry="8.5" fill="#3a1206" />
      <ellipse cx="60" cy="66" rx="48" ry="8.5" fill="none" stroke="#e8b44a" strokeWidth="2.5" />
      <path d="M60 58 V64" stroke="#2b1208" strokeWidth="2.5" strokeLinecap="round" />
      <g className="flame" style={{ animationDelay: `${delay}s` }}>
        <path d="M60 12 C70 30 74 44 60 60 C46 44 50 30 60 12 Z" fill={`url(#${id}f)`} />
        <path d="M60 34 C64 43 65 50 60 58 C55 50 56 43 60 34 Z" fill="#fffef5" opacity=".85" />
      </g>
    </svg>
  );
}

// Marigold garland with mango leaves, draped across the top of a section.
export function Toran({ className = '' }: Props) {
  const id = useSvgId();
  const W = 1200, swags = 6, step = W / swags;
  const flowers: { x: number; y: number; k: number }[] = [];
  for (let s = 0; s < swags; s++)
    for (let i = 0; i <= 10; i++) {
      const t = i / 10;
      flowers.push({ x: s * step + t * step, y: 8 + 30 * Math.sin(Math.PI * t), k: (s * 11 + i) % 3 });
    }
  return (
    <svg viewBox={`0 0 ${W} 130`} preserveAspectRatio="xMidYMin slice" className={className} aria-hidden>
      <defs>
        <symbol id={`${id}m0`} viewBox="-12 -12 24 24">
          <circle r="8.5" fill="#f59e0b" stroke="#ea580c" strokeWidth="4.5" strokeDasharray="1.5 1.8" strokeLinecap="round" />
          <circle r="4.6" fill="#fbbf24" stroke="#f97316" strokeWidth="2.6" strokeDasharray="1.1 1.3" />
          <circle r="1.6" fill="#9a3412" />
        </symbol>
        <symbol id={`${id}m1`} viewBox="-12 -12 24 24">
          <circle r="8.5" fill="#fcd34d" stroke="#f59e0b" strokeWidth="4.5" strokeDasharray="1.5 1.8" strokeLinecap="round" />
          <circle r="4.6" fill="#fde68a" stroke="#fbbf24" strokeWidth="2.6" strokeDasharray="1.1 1.3" />
          <circle r="1.6" fill="#b45309" />
        </symbol>
        <symbol id={`${id}l`} viewBox="-8 0 16 34" overflow="visible">
          <path d="M0 0 C7 8 7 22 0 34 C-7 22 -7 8 0 0 Z" fill="#3f7d32" />
          <path d="M0 2 V31" stroke="#24521f" strokeWidth="1" />
        </symbol>
      </defs>
      {Array.from({ length: swags + 1 }, (_, s) => (
        <g key={s} className="hang animate-sway" style={{ animationDelay: `${(s % 3) * -1.3}s` }}>
          {[-28, 0, 28].map(r => (
            <use key={r} href={`#${id}l`} x={s * step - 8} y={4} width="16" height="34" transform={`rotate(${r} ${s * step} 6)`} />
          ))}
          {[0, 1, 2, 3].map(i => (
            <use key={i} href={`#${id}m${i % 2}`} x={s * step - 10} y={22 + i * 18} width="20" height="20" />
          ))}
          <circle cx={s * step} cy={104} r="4" fill="#b91c1c" />
          <path d={`M${s * step} 108 l-3 12 M${s * step} 108 l0 13 M${s * step} 108 l3 12`} stroke="#d4a017" strokeWidth="1.5" />
        </g>
      ))}
      {flowers.map((f, i) => (
        <use key={i} href={`#${id}m${f.k === 2 ? 1 : 0}`} x={f.x - 12} y={f.y - 12} width="24" height="24" />
      ))}
    </svg>
  );
}

// Hanging paper lantern (akash kandil) that gently swings.
export function Lantern({ className = '', style, delay = 0 }: Props & { delay?: number }) {
  const id = useSvgId();
  return (
    <div className={`hang animate-swing ${className}`} style={{ ...style, animationDelay: `${delay}s` }} aria-hidden>
      <svg viewBox="0 0 80 230" className="h-full w-full overflow-visible">
        <defs>
          <linearGradient id={`${id}b`} x1="0" x2="1">
            <stop offset="0" stopColor="#7a0f1f" />
            <stop offset=".5" stopColor="#d9302f" />
            <stop offset="1" stopColor="#7a0f1f" />
          </linearGradient>
          <radialGradient id={`${id}g`}>
            <stop offset="0" stopColor="#ffd77a" stopOpacity=".95" />
            <stop offset="1" stopColor="#ff7a18" stopOpacity="0" />
          </radialGradient>
        </defs>
        <line x1="40" y1="0" x2="40" y2="62" stroke="#d4a017" strokeWidth="1.2" />
        <circle cx="40" cy="108" r="58" fill={`url(#${id}g)`} className="halo" style={{ animationDelay: `${delay}s` }} opacity=".55" />
        <rect x="28" y="60" width="24" height="8" rx="2" fill="#d4a017" />
        <path d="M40 68 C80 72 80 146 40 150 C0 146 0 72 40 68 Z" fill={`url(#${id}b)`} />
        <ellipse cx="40" cy="109" rx="16" ry="30" fill="#ffcf6b" opacity=".35" className="halo" />
        <g fill="none" stroke="#f3d27a" strokeOpacity=".55" strokeWidth="1">
          <path d="M40 68 C58 80 58 138 40 150" />
          <path d="M40 68 C22 80 22 138 40 150" />
          <path d="M40 68 V150" />
        </g>
        <ellipse cx="40" cy="88" rx="30" ry="4" fill="none" stroke="#d4a017" strokeWidth="2" />
        <ellipse cx="40" cy="130" rx="30" ry="4" fill="none" stroke="#d4a017" strokeWidth="2" />
        <rect x="30" y="150" width="20" height="7" rx="2" fill="#d4a017" />
        <g stroke="#d4a017" strokeWidth="1.4">
          {[-8, -4, 0, 4, 8].map(dx => <line key={dx} x1={40 + dx / 2} y1="157" x2={40 + dx} y2={212 - Math.abs(dx)} />)}
        </g>
        <circle cx="40" cy="160" r="3" fill="#b91c1c" />
      </svg>
    </div>
  );
}

// Rangoli-style mandala line art, inherits colour from `currentColor`.
export function Mandala({ className = '', style }: Props) {
  return (
    <svg viewBox="-100 -100 200 200" className={className} style={style} fill="none" stroke="currentColor" strokeWidth=".6" aria-hidden>
      {[10, 20, 34, 58, 86, 97].map(r => <circle key={r} r={r} />)}
      {Array.from({ length: 12 }, (_, i) => <ellipse key={`a${i}`} cy="-27" rx="5" ry="12" transform={`rotate(${i * 30})`} />)}
      {Array.from({ length: 16 }, (_, i) => <path key={`b${i}`} d="M0 -36 Q12 -48 0 -57 Q-12 -48 0 -36 Z" transform={`rotate(${i * 22.5})`} />)}
      {Array.from({ length: 24 }, (_, i) => <path key={`c${i}`} d="M0 -60 Q9 -73 0 -85 Q-9 -73 0 -60 Z" transform={`rotate(${i * 15})`} />)}
      {Array.from({ length: 48 }, (_, i) => <circle key={`d${i}`} cy="-92" r="1.3" fill="currentColor" stroke="none" transform={`rotate(${i * 7.5})`} />)}
      {Array.from({ length: 8 }, (_, i) => <path key={`e${i}`} d="M0 -10 L4 -16 L0 -20 L-4 -16 Z" fill="currentColor" stroke="none" transform={`rotate(${i * 45})`} />)}
    </svg>
  );
}

export function Ornament({ className = '' }: Props) {
  return (
    <svg viewBox="0 0 240 24" className={className} fill="currentColor" aria-hidden>
      <rect x="0" y="11.5" width="92" height="1" opacity=".6" />
      <rect x="148" y="11.5" width="92" height="1" opacity=".6" />
      <path d="M100 12 l4 -4 l4 4 l-4 4 Z" />
      <path d="M132 12 l4 -4 l4 4 l-4 4 Z" />
      <path d="M120 2 C125 8 126 13 120 20 C114 13 115 8 120 2 Z" />
      <circle cx="120" cy="22.5" r="1.2" />
    </svg>
  );
}

// Scalloped edge used where a dark section meets a paper one.
export function Scallop({ className = '', flip = false }: Props & { flip?: boolean }) {
  const d = Array.from({ length: 30 }, (_, i) => `Q${i * 40 + 20} 0 ${i * 40 + 40} 18`).join(' ');
  return (
    <svg viewBox="0 0 1200 24" preserveAspectRatio="none" className={`block h-4 w-full sm:h-6 ${flip ? 'rotate-180' : ''} ${className}`} aria-hidden>
      <path d={`M0 24 V18 ${d} V24 Z`} fill="currentColor" />
    </svg>
  );
}
