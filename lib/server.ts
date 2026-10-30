import 'server-only';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Comment, Guest, Live, Photo, PublicRsvp } from './party';

// Kept server-side so it stays a surprise until the guest replies.
export const MENU = [
  ['Welcome drinks', 'Kesar thandai · Masala chai · Rose lemonade'],
  ['Chaat corner', 'Pani puri · Dahi bhalla · Aloo tikki'],
  ['The feast', 'Paneer butter masala · Dal makhani · Veg biryani · Garlic naan'],
  ['Mithai', 'Kaju katli · Gulab jamun · Motichoor ladoo'],
  ['Midnight treat', 'Kulfi bar & paan shots'],
];

let client: SupabaseClient | undefined;
// Uses the secret key: tables have RLS on with no policies, so only this server can read them.
export function db() {
  const url = process.env.SUPABASE_URL, key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw new Error('Set SUPABASE_URL and SUPABASE_SECRET_KEY in .env.local');
  return (client ??= createClient(url, key, { auth: { persistSession: false } }));
}

export const isGuestId = (v: unknown): v is string => typeof v === 'string' && /^[a-f0-9]{32}$/.test(v);
const photoUrl = (path: string) => db().storage.from('photos').getPublicUrl(path).data.publicUrl;
const withUrls = (rows: { path: string }[]) => rows.map(({ path, ...p }) => ({ ...p, url: photoUrl(path) })) as Photo[];

function must<T>(r: { data: T | null; error: { message: string } | null }): T {
  if (r.error) throw new Error(r.error.message);
  return r.data as T;
}

export async function getGuest(id: string) {
  if (!isGuestId(id)) return null;
  return must(await db().from('rsvps').select('name,phone,status,dress,ticket_no').eq('guest_id', id).maybeSingle()) as Guest | null;
}

// Everything the page needs. `me` is only included when a well-formed device id is given.
export async function getLive(id?: string | null): Promise<Live> {
  const mine = isGuestId(id);
  const [rsvps, comments, photos, guest, myComments, myPhotos] = await Promise.all([
    db().from('rsvps').select('name,status,dress').order('updated_at'),
    db().from('comments').select('id,name,text,created_at').order('created_at', { ascending: false }).limit(150),
    db().from('photos').select('id,name,caption,path,created_at').order('created_at', { ascending: false }).limit(500),
    mine ? getGuest(id) : null,
    mine ? db().from('comments').select('id,name,text,created_at').eq('guest_id', id).order('created_at') : null,
    mine ? db().from('photos').select('id,name,caption,path,created_at').eq('guest_id', id).order('created_at') : null,
  ]);
  return {
    state: { rsvps: must(rsvps) as PublicRsvp[], comments: must(comments) as Comment[], photos: withUrls(must(photos)) },
    me: mine
      ? { guest, menu: guest ? MENU : null, comments: must(myComments!) as Comment[], photos: withUrls(must(myPhotos!)) }
      : null,
  };
}
