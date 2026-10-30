import { DATE_STR, PARTY, START, STATUS, TIME_STR, YEAR, dressName, type Guest } from './party';
import { cssVar } from './browser';

const W = 1080, H = 1760, STUB = 1440;
const GOLD = '#e2b33c', GOLD_LIGHT = '#f6dc8f', IVORY = '#f8eedb', MAROON = '#4a0b1c';
type Ctx = CanvasRenderingContext2D;

const loadImg = (src: string) =>
  new Promise<HTMLImageElement | null>(ok => {
    const i = new Image();
    i.crossOrigin = 'anonymous'; // Supabase serves CORS headers, so the canvas stays exportable
    i.onload = () => ok(i);
    i.onerror = () => ok(null);
    i.src = src;
  });

function fit(x: Ctx, text: string, font: (size: number) => string, size: number, maxW: number) {
  do x.font = font(size--);
  while (x.measureText(text).width > maxW && size > 16);
}

function wrap(x: Ctx, text: string, maxW: number, maxLines: number) {
  const lines: string[] = [];
  let line = '';
  for (const word of text.split(/\s+/)) {
    const next = line ? `${line} ${word}` : word;
    if (x.measureText(next).width > maxW && line) { lines.push(line); line = word; } else line = next;
  }
  if (line) lines.push(line);
  if (lines.length > maxLines) {
    lines.length = maxLines;
    lines[maxLines - 1] = lines[maxLines - 1].replace(/\s*\S*$/, '') + '…';
  }
  return lines;
}

function foil(x: Ctx, y0: number, y1: number) {
  const g = x.createLinearGradient(0, y0, 0, y1);
  g.addColorStop(0, '#fff3c4');
  g.addColorStop(0.45, '#f0c75e');
  g.addColorStop(1, '#b8860b');
  return g;
}

function diya(x: Ctx, cx: number, cy: number, s: number) {
  x.save();
  x.translate(cx, cy);
  x.scale(s, s);
  const halo = x.createRadialGradient(0, -28, 2, 0, -28, 70);
  halo.addColorStop(0, 'rgba(255,195,92,.75)');
  halo.addColorStop(1, 'rgba(255,138,30,0)');
  x.fillStyle = halo;
  x.fillRect(-80, -100, 160, 160);
  const bowl = x.createLinearGradient(0, 0, 0, 38);
  bowl.addColorStop(0, '#c8592a');
  bowl.addColorStop(1, '#4d1a08');
  x.fillStyle = bowl;
  x.beginPath();
  x.moveTo(-48, 0);
  x.bezierCurveTo(-42, 26, -20, 38, 0, 38);
  x.bezierCurveTo(20, 38, 42, 26, 48, 0);
  x.closePath();
  x.fill();
  x.fillStyle = '#3a1206';
  x.strokeStyle = '#e8b44a';
  x.lineWidth = 2.5;
  x.beginPath();
  x.ellipse(0, 0, 48, 8.5, 0, 0, Math.PI * 2);
  x.fill();
  x.stroke();
  const flame = x.createRadialGradient(0, -14, 2, 0, -20, 34);
  flame.addColorStop(0, '#fffdf0');
  flame.addColorStop(0.35, '#ffe066');
  flame.addColorStop(0.7, '#ff9a1f');
  flame.addColorStop(1, '#e3460c');
  x.fillStyle = flame;
  x.beginPath();
  x.moveTo(0, -54);
  x.bezierCurveTo(10, -36, 14, -22, 0, -6);
  x.bezierCurveTo(-14, -22, -10, -36, 0, -54);
  x.fill();
  x.restore();
}

function mandala(x: Ctx, cx: number, cy: number, r: number) {
  x.save();
  x.translate(cx, cy);
  x.strokeStyle = 'rgba(226,179,60,.13)';
  x.lineWidth = 1.5;
  for (const k of [0.25, 0.45, 0.7, 0.98]) { x.beginPath(); x.arc(0, 0, r * k, 0, Math.PI * 2); x.stroke(); }
  for (let i = 0; i < 24; i++) {
    x.rotate(Math.PI / 12);
    x.beginPath();
    x.moveTo(0, -r * 0.7);
    x.quadraticCurveTo(r * 0.09, -r * 0.84, 0, -r * 0.97);
    x.quadraticCurveTo(-r * 0.09, -r * 0.84, 0, -r * 0.7);
    x.stroke();
  }
  x.restore();
}

// Draws the keepsake ticket (portrait 1080×1760) ready to save, share or print.
export async function drawTicket(c: HTMLCanvasElement, guest: Guest, photoUrls: string[], wish?: string) {
  await document.fonts.ready;
  const serif = cssVar('--font-cormorant') || 'Georgia, serif';
  const sans = cssVar('--font-manrope') || 'sans-serif';
  const deva = cssVar('--font-tiro') || 'serif';
  const x = c.getContext('2d')!;
  c.width = W;
  c.height = H;
  x.clearRect(0, 0, W, H);
  x.textAlign = 'center';

  // Ticket body + ivory stub, clipped to a rounded ticket shape.
  x.save();
  x.beginPath();
  x.roundRect(20, 20, W - 40, H - 40, 44);
  x.clip();
  const bg = x.createLinearGradient(0, 0, 0, STUB);
  bg.addColorStop(0, '#6e1227');
  bg.addColorStop(0.55, '#3d0816');
  bg.addColorStop(1, '#22040d');
  x.fillStyle = bg;
  x.fillRect(0, 0, W, STUB);
  const warm = x.createRadialGradient(W / 2, 330, 20, W / 2, 330, 620);
  warm.addColorStop(0, 'rgba(255,170,70,.32)');
  warm.addColorStop(1, 'rgba(255,170,70,0)');
  x.fillStyle = warm;
  x.fillRect(0, 0, W, STUB);
  mandala(x, W / 2, 330, 440);
  x.fillStyle = IVORY;
  x.fillRect(0, STUB, W, H - STUB);
  x.restore();

  // Gold frame around the main panel.
  x.strokeStyle = GOLD;
  x.lineWidth = 3;
  x.beginPath();
  x.roundRect(48, 48, W - 96, STUB - 76, 28);
  x.stroke();
  x.globalAlpha = 0.45;
  x.lineWidth = 1.2;
  x.beginPath();
  x.roundRect(62, 62, W - 124, STUB - 104, 20);
  x.stroke();
  x.globalAlpha = 1;

  x.fillStyle = GOLD_LIGHT;
  x.font = `52px ${deva}`;
  x.fillText('शुभ दीपावली', W / 2, 165);
  x.font = `700 20px ${sans}`;
  x.letterSpacing = '9px';
  x.fillStyle = GOLD;
  x.fillText('A MEMORY FROM', W / 2, 225);
  x.letterSpacing = '0px';
  x.font = `italic 600 150px ${serif}`;
  x.fillStyle = foil(x, 250, 360);
  x.fillText(PARTY.title, W / 2, 352);
  x.font = `500 30px ${sans}`;
  x.fillStyle = 'rgba(248,238,219,.85)';
  x.fillText(`${DATE_STR}`, W / 2, 410);
  diya(x, W / 2, 500, 0.95);

  x.font = `700 19px ${sans}`;
  x.letterSpacing = '7px';
  x.fillStyle = GOLD;
  x.fillText('THIS TICKET BELONGS TO', W / 2, 600);
  x.letterSpacing = '0px';
  fit(x, guest.name, s => `600 ${s}px ${serif}`, 104, W - 220);
  x.fillStyle = '#fff';
  x.fillText(guest.name, W / 2, 695);
  x.font = `500 28px ${sans}`;
  x.fillStyle = 'rgba(248,238,219,.8)';
  x.fillText([guest.status && STATUS[guest.status], dressName(guest.dress)].filter(Boolean).join('  ·  '), W / 2, 748);

  // Polaroids: the guest's own photos, else the latest party photos, else lit diyas.
  const imgs = (await Promise.all(photoUrls.slice(0, 3).map(loadImg))).filter(i => i !== null);
  const S = 240, tilt = [-0.075, 0.025, 0.08];
  for (let i = 0; i < 3; i++) {
    x.save();
    x.translate(W / 2 + (i - 1) * 290, 935);
    x.rotate(tilt[i]);
    x.shadowColor = 'rgba(0,0,0,.55)';
    x.shadowBlur = 30;
    x.shadowOffsetY = 10;
    x.fillStyle = '#fffaf0';
    x.fillRect(-S / 2 - 14, -S / 2 - 14, S + 28, S + 62);
    x.shadowColor = 'transparent';
    const img = imgs[i];
    if (img) {
      const k = Math.min(img.width, img.height);
      x.drawImage(img, (img.width - k) / 2, (img.height - k) / 2, k, k, -S / 2, -S / 2, S, S);
    } else {
      const g = x.createLinearGradient(0, -S / 2, 0, S / 2);
      g.addColorStop(0, '#4a0b1c');
      g.addColorStop(1, '#22040d');
      x.fillStyle = g;
      x.fillRect(-S / 2, -S / 2, S, S);
      diya(x, 0, 30, 0.9);
    }
    x.restore();
  }

  x.font = `italic 500 42px ${serif}`;
  x.fillStyle = IVORY;
  wrap(x, `“${wish || 'May the light of the diyas fill your year with joy.'}”`, W - 240, 2).forEach((line, i) => x.fillText(line, W / 2, 1185 + i * 52));
  x.font = `600 22px ${sans}`;
  x.fillStyle = 'rgba(226,179,60,.85)';
  x.fillText(`${TIME_STR}  ·  ${PARTY.venue}`, W / 2, 1320);

  // Perforation + notches.
  x.save();
  x.globalCompositeOperation = 'destination-out';
  for (const nx of [20, W - 20]) { x.beginPath(); x.arc(nx, STUB, 36, 0, Math.PI * 2); x.fill(); }
  x.restore();
  x.setLineDash([3, 13]);
  x.lineCap = 'round';
  x.strokeStyle = 'rgba(74,11,28,.45)';
  x.lineWidth = 5;
  x.beginPath();
  x.moveTo(78, STUB + 1);
  x.lineTo(W - 78, STUB + 1);
  x.stroke();
  x.setLineDash([]);

  const d = START.toLocaleDateString('en-GB', { timeZone: PARTY.timeZone, day: '2-digit', month: '2-digit', year: '2-digit' }).replaceAll('/', ' · ');
  [['TICKET NO.', `#${String(guest.ticket_no).padStart(3, '0')}`], ['ADMIT', 'ONE'], ['DATE', d]].forEach(([label, value], i) => {
    const cx = 220 + i * 320;
    x.font = `700 18px ${sans}`;
    x.letterSpacing = '5px';
    x.fillStyle = '#9a6b12';
    x.fillText(label, cx, STUB + 85);
    x.letterSpacing = '0px';
    x.font = `600 54px ${serif}`;
    x.fillStyle = MAROON;
    x.fillText(value, cx, STUB + 148);
  });
  // Decorative barcode, seeded by ticket number so it's stable.
  let seed = guest.ticket_no * 9301 + 49297;
  x.fillStyle = MAROON;
  for (let bx = 300; bx < W - 300;) {
    seed = (seed * 9301 + 49297) % 233280;
    const bw = 2 + (seed % 5);
    x.fillRect(bx, STUB + 190, bw, 58);
    bx += bw + 3 + (seed % 4);
  }
  x.font = `600 15px ${sans}`;
  x.letterSpacing = '6px';
  x.fillStyle = '#6d4c3c';
  x.fillText(`DIWALI · ${YEAR} · FESTIVAL OF LIGHTS`, W / 2, STUB + 278);
  x.letterSpacing = '0px';
}
