// ================= EDIT YOUR PARTY HERE =================
export const PARTY = {
  title: 'Diwali Night',
  // Keep the UTC offset in sync with timeZone (Chicago is CST, -06:00, after Nov 1).
  start: '2026-11-07T17:00:00-06:00',
  // Only used for calendar entries; the invite itself says "5:00 PM onwards".
  end: '2026-11-07T23:00:00-06:00',
  timeZone: 'America/Chicago',
  venue: '1246 W Devon Ave, Chicago, IL 60660', // full address, used for Maps + calendar
  hostPhone: '', // e.g. '15551234567' (country code + number, digits only) so guests can WhatsApp you
  rsvpBy: 'Wednesday, November 4',
  lineup: [
    { icon: 'welcome', title: 'Welcome & meeting each other', note: 'Arrive, settle in and say hello' },
    { icon: 'diya', title: 'Diyas & sparklers', note: 'Light the lamps, then light up the night' },
    { icon: 'rangoli', title: 'Rangoli', note: 'Details to be confirmed', tbd: true },
    { icon: 'dinner', title: 'Surprise dinner', note: 'The menu stays secret until you reply' },
    { icon: 'music', title: 'Games', note: 'Bring your competitive side' },
    { icon: 'garba', title: 'Music & Garba', note: 'Dance the night away' },
  ],
  dressTheme: 'Festive Ethnic · Traditional',
  dressNote: 'Rich silks, gold and jewel tones. Dress for the festival of lights.',
  palette: [
    ['#9b1b30', 'Sindoor'],
    ['#d4a017', 'Gold'],
    ['#e8711a', 'Marigold'],
    ['#5b2a86', 'Royal purple'],
    ['#0d6b5e', 'Peacock'],
  ],
  dressCodes: [
    { id: 'royal', icon: 'crown', name: 'Royal Traditional', desc: 'Sarees, lehengas, sherwanis, bandhgalas' },
    { id: 'indo', icon: 'gem', name: 'Indo-Western Glam', desc: 'Fusion gowns, kurta with blazer, dhoti pants' },
    { id: 'kurta', icon: 'shirt', name: 'Classic Kurta', desc: 'Kurta pajama, anarkali, salwar suits' },
    { id: 'color', icon: 'palette', name: 'Color-Pop Twinning', desc: 'Coordinate one bright color with your crew' },
  ],
};
// The surprise menu lives in lib/server.ts so it never reaches the browser before a guest replies.
// =========================================================

export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL}`
    : 'http://localhost:3000');

export const STATUS = { yes: 'Joyfully attending', maybe: 'Still deciding', no: 'Sending love' };
export type Status = keyof typeof STATUS;

export type PublicRsvp = { name: string; status: Status; dress: string };
export type Comment = { id: number; name: string; text: string; created_at: string };
export type Photo = { id: number; name: string; caption: string; url: string; created_at: string };
export type State = { rsvps: PublicRsvp[]; comments: Comment[]; photos: Photo[] };
export type Guest = { name: string; phone: string; status: Status; dress: string; ticket_no: number };
// guest is null until this device has sent an RSVP.
export type Me = { guest: Guest | null; menu: string[][] | null; comments: Comment[]; photos: Photo[] };
export type Live = { state: State; me: Me | null };

export const START = new Date(PARTY.start);
export const END = new Date(PARTY.end);
export const YEAR = START.getUTCFullYear();
export const FULL_TITLE = `${PARTY.title} ${YEAR}`;
// Formatting in the party's own time zone keeps server and browser output identical.
const fmt = (o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('en-US', { timeZone: PARTY.timeZone, ...o });
export const fmtTime = (d: Date) => fmt({ hour: 'numeric', minute: '2-digit' }).format(d);
export const WEEKDAY = fmt({ weekday: 'long' }).format(START);
export const DAY_MONTH = fmt({ month: 'long', day: 'numeric' }).format(START);
export const DATE_STR = fmt({ weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }).format(START);
export const TIME_STR = `${fmtTime(START)} onwards`;
export const utcStamp = (d: Date) => d.toISOString().replace(/[-:]|\.\d{3}/g, ''); // 20261107T220000Z

export const firstName = (name: string) => name.trim().split(/\s+/)[0];
export const dressName = (id?: string) => PARTY.dressCodes.find(d => d.id === id)?.name;
export const MAPS_URL = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(PARTY.venue)}`;
export const GCAL_URL =
  'https://calendar.google.com/calendar/render?' +
  new URLSearchParams({
    action: 'TEMPLATE',
    text: FULL_TITLE,
    dates: `${utcStamp(START)}/${utcStamp(END)}`,
    location: PARTY.venue,
    details: `${PARTY.dressTheme}\nRSVP & live photo wall: ${SITE_URL}`,
  });

export const wa = (text: string, phone = '') => `https://wa.me/${phone.replace(/\D/g, '')}?text=${encodeURIComponent(text)}`;
export const sms = (text: string, phone = '') => `sms:${phone}?&body=${encodeURIComponent(text)}`;

export const INVITE_TEXT = `You're invited to ${FULL_TITLE}! 🪔
${DATE_STR}, ${TIME_STR}

Dress code: ${PARTY.dressTheme}

RSVP (one per person, please), pick your outfit and unlock the surprise menu:
${SITE_URL}`;

export const reminderText = (name?: string, dress?: string) => `Hi${name ? ` ${firstName(name)}` : ''}! A little reminder 🪔

${FULL_TITLE} is on ${DATE_STR}, ${TIME_STR}
${PARTY.venue}
${dress ? `Your outfit vibe: ${dress}` : `Dress code: ${PARTY.dressTheme}`}

Details & the live photo wall: ${SITE_URL}`;
