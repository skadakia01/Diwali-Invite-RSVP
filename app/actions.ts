'use server';
import { refresh } from 'next/cache';
import { PARTY, type Status } from '@/lib/party';
import { db, getGuest, isGuestId } from '@/lib/server';

type Result = { error?: string };
const NO_REPLY = { error: 'Please send your RSVP first so we know who you are' };
const str = (v: unknown, max: number) => String(v ?? '').trim().slice(0, max);
const phone = (v: unknown) => str(v, 20).replace(/[^\d+]/g, '');

// ---------- Guest actions (identified by the random id stored on their device) ----------

// One RSVP per person: each device has its own id, and re-submitting updates that same reply.
export async function saveRsvp(input: { id: string; name: string; phone: string; status: Status; dress: string }): Promise<Result> {
  if (!isGuestId(input.id)) return { error: 'Please refresh the page and try again' };
  const name = str(input.name, 60);
  if (!name) return { error: 'Please enter your name' };
  if (!['yes', 'maybe', 'no'].includes(input.status)) return { error: 'Please choose one of the three replies' };
  const { error } = await db()
    .from('rsvps')
    .upsert({
      guest_id: input.id,
      name,
      phone: phone(input.phone),
      status: input.status,
      dress: PARTY.dressCodes.some(d => d.id === input.dress) ? input.dress : '',
      updated_at: new Date().toISOString(),
    }, { onConflict: 'guest_id' });
  return error ? { error: error.message } : {};
}

export async function postComment(input: { id: string; text: string }): Promise<Result> {
  const text = str(input.text, 500);
  if (!text) return { error: 'Write a little something first' };
  const guest = await getGuest(input.id);
  if (!guest) return NO_REPLY;
  const { error } = await db().from('comments').insert({ guest_id: input.id, name: guest.name, text });
  return error ? { error: error.message } : {};
}

// The browser uploads straight to Supabase Storage with this one-time URL, so big photos never pass through Next.js.
export async function createPhotoUpload(id: string): Promise<Result & { path?: string; url?: string }> {
  if (!(await getGuest(id))) return NO_REPLY;
  const path = `${crypto.randomUUID()}.jpg`;
  const { data, error } = await db().storage.from('photos').createSignedUploadUrl(path);
  return error ? { error: error.message } : { path, url: data.signedUrl };
}

export async function savePhoto(input: { id: string; path: string; caption: string }): Promise<Result> {
  if (!/^[0-9a-f-]{36}\.jpg$/.test(input.path)) return { error: 'Bad upload' };
  const guest = await getGuest(input.id);
  if (!guest) return NO_REPLY;
  const { error } = await db().from('photos').insert({ guest_id: input.id, path: input.path, name: guest.name, caption: str(input.caption, 140) });
  return error ? { error: error.message } : {};
}

// ---------- Host actions (authorised by ADMIN_KEY) ----------

function assertHost(key: unknown) {
  if (!process.env.ADMIN_KEY || key !== process.env.ADMIN_KEY) throw new Error('Wrong host key');
}

export async function removeGuest(key: string, id: string) {
  assertHost(key);
  if (!isGuestId(id)) return;
  // Their wishes and photo records go too (cascade). The image files stay in Storage.
  const { error } = await db().from('rsvps').delete().eq('guest_id', id);
  if (error) throw new Error(error.message);
  refresh();
}
