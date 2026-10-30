'use client';
import { useEffect, useRef } from 'react';

const COLORS = ['#ffd166', '#ffb703', '#ff9f1c', '#ff6b6b', '#fff1c1', '#f78fb3'];
type Spark = { x: number; y: number; px: number; py: number; vx: number; vy: number; life: number; max: number; color: string; rocket?: number };

// Lightweight canvas fireworks. Pauses off-screen / in background tabs; off for reduced motion.
export function Fireworks({ className = '' }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const c = ref.current!;
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const x = c.getContext('2d')!;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    let w = 0, h = 0, raf = 0, prev = performance.now(), nextLaunch = 600, visible = true;
    const sparks: Spark[] = [];

    const resize = () => {
      ({ width: w, height: h } = c.getBoundingClientRect());
      c.width = w * dpr;
      c.height = h * dpr;
      x.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    const launch = () => {
      const sx = w * (0.12 + Math.random() * 0.76);
      sparks.push({ x: sx, y: h, px: sx, py: h, vx: (Math.random() - 0.5) * 1.2, vy: -(Math.sqrt(h) * 0.42 + Math.random() * 1.5), life: 0, max: 999, color: '#ffe8b0', rocket: h * (0.12 + Math.random() * 0.3) });
    };
    const burst = (bx: number, by: number) => {
      const a = COLORS[(Math.random() * COLORS.length) | 0], b = COLORS[(Math.random() * COLORS.length) | 0];
      const n = 70 + ((Math.random() * 40) | 0);
      for (let i = 0; i < n; i++) {
        const ang = (i / n) * Math.PI * 2, sp = 1.2 + Math.random() * 3.2;
        sparks.push({ x: bx, y: by, px: bx, py: by, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, life: 0, max: 55 + Math.random() * 45, color: i % 3 ? a : b });
      }
    };
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const dt = Math.min((now - prev) / 16.7, 3);
      prev = now;
      if (!visible || document.hidden) return;
      nextLaunch -= dt * 16.7;
      if (nextLaunch <= 0) { launch(); nextLaunch = 900 + Math.random() * 1300; }
      x.clearRect(0, 0, w, h);
      x.globalCompositeOperation = 'lighter';
      for (let i = sparks.length - 1; i >= 0; i--) {
        const s = sparks[i];
        s.px = s.x; s.py = s.y;
        if (s.rocket) {
          s.vy += 0.045 * dt;
          if (s.y <= s.rocket || s.vy >= -0.6) { burst(s.x, s.y); sparks.splice(i, 1); continue; }
        } else {
          s.vx *= 0.985 ** dt; s.vy = s.vy * 0.985 ** dt + 0.035 * dt;
          s.life += dt;
          if (s.life >= s.max) { sparks.splice(i, 1); continue; }
        }
        s.x += s.vx * dt; s.y += s.vy * dt;
        const fade = s.rocket ? 1 : 1 - s.life / s.max;
        x.globalAlpha = fade * (s.rocket ? 1 : 0.65 + Math.random() * 0.35);
        x.strokeStyle = s.color;
        x.lineWidth = s.rocket ? 2 : 1.6;
        x.beginPath();
        x.moveTo(s.px - s.vx * 2, s.py - s.vy * 2);
        x.lineTo(s.x, s.y);
        x.stroke();
      }
      x.globalAlpha = 1;
    };

    resize();
    addEventListener('resize', resize);
    const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting));
    io.observe(c);
    raf = requestAnimationFrame(frame);
    return () => { cancelAnimationFrame(raf); removeEventListener('resize', resize); io.disconnect(); };
  }, []);

  return <canvas ref={ref} className={className} aria-hidden />;
}
