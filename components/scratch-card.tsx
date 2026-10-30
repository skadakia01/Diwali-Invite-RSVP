'use client';
import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from 'react';
import { cssVar, petals, store } from '@/lib/browser';

const noop = () => () => {};

// Gold-foil scratch layer over its children. Remembers on this device once revealed.
export function ScratchCard({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const scratchedBefore = useSyncExternalStore(noop, () => store.get('diwali-scratched') === '1', () => false);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const c = ref.current;
    if (!c || scratchedBefore) return;
    const x = c.getContext('2d', { willReadFrequently: true })!;
    const dpr = devicePixelRatio || 1;
    const { width, height } = c.getBoundingClientRect();
    c.width = width * dpr;
    c.height = height * dpr;
    x.scale(dpr, dpr);

    const g = x.createLinearGradient(0, 0, width, height);
    [['#a8741a', 0], ['#f7e08a', 0.25], ['#c9971c', 0.45], ['#fff1b8', 0.62], ['#b8860b', 0.82], ['#e9c45a', 1]].forEach(([col, at]) => g.addColorStop(at as number, col as string));
    x.fillStyle = g;
    x.fillRect(0, 0, width, height);
    // Engraved paisley-ish dot pattern for a foil texture.
    x.fillStyle = 'rgba(122,74,10,.18)';
    for (let yy = 12; yy < height; yy += 18) for (let xx = (yy / 18) % 2 ? 9 : 0; xx < width; xx += 18) { x.beginPath(); x.arc(xx, yy, 1.4, 0, Math.PI * 2); x.fill(); }
    const serif = cssVar('--font-cormorant') || 'serif', sans = cssVar('--font-manrope') || 'sans-serif';
    x.textAlign = 'center';
    x.fillStyle = '#4a2a05';
    x.font = `italic 600 ${Math.min(40, width / 11)}px ${serif}`;
    x.fillText('Scratch to reveal', width / 2, height / 2);
    x.font = `700 11px ${sans}`;
    x.letterSpacing = '4px';
    x.fillText('TONIGHT’S SURPRISE MENU', width / 2, height / 2 + 30);
    x.globalCompositeOperation = 'destination-out';

    let down = false;
    const dig = (e: PointerEvent) => {
      if (!down) return;
      x.beginPath();
      x.arc(e.offsetX, e.offsetY, 30, 0, Math.PI * 2);
      x.fill();
    };
    const start = (e: PointerEvent) => { down = true; c.setPointerCapture(e.pointerId); dig(e); };
    const end = () => {
      down = false;
      const px = x.getImageData(0, 0, c.width, c.height).data;
      let clear = 0, total = 0;
      for (let i = 3; i < px.length; i += 4 * 61) { total++; if (px[i] === 0) clear++; }
      if (clear / total > 0.45) { store.set('diwali-scratched', '1'); setRevealed(true); petals(); }
    };
    c.addEventListener('pointerdown', start);
    c.addEventListener('pointermove', dig);
    c.addEventListener('pointerup', end);
    return () => {
      c.removeEventListener('pointerdown', start);
      c.removeEventListener('pointermove', dig);
      c.removeEventListener('pointerup', end);
    };
  }, [scratchedBefore]);

  return (
    <div className="relative">
      {children}
      {!scratchedBefore && (
        <canvas
          ref={ref}
          aria-label="Scratch the gold foil to reveal the menu"
          className={`absolute inset-0 h-full w-full cursor-grab touch-none rounded-[inherit] transition-opacity duration-1000 ${revealed ? 'pointer-events-none opacity-0' : ''}`}
        />
      )}
    </div>
  );
}
