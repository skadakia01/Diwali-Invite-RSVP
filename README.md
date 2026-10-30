# 🪔 Diwali Night Invite

RSVP site for our Diwali party: one shareable link, one RSVP per person, dress code and outfit picks, a scratch-to-reveal surprise menu, a live photo wall, wishes, Google/Apple calendar invites, WhatsApp/SMS invites and reminders, and a printable memory ticket.

Next.js 16 · React 19 · TypeScript · Tailwind 4 · Motion · Supabase (Postgres + Storage)

## Setup (about 10 minutes)

1. Create a free project at [supabase.com](https://supabase.com).
2. In **SQL Editor**, paste and run [`supabase/schema.sql`](supabase/schema.sql).
3. `cp .env.example .env.local` and fill in your Project URL, **secret** key (Project Settings → API Keys) and an `ADMIN_KEY` of your choice.
4. Edit the address, time zone, line-up and dress codes in [`lib/party.ts`](lib/party.ts) and the menu in [`lib/server.ts`](lib/server.ts).
5. `npm install && npm run dev`

## Inviting guests

Share the site link on WhatsApp or by text (buttons on the page and on `/host?key=YOUR_ADMIN_KEY`).
Anyone with the link can view it. Each person RSVPs for themselves: one reply per phone, no plus-ones. Sending again from the same phone just updates that reply.

On `/host?key=YOUR_ADMIN_KEY` you see every reply and can send WhatsApp/text reminders to guests who left a number, or remove a reply.

## Go live (Vercel)

1. Push to GitHub → import on [vercel.com](https://vercel.com).
2. Add the same env vars, with `NEXT_PUBLIC_SITE_URL` set to your live URL (used in invites and calendar entries).
3. The link shows a preview card when shared on WhatsApp.

## Moderating

Remove a photo or wish in Supabase → Table Editor (`photos` / `comments`).
