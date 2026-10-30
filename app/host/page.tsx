import { Suspense } from 'react';
import { BellRing, MessageCircle, Smartphone } from 'lucide-react';
import { removeGuest } from '@/app/actions';
import { Diya, Ornament } from '@/components/decor';
import { CopyLink, RemoveButton } from '@/components/host-buttons';
import { DATE_STR, FULL_TITLE, INVITE_TEXT, SITE_URL, STATUS, dressName, reminderText, sms, wa, type Status } from '@/lib/party';
import { db } from '@/lib/server';

export const metadata = { title: 'Host dashboard' };

export default function HostPage({ searchParams }: PageProps<'/host'>) {
  return (
    <main className="bg-paper min-h-svh px-4 py-12 text-ink sm:px-8">
      <div className="mx-auto max-w-5xl">
        <header className="mb-10 text-center">
          <Diya className="mx-auto size-16" />
          <p className="kicker mt-3 text-saffron-deep">Host dashboard</p>
          <h1 className="font-display mt-2 text-5xl font-semibold lining-nums">{FULL_TITLE}</h1>
          <p className="mt-2 text-ink-soft">{DATE_STR}</p>
          <Ornament className="text-gold-deep mx-auto mt-5 w-40" />
        </header>
        <Suspense fallback={<p className="text-center text-ink-soft">Loading guest list…</p>}>
          <Dashboard searchParams={searchParams} />
        </Suspense>
      </div>
    </main>
  );
}

type Row = { guest_id: string; ticket_no: number; name: string; phone: string; status: Status; dress: string };

const BADGE: Record<Status, string> = {
  yes: 'bg-emerald-100 text-emerald-900',
  maybe: 'bg-amber-100 text-amber-900',
  no: 'bg-stone-200 text-stone-700',
};

async function Dashboard({ searchParams }: Pick<PageProps<'/host'>, 'searchParams'>) {
  const { key } = await searchParams;
  if (!process.env.ADMIN_KEY || key !== process.env.ADMIN_KEY) {
    return <p className="mx-auto max-w-md rounded-3xl border border-ink/10 bg-white/60 p-8 text-center">Open this page as <code className="font-semibold">/host?key=YOUR_ADMIN_KEY</code></p>;
  }
  const { data, error } = await db().from('rsvps').select('guest_id,ticket_no,name,phone,status,dress').order('ticket_no');
  if (error) return <p className="text-center text-red-800">{error.message}</p>;
  const rows = data as Row[];
  const count = (s: Status) => rows.filter(r => r.status === s).length;
  const stats = [['Replies', rows.length], ['Attending', count('yes')], ['Deciding', count('maybe')], ['Declined', count('no')]] as const;

  return (
    <div className="grid gap-8">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map(([label, n]) => (
          <div key={label} className="rounded-2xl border border-ink/10 bg-white/60 p-4 text-center">
            <b className="font-display block text-4xl font-semibold lining-nums">{n}</b>
            <span className="label mb-0">{label}</span>
          </div>
        ))}
      </div>

      <section className="rounded-3xl border border-ink/10 bg-white/60 p-6 sm:p-8">
        <h2 className="font-display text-3xl font-semibold">Share the invite</h2>
        <p className="mt-1 mb-4 text-sm text-ink-soft">One link for everyone: <b className="text-ink">{SITE_URL}</b>. Each guest RSVPs for themselves.</p>
        <div className="flex flex-wrap gap-2">
          <a className="btn btn-wa btn-sm" href={wa(INVITE_TEXT)} target="_blank" rel="noopener"><MessageCircle className="size-4" /> WhatsApp</a>
          <a className="btn btn-ghost btn-sm" href={sms(INVITE_TEXT)}><Smartphone className="size-4" /> Text</a>
          <CopyLink link={SITE_URL} />
        </div>
      </section>

      <section className="rounded-3xl border border-ink/10 bg-white/60">
        <h2 className="font-display border-b border-ink/10 px-6 py-5 text-3xl font-semibold sm:px-8">Guest list</h2>
        {!rows.length && <p className="px-8 py-10 text-center text-ink-soft">No replies yet. Share the invite to get started.</p>}
        <ul className="divide-y divide-ink/10">
          {rows.map(r => {
            const remind = reminderText(r.name, dressName(r.dress));
            return (
              <li key={r.guest_id} className="flex flex-col gap-4 px-6 py-5 sm:px-8 lg:flex-row lg:items-center">
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2">
                    <b className="text-lg">{r.name}</b>
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${BADGE[r.status]}`}>{STATUS[r.status]}</span>
                  </p>
                  <p className="text-sm text-ink-soft">
                    #{String(r.ticket_no).padStart(3, '0')} · {r.phone || 'no number'}{r.dress && ` · ${dressName(r.dress)}`}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {r.status !== 'no' && r.phone && (
                    <>
                      <a className="btn btn-wa btn-sm" href={wa(remind, r.phone)} target="_blank" rel="noopener"><BellRing className="size-4" /> Remind</a>
                      <a className="btn btn-ghost btn-sm" href={sms(remind, r.phone)}><Smartphone className="size-4" /> Text reminder</a>
                    </>
                  )}
                  <form action={removeGuest.bind(null, key, r.guest_id)}>
                    <RemoveButton name={r.name} />
                  </form>
                </div>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
