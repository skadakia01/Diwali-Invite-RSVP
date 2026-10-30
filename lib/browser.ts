// Browser-only helpers (call from event handlers / effects, never during server render).

export const store = {
  get: (k: string) => { try { return localStorage.getItem(k); } catch { return null; } },
  set: (k: string, v: string) => { try { localStorage.setItem(k, v); } catch {} },
};

let guestId = '';
// Random per-device id: one device = one RSVP, and it lets a guest edit their own reply later.
export function getGuestId() {
  if (!guestId) {
    guestId = store.get('diwali-gid') ?? Array.from(crypto.getRandomValues(new Uint8Array(16)), b => b.toString(16).padStart(2, '0')).join('');
    store.set('diwali-gid', guestId);
  }
  return guestId;
}

export const cssVar = (name: string) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

export async function getJSON<T>(url: string): Promise<T> {
  const r = await fetch(url, { cache: 'no-store' });
  const j = await r.json();
  if (!r.ok) throw new Error(j.error ?? 'Something went wrong');
  return j;
}

// Shrinks phone photos (often 5–10 MB, HEIC on iPhone) to a ~400 KB JPEG before upload.
export async function compress(file: File): Promise<Blob> {
  const src = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = src;
    await img.decode().catch(() => { throw new Error(`Couldn't read ${file.name}. Try a JPG or PNG`); });
    const scale = Math.min(1, 1600 / Math.max(img.naturalWidth, img.naturalHeight));
    const c = document.createElement('canvas');
    c.width = Math.round(img.naturalWidth * scale);
    c.height = Math.round(img.naturalHeight * scale);
    c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height);
    return await new Promise((ok, fail) => c.toBlob(b => (b ? ok(b) : fail(new Error('Could not process photo'))), 'image/jpeg', 0.85));
  } finally {
    URL.revokeObjectURL(src);
  }
}

// A shower of marigold petals.
export function petals() {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const colors = ['#f59e0b', '#f97316', '#fbbf24', '#ea580c', '#fcd34d', '#c2410c'];
  for (let i = 0; i < 70; i++) {
    const p = document.createElement('i');
    p.className = 'petal';
    p.style.cssText = `left:${Math.random() * 100}vw;width:${8 + Math.random() * 9}px;background:${colors[i % colors.length]};animation-duration:${3 + Math.random() * 2.5}s;animation-delay:${Math.random() * 0.9}s;--drift:${(Math.random() - 0.5) * 220}px;--spin:${Math.random() * 900 - 450}deg`;
    document.body.append(p);
    setTimeout(() => p.remove(), 7000);
  }
}
