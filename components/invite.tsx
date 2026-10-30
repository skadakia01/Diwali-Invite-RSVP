'use client';
import { Fragment, useEffect, useRef, useState, useSyncExternalStore, type DragEvent, type FormEvent, type ReactNode } from 'react';
import { AnimatePresence, MotionConfig, motion, useMotionValueEvent, useScroll, type Variants } from 'motion/react';
import {
  AlertCircle, CalendarDays, CalendarPlus, Check, ChevronLeft, ChevronRight, Clock, Crown, Download, Flame, Flower2, Heart,
  HeartHandshake, ImagePlus, Loader2, Lock, MapPin, MessageCircle, Music, Palette, PartyPopper, Printer, Quote, Send, Share2,
  Link2, Shirt, Smartphone, Sparkles, Ticket, UtensilsCrossed, X, type LucideIcon,
} from 'lucide-react';
import { createPhotoUpload, postComment, saveRsvp, savePhoto } from '@/app/actions';
import { compress, getGuestId, getJSON, petals } from '@/lib/browser';
import {
  DATE_STR, DAY_MONTH, END, GCAL_URL, INVITE_TEXT, MAPS_URL, PARTY, SITE_URL, START, STATUS, TIME_STR, WEEKDAY, YEAR,
  dressName, firstName, fmtTime, reminderText, sms, wa, type Live, type Me, type State, type Status,
} from '@/lib/party';
import { drawTicket } from '@/lib/ticket';
import { Diya, Lantern, Mandala, Ornament, Scallop, Toran } from './decor';
import { Fireworks } from './fireworks';
import { ScratchCard } from './scratch-card';

const ICONS: Record<string, LucideIcon> = {
  welcome: HeartHandshake, diya: Flame, rangoli: Flower2, dinner: UtensilsCrossed, music: Music, garba: PartyPopper,
  crown: Crown, sparkles: Sparkles, shirt: Shirt, palette: Palette,
};
const REPLIES: { value: Status; label: string; icon: LucideIcon }[] = [
  { value: 'yes', label: 'Joyfully accepts', icon: PartyPopper },
  { value: 'maybe', label: 'Still deciding', icon: Clock },
  { value: 'no', label: 'Regretfully declines', icon: Heart },
];
const NAV = [['details', 'Details'], ['dress', 'Dress code'], ['rsvp', 'RSVP'], ['menu', 'Menu'], ['photos', 'Photos'], ['wishes', 'Wishes'], ['keepsake', 'Ticket']];
const TONES = ['#8e1b32', '#a4500f', '#5b2a86', '#0d6b5e', '#9a6b12', '#b4325a'];
const ease = [0.22, 1, 0.36, 1] as const;
const fadeUp: Variants = { hidden: { opacity: 0, y: 24 }, show: { opacity: 1, y: 0, transition: { duration: 0.9, ease } } };

const noop = () => () => {};
const tickEverySecond = (cb: () => void) => { const t = setInterval(cb, 1000); return () => clearInterval(t); };
const must = <T extends { error?: string }>(r: T) => { if (r.error) throw new Error(r.error); return r; };
const when = (iso: string) => new Date(iso).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
const tilt = (id: number) => ((id * 37) % 7) - 3;

type Picked = { file: File; url: string; status: 'idle' | 'uploading' | 'done' };

export function Invite({ initial }: { initial: State }) {
  const gid = useSyncExternalStore(noop, getGuestId, () => '');
  const canShare = useSyncExternalStore(noop, () => 'share' in navigator, () => false);
  const [state, setState] = useState(initial);
  const [me, setMe] = useState<Me | null>(null);
  const [dress, setDress] = useState('');
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState('');
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [picked, setPicked] = useState<Picked[]>([]);
  const [dragging, setDragging] = useState(false);
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  const [ticketDrawn, setTicketDrawn] = useState(false);
  const [showNav, setShowNav] = useState(false);
  const ticket = useRef<HTMLCanvasElement>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const { scrollY } = useScroll();
  useMotionValueEvent(scrollY, 'change', y => setShowNav(y > window.innerHeight * 0.75));

  // Load this device's RSVP, then keep everything live: poll every 6s while the tab is visible.
  useEffect(() => {
    if (!gid) return;
    const load = (first: boolean) =>
      getJSON<Live>(`/api/live?id=${gid}`)
        .then(l => { setState(l.state); setMe(l.me); if (first && l.me?.guest) setDress(l.me.guest.dress); })
        .catch(() => {});
    load(true);
    const t = setInterval(() => { if (!document.hidden) load(false); }, 6000);
    return () => clearInterval(t);
  }, [gid]);

  // Lightbox: keyboard controls + lock page scroll.
  const lightboxOpen = openIdx !== null, photoCount = state.photos.length;
  useEffect(() => {
    if (!lightboxOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpenIdx(null);
      if (e.key === 'ArrowRight') setOpenIdx(i => (i! + 1) % photoCount);
      if (e.key === 'ArrowLeft') setOpenIdx(i => (i! - 1 + photoCount) % photoCount);
    };
    document.body.style.overflow = 'hidden';
    addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = ''; removeEventListener('keydown', onKey); };
  }, [lightboxOpen, photoCount]);

  const guest = me?.guest ?? null;
  const first = guest ? firstName(guest.name) : '';
  const remind = reminderText(guest?.name, dressName(guest?.dress));
  const attending = state.rsvps.filter(r => r.status === 'yes');
  const maybes = state.rsvps.filter(r => r.status === 'maybe');
  const open = openIdx === null ? null : state.photos[openIdx];

  const notify = (msg: string, ok = true) => {
    setToast({ msg, ok });
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3800);
  };
  const run = async (key: string, fn: () => Promise<unknown>) => {
    setBusy(key);
    try { await fn(); } catch (err) { notify((err as Error).message, false); } finally { setBusy(''); }
  };
  const reload = async () => {
    const l = await getJSON<Live>(`/api/live?id=${gid}`);
    setState(l.state);
    setMe(l.me);
  };

  const onRsvp = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const status = f.get('status') as Status;
    run('rsvp', async () => {
      must(await saveRsvp({ id: gid, name: String(f.get('name')), phone: String(f.get('phone')), status, dress }));
      const firstReply = !guest;
      await reload();
      setEditing(false);
      notify(firstReply ? 'Reply sent. The surprise menu is unlocked!' : 'Your reply has been updated');
      if (status !== 'no') petals();
    });
  };

  const pickDress = (id: string) => {
    setDress(id);
    if (guest) run('dress', async () => {
      must(await saveRsvp({ id: gid, name: guest.name, phone: guest.phone, status: guest.status, dress: id }));
      await reload();
      notify(`Outfit vibe saved: ${dressName(id)}`);
    });
  };

  const addFiles = (files: FileList | File[]) => {
    const fresh = [...files].filter(f => f.type.startsWith('image/') || /\.hei[cf]$/i.test(f.name)).slice(0, 10 - picked.length);
    setPicked(p => [...p, ...fresh.map(file => ({ file, url: URL.createObjectURL(file), status: 'idle' as const }))]);
  };
  const removePicked = (i: number) => setPicked(p => { URL.revokeObjectURL(p[i].url); return p.filter((_, j) => j !== i); });
  const onDrop = (e: DragEvent) => { e.preventDefault(); setDragging(false); addFiles(e.dataTransfer.files); };

  const onUpload = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget, caption = String(new FormData(form).get('caption'));
    run('photo', async () => {
      for (const [i, p] of picked.entries()) {
        if (p.status === 'done') continue;
        setPicked(all => all.map((x, j) => (j === i ? { ...x, status: 'uploading' } : x)));
        const blob = await compress(p.file);
        const up = must(await createPhotoUpload(gid));
        const res = await fetch(up.url!, { method: 'PUT', body: blob, headers: { 'Content-Type': 'image/jpeg' } });
        if (!res.ok) throw new Error('Upload failed, please try again');
        must(await savePhoto({ id: gid, path: up.path!, caption }));
        setPicked(all => all.map((x, j) => (j === i ? { ...x, status: 'done' } : x)));
      }
      await reload();
      notify(`${picked.length} photo${picked.length > 1 ? 's' : ''} added to the wall`);
      picked.forEach(p => URL.revokeObjectURL(p.url));
      setPicked([]);
      form.reset();
    });
  };

  const onWish = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    run('wish', async () => {
      must(await postComment({ id: gid, text: String(new FormData(form).get('text')) }));
      form.reset();
      await reload();
      notify('Your wish is on the wall');
    });
  };

  const makeTicket = () =>
    run('ticket', async () => {
      if (!me?.guest || !ticket.current) return;
      const photos = (me.photos.length ? me.photos.slice(-3) : state.photos.slice(0, 3)).map(p => p.url);
      setTicketDrawn(true);
      await drawTicket(ticket.current, me.guest, photos, me.comments.at(-1)?.text);
    });
  const saveTicket = () => {
    const a = document.createElement('a');
    a.href = ticket.current!.toDataURL('image/png');
    a.download = `diwali-${YEAR}-ticket-${first.toLowerCase() || 'guest'}.png`;
    a.click();
  };
  const shareTicket = () =>
    run('share', async () => {
      const blob = await new Promise<Blob | null>(ok => ticket.current!.toBlob(ok));
      const file = new File([blob!], `diwali-${YEAR}-ticket.png`, { type: 'image/png' });
      if (!navigator.canShare?.({ files: [file] })) throw new Error("Sharing images isn't supported here. Use Save instead");
      await navigator.share({ files: [file], title: `Diwali ${YEAR}` }).catch(err => { if (err.name !== 'AbortError') throw err; });
    });

  const steps: [boolean, string][] = [
    [!!guest, 'Send your reply'],
    [!!guest?.dress, 'Pick your outfit vibe'],
    [!!me?.photos.length, 'Add a photo to the wall'],
    [!!me?.comments.length, 'Leave a wish'],
  ];
  const done = steps.filter(s => s[0]).length;

  return (
    <MotionConfig reducedMotion="user">
      {/* ───────── Nav ───────── */}
      <motion.nav
        initial={false}
        animate={{ y: showNav ? 0 : -90, opacity: showNav ? 1 : 0 }}
        transition={{ duration: 0.4, ease }}
        className="fixed inset-x-0 top-0 z-40 border-b border-gold/15 bg-maroon-900/85 backdrop-blur-xl"
      >
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-5">
          <a href="#top" className="flex items-center gap-1.5">
            <Diya className="size-9" />
            <span className="font-display text-gold-light text-xl font-semibold italic">{PARTY.title}</span>
          </a>
          <div className="ml-auto hidden items-center gap-1 lg:flex">
            {NAV.map(([id, label]) => (
              <a key={id} href={`#${id}`} className="rounded-full px-3 py-1.5 text-sm text-ivory/75 transition hover:bg-white/5 hover:text-gold-light">{label}</a>
            ))}
          </div>
          <a href="#rsvp" className="btn btn-gold btn-sm ml-auto lg:ml-0">{guest ? 'My reply' : 'RSVP'}</a>
        </div>
      </motion.nav>

      {/* ───────── Hero ───────── */}
      <header id="top" className="bg-night relative isolate flex min-h-svh flex-col items-center justify-center overflow-hidden px-5 pt-32 pb-28 text-center text-ivory">
        <Fireworks className="absolute inset-0 -z-10 h-full w-full" />
        <Mandala className="text-gold/[0.07] animate-spin-slow absolute top-1/2 left-1/2 -z-10 size-[130vmin] -translate-x-1/2 -translate-y-1/2" />
        <Toran className="absolute inset-x-0 top-0 h-24 w-full sm:h-36" />
        <Lantern className="absolute top-0 left-[3%] h-36 w-12 sm:left-[9%] sm:h-64 sm:w-20" />
        <Lantern className="absolute top-0 right-[3%] h-28 w-10 sm:right-[9%] sm:h-52 sm:w-16" delay={-2.5} />

        <motion.div initial="hidden" animate="show" variants={{ show: { transition: { staggerChildren: 0.13, delayChildren: 0.25 } } }} className="relative">
          <motion.p variants={fadeUp} className="font-deva text-gold-light text-2xl sm:text-3xl">शुभ दीपावली</motion.p>
          <motion.p variants={fadeUp} className="font-display mt-7 text-2xl text-ivory/85 italic sm:text-3xl">{guest ? `Dear ${first},` : 'Dear friends,'}</motion.p>
          <motion.p variants={fadeUp} className="kicker text-gold-light/75 mt-3">you are warmly invited to</motion.p>
          <motion.h1 variants={fadeUp} className="font-display text-foil mt-2 pb-2 text-[clamp(4.2rem,17vw,10.5rem)] leading-[0.92] font-semibold italic">
            {PARTY.title}
          </motion.h1>
          <motion.div variants={fadeUp} className="text-gold-light mt-5 flex items-center justify-center gap-3 sm:gap-4">
            <span className="h-px w-5 bg-linear-to-r from-transparent to-gold/70 sm:w-20" />
            <span className="kicker whitespace-nowrap max-sm:tracking-[0.18em]">{WEEKDAY} · {DAY_MONTH} · {YEAR}</span>
            <span className="h-px w-5 bg-linear-to-l from-transparent to-gold/70 sm:w-20" />
          </motion.div>
          <motion.p variants={fadeUp} className="mt-3 text-ivory/70">{TIME_STR}</motion.p>
          <motion.div variants={fadeUp} className="mt-9 flex items-end justify-center gap-2 sm:gap-5">
            {['size-10 sm:size-12', 'size-14 sm:size-16', 'size-20 sm:size-24', 'size-14 sm:size-16', 'size-10 sm:size-12'].map((size, i) => (
              <Diya key={i} className={size} delay={i * -0.37} />
            ))}
          </motion.div>
          <motion.div variants={fadeUp} className="mt-9">
            <Countdown />
          </motion.div>
          <motion.div variants={fadeUp} className="mt-10 flex flex-wrap justify-center gap-3">
            <a className="btn btn-gold" href="#rsvp">{guest ? 'View my reply' : 'RSVP now'}</a>
            <a className="btn btn-ghost-dark" href="#details">See the details</a>
          </motion.div>
          {guest && (
            <motion.p variants={fadeUp} className="text-gold-light/80 mt-6 inline-flex items-center gap-2 text-sm">
              <Check className="size-4" /> {STATUS[guest.status]} · Ticket #{String(guest.ticket_no).padStart(3, '0')}
            </motion.p>
          )}
        </motion.div>
        <Scallop className="absolute inset-x-0 bottom-0 text-ivory" />
      </header>

      <main>
        {/* ───────── 01 Details + line-up ───────── */}
        <Section id="details" n="01" kicker="The evening" title="Party details">
          <div className="grid gap-4 md:grid-cols-3">
            <InfoTile icon={CalendarDays} label="Date" value={`${WEEKDAY}, ${DAY_MONTH}`} sub={String(YEAR)} delay={0} />
            <InfoTile icon={Clock} label="Time" value={fmtTime(START)} sub="Onwards, until late" delay={0.08} />
            <InfoTile
              icon={MapPin}
              label="Venue"
              value={PARTY.venue}
              delay={0.16}
              sub={<a href={MAPS_URL} target="_blank" rel="noopener" className="text-maroon-700 font-semibold underline-offset-4 hover:underline">Get directions →</a>}
            />
          </div>

          <Reveal delay={0.1} className="mt-6 grid gap-8 rounded-3xl border border-ink/10 bg-white/50 p-6 sm:p-8 md:grid-cols-3">
            <div>
              <p className="label">Add to your calendar</p>
              <div className="flex flex-wrap gap-2">
                <a className="btn btn-primary btn-sm" href={GCAL_URL} target="_blank" rel="noopener"><CalendarPlus className="size-4" /> Google</a>
                <a className="btn btn-ghost btn-sm" href="/invite.ics"><CalendarPlus className="size-4" /> Apple / Outlook</a>
              </div>
              <p className="mt-3 text-xs text-ink-soft">Includes alerts one day and two hours before.</p>
            </div>
            <div>
              <p className="label">Send yourself a reminder</p>
              <div className="flex flex-wrap gap-2">
                <a className="btn btn-wa btn-sm" href={wa(remind)} target="_blank" rel="noopener"><MessageCircle className="size-4" /> WhatsApp</a>
                <a className="btn btn-ghost btn-sm" href={sms(remind)}><Smartphone className="size-4" /> Text message</a>
              </div>
              <p className="mt-3 text-xs text-ink-soft">
                {PARTY.hostPhone
                  ? <a className="text-maroon-700 font-semibold" href={wa(`Hi! A question about ${PARTY.title}:`, PARTY.hostPhone)} target="_blank" rel="noopener">Questions? Message the host →</a>
                  : 'Opens a ready-to-send message with all the details.'}
              </p>
            </div>
            <div>
              <p className="label">Share the invite</p>
              <div className="flex flex-wrap gap-2">
                <a className="btn btn-wa btn-sm" href={wa(INVITE_TEXT)} target="_blank" rel="noopener"><MessageCircle className="size-4" /> WhatsApp</a>
                <a className="btn btn-ghost btn-sm" href={sms(INVITE_TEXT)}><Smartphone className="size-4" /> Text</a>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => (canShare ? navigator.share({ title: PARTY.title, text: INVITE_TEXT }).catch(() => {}) : run('copy', async () => { await navigator.clipboard.writeText(SITE_URL); notify('Invite link copied'); }))}
                >
                  {canShare ? <Share2 className="size-4" /> : <Link2 className="size-4" />} {canShare ? 'Share' : 'Copy link'}
                </button>
              </div>
              <p className="mt-3 text-xs text-ink-soft">Everyone RSVPs for themselves on their own phone.</p>
            </div>
          </Reveal>

          <Reveal className="mt-24 mb-10 text-center">
            <p className="kicker text-saffron-deep">How the night unfolds</p>
            <h3 className="font-display mt-3 text-4xl font-semibold sm:text-5xl">The line-up</h3>
          </Reveal>
          <ol className="relative mx-auto max-w-xl">
            <span className="absolute top-6 bottom-6 left-6 w-px bg-linear-to-b from-gold/0 via-gold/60 to-gold/0" aria-hidden />
            {PARTY.lineup.map((item, i) => {
              const Icon = ICONS[item.icon];
              return (
                <motion.li
                  key={item.title}
                  className="relative grid grid-cols-[3rem_1fr] gap-5 pb-9 last:pb-0"
                  initial={{ opacity: 0, x: -16 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: '-60px' }}
                  transition={{ duration: 0.7, ease }}
                >
                  <motion.span
                    className="relative grid size-12 place-items-center rounded-full border border-gold/50"
                    initial={{ backgroundColor: '#fbf4e6', color: '#9a6b12', boxShadow: '0 0 0 0 rgba(232,113,26,0)' }}
                    whileInView={{ backgroundColor: '#6e1227', color: '#f3d27a', boxShadow: '0 0 30px 2px rgba(232,113,26,.45)' }}
                    viewport={{ once: true, margin: '-60px' }}
                    transition={{ duration: 0.9, delay: 0.3 }}
                  >
                    <Icon className="size-5" strokeWidth={1.7} />
                  </motion.span>
                  <div className="pt-1">
                    <p className="font-display text-saffron-deep text-sm font-semibold italic">{String(i + 1).padStart(2, '0')}</p>
                    <p className="font-display flex flex-wrap items-center gap-3 text-2xl font-semibold sm:text-3xl">
                      {item.title}
                      {item.tbd && <span className="kicker rounded-full border border-dashed border-saffron-deep/60 px-2.5 py-1 font-sans text-[0.6rem] text-saffron-deep">To be confirmed</span>}
                    </p>
                    <p className="mt-1 text-ink-soft">{item.note}</p>
                  </div>
                </motion.li>
              );
            })}
          </ol>
        </Section>

        {/* ───────── 02 Dress code ───────── */}
        <Section id="dress" n="02" kicker="What to wear" title="Dress code" intro={PARTY.dressNote} dark>
          <Reveal className="text-center">
            <p className="font-display text-gold-light text-3xl italic sm:text-4xl">{PARTY.dressTheme}</p>
            <div className="mt-8 flex flex-wrap justify-center gap-6">
              {PARTY.palette.map(([color, name], i) => (
                <motion.div
                  key={name}
                  className="flex flex-col items-center gap-2"
                  initial={{ opacity: 0, scale: 0.6 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.08, type: 'spring', stiffness: 220, damping: 16 }}
                >
                  <span
                    className="size-14 rounded-full ring-1 ring-white/25 sm:size-16"
                    style={{ background: `radial-gradient(circle at 32% 28%, rgba(255,255,255,.5), transparent 42%), ${color}`, boxShadow: `0 10px 30px -8px ${color}` }}
                  />
                  <span className="text-xs text-ivory/60">{name}</span>
                </motion.div>
              ))}
            </div>
          </Reveal>

          <Reveal className="mt-20 mb-8 text-center">
            <h3 className="font-display text-3xl font-semibold sm:text-4xl">Pick your outfit vibe</h3>
            <p className="mt-2 text-sm text-ivory/60">{guest ? 'Your pick saves to your reply automatically.' : 'Your pick is saved when you send your reply.'}</p>
          </Reveal>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" role="radiogroup" aria-label="Outfit vibe">
            {PARTY.dressCodes.map((d, i) => {
              const Icon = ICONS[d.icon], selected = dress === d.id;
              const pickers = state.rsvps.filter(r => r.dress === d.id);
              return (
                <motion.button
                  key={d.id}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => pickDress(d.id)}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.08, duration: 0.7, ease }}
                  whileHover={{ y: -6 }}
                  whileTap={{ scale: 0.98 }}
                  className={`relative flex cursor-pointer flex-col rounded-3xl border p-6 text-left transition-colors ${selected ? 'border-gold bg-gold/[0.12] shadow-[0_0_0_4px_rgb(212_160_23/.15)]' : 'border-white/10 bg-white/[0.04] hover:border-gold/40'}`}
                >
                  {selected && (
                    <motion.span layoutId="dress-check" className="bg-gold text-maroon-900 absolute top-4 right-4 grid size-7 place-items-center rounded-full">
                      <Check className="size-4" strokeWidth={3} />
                    </motion.span>
                  )}
                  <span className="bg-gold/15 text-gold-light grid size-12 place-items-center rounded-2xl"><Icon className="size-6" strokeWidth={1.6} /></span>
                  <b className="font-display mt-5 text-2xl font-semibold text-ivory">{d.name}</b>
                  <span className="mt-1 text-sm leading-relaxed text-ivory/60">{d.desc}</span>
                  <span className="text-gold-light/80 mt-6 flex items-center gap-2 text-xs">
                    {pickers.length ? (
                      <>
                        <span className="flex -space-x-2">{pickers.slice(0, 4).map((p, j) => <Avatar key={j} name={p.name} className="size-6 text-[0.55rem] ring-maroon-900" />)}</span>
                        {pickers.length} {pickers.length > 1 ? 'guests' : 'guest'}
                      </>
                    ) : 'Be the first to pick this'}
                  </span>
                </motion.button>
              );
            })}
          </div>
        </Section>

        {/* ───────── 03 RSVP ───────── */}
        <Section id="rsvp" n="03" kicker={`Kindly reply by ${PARTY.rsvpBy}`} title="Will you join us?">
          <Reveal className="mx-auto max-w-xl">
            <div className="relative rounded-[2rem] border border-gold/50 bg-white/75 p-2 shadow-[0_40px_90px_-45px_rgba(74,11,28,.6)]">
              <div className="relative overflow-hidden rounded-[1.6rem] border border-gold/30 px-6 py-10 sm:px-10">
                <Mandala className="text-gold/[0.18] pointer-events-none absolute -top-16 -left-16 size-40" />
                <Mandala className="text-gold/[0.18] pointer-events-none absolute -right-16 -bottom-16 size-40" />
                <AnimatePresence mode="wait" initial={false}>
                  {guest && !editing ? (
                    <motion.div key="done" initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.97 }} transition={{ duration: 0.4 }} className="relative text-center">
                      <svg viewBox="0 0 52 52" className="mx-auto size-16">
                        <circle cx="26" cy="26" r="24" fill="#6e1227" />
                        <motion.path d="M15 27 l7 7 l15 -16" fill="none" stroke="#f3d27a" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.6, delay: 0.2 }} />
                      </svg>
                      <p className="font-display mt-5 text-4xl font-semibold">Thank you, {first}</p>
                      <p className="mt-2 text-ink-soft">
                        {guest.status === 'yes' ? `We can't wait to celebrate with you on ${WEEKDAY}.` : guest.status === 'maybe' ? 'Let us know when you decide. You can update this anytime.' : "We'll miss you. Thank you for letting us know."}
                      </p>
                      <dl className="mt-7 grid grid-cols-3 divide-x divide-ink/10 rounded-2xl border border-ink/10 bg-ivory/60 py-4 text-sm">
                        <div><dt className="label mb-1">Reply</dt><dd className="font-semibold">{{ yes: 'Attending', maybe: 'Deciding', no: 'Not coming' }[guest.status]}</dd></div>
                        <div><dt className="label mb-1">Outfit</dt><dd className="font-semibold">{dressName(guest.dress)?.split(' ')[0] ?? '—'}</dd></div>
                        <div><dt className="label mb-1">Ticket</dt><dd className="font-semibold">#{String(guest.ticket_no).padStart(3, '0')}</dd></div>
                      </dl>
                      <div className="mt-7 flex flex-wrap justify-center gap-3">
                        <button className="btn btn-ghost btn-sm" onClick={() => setEditing(true)}>Change my reply</button>
                        <a className="btn btn-primary btn-sm" href="#keepsake"><Ticket className="size-4" /> My memory ticket</a>
                      </div>
                    </motion.div>
                  ) : (
                    <motion.form key={guest ? 'edit' : 'new'} onSubmit={onRsvp} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.4 }} className="relative grid gap-5">
                      <label>
                        <span className="label">Your name</span>
                        <input className="field" name="name" required maxLength={60} autoComplete="name" placeholder="One person per reply" defaultValue={guest?.name} />
                      </label>
                      <label>
                        <span className="label">Mobile number <span className="font-medium tracking-normal normal-case opacity-70">· optional, for reminders</span></span>
                        <input className="field" name="phone" type="tel" maxLength={20} autoComplete="tel" placeholder="+1 555 123 4567" defaultValue={guest?.phone} />
                      </label>
                      <fieldset>
                        <legend className="label">Your reply</legend>
                        <div className="grid gap-2.5 sm:grid-cols-3">
                          {REPLIES.map(({ value, label, icon: Icon }) => (
                            <label key={value} className="relative cursor-pointer">
                              <input type="radio" name="status" value={value} required defaultChecked={guest?.status === value} className="peer absolute opacity-0" />
                              <span className="flex items-center gap-3 rounded-2xl border border-ink/15 bg-white/60 px-4 py-3.5 text-sm font-semibold transition peer-checked:border-maroon-700 peer-checked:bg-maroon-700 peer-checked:text-ivory peer-focus-visible:ring-4 peer-focus-visible:ring-maroon-700/20 hover:border-maroon-700/40 sm:flex-col sm:gap-2 sm:py-5 sm:text-center">
                                <Icon className="size-5 flex-none" strokeWidth={1.8} />
                                {label}
                              </span>
                            </label>
                          ))}
                        </div>
                      </fieldset>
                      <p className="text-sm text-ink-soft">
                        Outfit vibe: <b className="text-ink">{dressName(dress) ?? 'not picked yet'}</b> · <a href="#dress" className="text-maroon-700 font-semibold">{dress ? 'change' : 'pick one'}</a>
                      </p>
                      <button className="btn btn-primary h-14 w-full text-base" disabled={!gid || busy === 'rsvp'}>
                        {busy === 'rsvp' ? <Loader2 className="size-5 animate-spin" /> : <Send className="size-4" />}
                        {guest ? 'Update my reply' : 'Send my reply'}
                      </button>
                      <p className="-mt-2 text-center text-xs text-ink-soft">Each guest replies for themselves. Sharing a phone? Ask them to RSVP on theirs.</p>
                      {guest && <button type="button" className="text-sm text-ink-soft underline-offset-4 hover:underline" onClick={() => setEditing(false)}>Cancel</button>}
                    </motion.form>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </Reveal>

          <Reveal className="mt-20 text-center">
            <p className="kicker text-saffron-deep">The guest list</p>
            <p className="font-display mt-3 text-3xl font-semibold sm:text-4xl">
              {attending.length ? `${attending.length} joyfully attending` : 'Be the first to reply'}
              {maybes.length > 0 && <span className="block text-ink-soft sm:inline"><span className="max-sm:hidden"> · </span>{maybes.length} deciding</span>}
            </p>
            <div className="mx-auto mt-8 flex max-w-3xl flex-wrap justify-center gap-x-4 gap-y-5">
              <AnimatePresence>
                {[...attending, ...maybes].map(r => (
                  <motion.div key={r.name} layout initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} className="flex w-16 flex-col items-center gap-2">
                    <Avatar name={r.name} className={`size-12 text-sm ${r.status === 'maybe' ? 'opacity-55' : ''}`} />
                    <span className="w-full truncate text-xs text-ink-soft">{firstName(r.name)}</span>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </Reveal>
        </Section>

        {/* ───────── 04 Menu ───────── */}
        <Section id="menu" n="04" kicker="Shh… it's a surprise" title="Tonight's menu" dark>
          <Reveal className="mx-auto max-w-lg">
            <div className="rounded-[2rem] border border-gold/40 p-2">
              {me?.menu ? (
                <div className="overflow-hidden rounded-[1.6rem]">
                  <ScratchCard>
                    <div className="bg-maroon-950/50 rounded-[1.6rem] border border-gold/25 px-6 py-12 text-center sm:px-10">
                      <Ornament className="text-gold mx-auto w-36" />
                      {me.menu.map(([course, items], i) => (
                        <div key={course} className="py-5">
                          <p className="kicker text-gold">{course}</p>
                          <p className="font-display mt-2 text-2xl text-ivory/90 italic">{items}</p>
                          {i < me.menu!.length - 1 && <span className="bg-gold/30 mx-auto mt-5 block h-px w-12" />}
                        </div>
                      ))}
                      <Ornament className="text-gold mx-auto w-36 rotate-180" />
                    </div>
                  </ScratchCard>
                </div>
              ) : (
                <div className="relative overflow-hidden rounded-[1.6rem] border border-dashed border-gold/30 px-6 py-16 text-center">
                  <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-5 opacity-20 blur-[3px]" aria-hidden>
                    {[60, 75, 50, 70, 55].map((w, i) => <span key={i} className="bg-gold/60 block h-3 rounded-full" style={{ width: `${w}%` }} />)}
                  </div>
                  <div className="relative">
                    <span className="bg-maroon-600 text-gold-light mx-auto grid size-20 place-items-center rounded-full shadow-[inset_0_-6px_12px_rgba(0,0,0,.35),0_10px_30px_-10px_rgba(0,0,0,.8)] ring-4 ring-maroon-700">
                      <Lock className="size-7" />
                    </span>
                    <p className="font-display mt-6 text-3xl font-semibold">Reply to unlock</p>
                    <p className="mt-2 text-ivory/65">The menu reveals itself the moment you RSVP.</p>
                    <a href="#rsvp" className="btn btn-gold mt-7">RSVP to unlock</a>
                  </div>
                </div>
              )}
            </div>
          </Reveal>
        </Section>

        {/* ───────── 05 Photo wall ───────── */}
        <Section id="photos" n="05" kicker="Live photo wall" title="Capture the night" intro="Every photo lands here for everyone, right away. Let's make this year's memories together.">
          <Reveal className="mb-10 flex items-center justify-center gap-3">
            <span className="bg-maroon-700 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[0.65rem] font-bold tracking-[0.2em] text-ivory">
              <span className="animate-live size-2 rounded-full bg-red-500" /> LIVE
            </span>
            <span className="text-sm text-ink-soft">{photoCount ? `${photoCount} ${photoCount === 1 ? 'memory' : 'memories'} so far` : 'Waiting for the first photo'}</span>
          </Reveal>

          <Reveal className="mx-auto max-w-2xl">
            {!guest ? <ReplyFirst what="share photos" /> : (
            <form onSubmit={onUpload}>
              <label
                onDragOver={e => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={onDrop}
                className={`group flex cursor-pointer flex-col items-center rounded-3xl border-2 border-dashed px-6 py-10 text-center transition ${dragging ? 'border-maroon-700 bg-maroon-700/5' : 'border-ink/20 bg-white/50 hover:border-maroon-700/50 hover:bg-white/70'}`}
              >
                <input type="file" accept="image/*" multiple className="sr-only" onChange={e => { if (e.target.files) addFiles(e.target.files); e.target.value = ''; }} />
                <span className="bg-maroon-700 text-gold-light grid size-14 place-items-center rounded-full transition group-hover:scale-110"><ImagePlus className="size-6" /></span>
                <b className="font-display mt-4 text-2xl font-semibold">Add your photos</b>
                <span className="mt-1 text-sm text-ink-soft">Tap to choose, or drop them here · up to 10 at a time</span>
              </label>

              <AnimatePresence>
                {picked.length > 0 && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                    <div className="grid grid-cols-5 gap-2 pt-4">
                      {picked.map((p, i) => (
                        <motion.div key={p.url} layout initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="relative aspect-square overflow-hidden rounded-xl bg-ink/10">
                          {/* eslint-disable-next-line @next/next/no-img-element -- local preview */}
                          <img src={p.url} alt="" className="size-full object-cover" />
                          {p.status !== 'idle' && (
                            <span className="absolute inset-0 grid place-items-center bg-maroon-900/55 text-ivory">
                              {p.status === 'uploading' ? <Loader2 className="size-5 animate-spin" /> : <Check className="size-5" />}
                            </span>
                          )}
                          {p.status === 'idle' && busy !== 'photo' && (
                            <button type="button" onClick={() => removePicked(i)} aria-label="Remove photo" className="absolute top-1 right-1 grid size-6 place-items-center rounded-full bg-ink/70 text-ivory">
                              <X className="size-3.5" />
                            </button>
                          )}
                        </motion.div>
                      ))}
                    </div>
                    <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                      <input className="field" name="caption" placeholder="Add a caption (optional)" maxLength={140} />
                      <button className="btn btn-primary flex-none" disabled={busy === 'photo'}>
                        {busy === 'photo' ? <Loader2 className="size-4 animate-spin" /> : <ImagePlus className="size-4" />}
                        {busy === 'photo' ? `Uploading ${picked.filter(p => p.status === 'done').length + 1} of ${picked.length}` : `Share ${picked.length} photo${picked.length > 1 ? 's' : ''}`}
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </form>
            )}
          </Reveal>

          <div className="mt-14 columns-2 gap-4 sm:columns-3 sm:gap-6 lg:columns-4">
            <AnimatePresence initial={false}>
              {state.photos.map((p, i) => (
                <motion.button
                  key={p.id}
                  type="button"
                  layout
                  initial={{ opacity: 0, y: 30, rotate: tilt(p.id) }}
                  animate={{ opacity: 1, y: 0, rotate: tilt(p.id) }}
                  whileHover={{ rotate: 0, scale: 1.03, zIndex: 10 }}
                  transition={{ duration: 0.5, ease }}
                  onClick={() => setOpenIdx(i)}
                  className="relative mb-5 block w-full cursor-zoom-in break-inside-avoid bg-white p-2 pb-3 text-left shadow-[0_18px_40px_-20px_rgba(43,20,11,.55)] sm:mb-7 sm:p-2.5"
                >
                  { }
                  <motion.img layoutId={`photo-${p.id}`} src={p.url} alt={p.caption || `Photo by ${p.name}`} loading="lazy" className="block w-full" />
                  <span className="font-display mt-2 block truncate px-1 text-lg leading-tight italic">{p.caption || firstName(p.name)}</span>
                  {p.caption && <span className="block truncate px-1 text-xs text-ink-soft">{p.name}</span>}
                </motion.button>
              ))}
            </AnimatePresence>
          </div>
          {!photoCount && (
            <div className="flex justify-center gap-4 opacity-60" aria-hidden>
              {[-4, 2, -2].map((r, i) => (
                <div key={i} className="grid aspect-[4/5] w-28 place-items-center bg-white p-2 shadow-lg sm:w-36" style={{ rotate: `${r}deg` }}>
                  <div className="bg-maroon-900 grid size-full place-items-center"><Diya className="size-14" delay={-i} /></div>
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* ───────── 06 Wishes ───────── */}
        <Section id="wishes" n="06" kicker="Wishes & shout-outs" title="Leave a little light" dark>
          <Reveal className="mx-auto max-w-2xl">
            {!guest ? <ReplyFirst what="leave a wish" dark /> : (
            <form onSubmit={onWish} className="flex flex-col gap-3 rounded-3xl border border-white/10 bg-white/[0.05] p-4 sm:flex-row sm:items-start">
              <Avatar name={guest.name} className="hidden size-11 text-sm ring-maroon-900 sm:grid" />
              <textarea
                name="text"
                rows={2}
                maxLength={500}
                required
                placeholder={`A wish, a song request or a shout-out, ${first}…`}
                className="focus:border-gold/60 min-h-12 w-full resize-none rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-ivory outline-none placeholder:text-ivory/40 focus:ring-4 focus:ring-gold/10"
              />
              <button className="btn btn-gold flex-none" disabled={busy === 'wish'}>
                {busy === 'wish' ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />} Post
              </button>
            </form>
            )}
          </Reveal>
          <div className="mt-14 columns-1 gap-5 sm:columns-2 lg:columns-3">
            <AnimatePresence initial={false}>
              {state.comments.map((c, i) => (
                <motion.figure
                  key={c.id}
                  layout
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: Math.min(i, 6) * 0.05, ease }}
                  className="mb-5 break-inside-avoid rounded-3xl border border-gold/15 bg-linear-to-b from-white/[0.07] to-white/[0.02] p-6"
                >
                  <Quote className="text-gold/50 size-6" />
                  <blockquote className="font-display mt-3 text-xl leading-snug break-words whitespace-pre-line text-ivory/90 italic">{c.text}</blockquote>
                  <figcaption className="mt-5 flex items-center gap-3">
                    <Avatar name={c.name} className="size-8 text-[0.65rem] ring-maroon-900" />
                    <span className="text-sm font-semibold">{c.name}</span>
                    <span className="ml-auto text-xs text-ivory/45">{when(c.created_at)}</span>
                  </figcaption>
                </motion.figure>
              ))}
            </AnimatePresence>
          </div>
          {!state.comments.length && <p className="text-center text-ivory/50">No wishes yet. Light the first one.</p>}
        </Section>

        {/* ───────── 07 Memory ticket ───────── */}
        <Section id="keepsake" n="07" kicker="A keepsake" title="Your memory ticket" intro="Finish the four steps, then create a ticket with your reply, outfit, photos and wish. Save it, share it or print it.">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <Reveal className="mx-auto w-full max-w-md rounded-3xl border border-ink/10 bg-white/60 p-7 sm:p-9">
              <div className="flex items-center gap-5">
                <ProgressRing value={done / steps.length} />
                <div>
                  <p className="font-display text-3xl font-semibold">{done} of {steps.length} done</p>
                  <p className="text-sm text-ink-soft">{done === steps.length ? 'Your ticket is complete!' : 'Every step adds to your ticket.'}</p>
                </div>
              </div>
              <ul className="mt-7 grid gap-3">
                {steps.map(([ok, label]) => (
                  <li key={label} className="flex items-center gap-3">
                    <motion.span
                      animate={{ backgroundColor: ok ? '#6e1227' : 'rgba(0,0,0,0)', borderColor: ok ? '#6e1227' : 'rgba(43,20,11,.25)' }}
                      className="grid size-6 place-items-center rounded-full border text-gold-light"
                    >
                      {ok && <Check className="size-3.5" strokeWidth={3} />}
                    </motion.span>
                    <span className={ok ? 'font-medium' : 'text-ink-soft'}>{label}</span>
                  </li>
                ))}
              </ul>
              <button className="btn btn-primary mt-8 h-14 w-full text-base" onClick={makeTicket} disabled={!guest || busy === 'ticket'}>
                {!guest ? <><Lock className="size-4" /> Reply first to create it</> : busy === 'ticket' ? <Loader2 className="size-5 animate-spin" /> : <><Sparkles className="size-4" /> {ticketDrawn ? 'Refresh my ticket' : 'Create my ticket'}</>}
              </button>
              <AnimatePresence>
                {ticketDrawn && (
                  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                    <button className="btn btn-ghost btn-sm" onClick={saveTicket}><Download className="size-4" /> Save</button>
                    <button className="btn btn-ghost btn-sm" onClick={() => print()}><Printer className="size-4" /> Print</button>
                    {canShare && <button className="btn btn-ghost btn-sm col-span-2 sm:col-span-1" onClick={shareTicket}><Share2 className="size-4" /> Share</button>}
                  </motion.div>
                )}
              </AnimatePresence>
            </Reveal>
            <Reveal delay={0.15} className="relative mx-auto w-full max-w-sm">
              <motion.canvas
                id="ticket"
                ref={ticket}
                initial={false}
                animate={ticketDrawn ? { opacity: 1, rotate: -2, y: 0 } : { opacity: 0, rotate: 0, y: 20 }}
                transition={{ duration: 0.8, ease }}
                className={`w-full drop-shadow-[0_30px_40px_rgba(43,20,11,.45)] ${ticketDrawn ? 'block' : 'hidden'}`}
              />
              {!ticketDrawn && (
                <div className="grid aspect-[1080/1760] place-items-center rounded-[2rem] border-2 border-dashed border-ink/15 bg-white/30 text-center text-ink-soft">
                  <div>
                    <Ticket className="mx-auto size-10 opacity-50" strokeWidth={1.4} />
                    <p className="font-display mt-3 text-xl italic">Your ticket appears here</p>
                  </div>
                </div>
              )}
            </Reveal>
          </div>
        </Section>
      </main>

      {/* ───────── Footer ───────── */}
      <footer className="bg-night relative overflow-hidden px-5 pt-40 pb-16 text-center text-ivory">
        <Scallop flip className="absolute inset-x-0 top-0 text-ivory" />
        <Toran className="absolute inset-x-0 top-4 h-20 w-full sm:top-6 sm:h-28" />
        <Diya className="mx-auto size-20" />
        <p className="font-deva text-gold-light mt-4 text-3xl">शुभ दीपावली</p>
        <p className="font-display mt-3 text-2xl text-ivory/80 italic">See you on {WEEKDAY}{guest ? `, ${first}` : ''}.</p>
        <p className="kicker mt-10 text-ivory/35">{DATE_STR} · {TIME_STR}</p>
      </footer>

      {/* ───────── Lightbox ───────── */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex flex-col bg-maroon-950/95 p-4 backdrop-blur-md"
            onClick={e => e.target === e.currentTarget && setOpenIdx(null)}
            role="dialog"
            aria-modal
            aria-label={open.caption || `Photo by ${open.name}`}
          >
            <div className="flex items-center justify-between text-ivory">
              <span className="text-sm text-ivory/60">{openIdx! + 1} / {photoCount}</span>
              <div className="flex gap-2">
                <a href={open.url} download target="_blank" rel="noopener" className="grid size-11 place-items-center rounded-full bg-white/10 hover:bg-white/20" aria-label="Download"><Download className="size-5" /></a>
                <button onClick={() => setOpenIdx(null)} className="grid size-11 place-items-center rounded-full bg-white/10 hover:bg-white/20" aria-label="Close"><X className="size-5" /></button>
              </div>
            </div>
            <div className="relative flex min-h-0 flex-1 items-center justify-center" onClick={e => e.target === e.currentTarget && setOpenIdx(null)}>
              { }
              <motion.img key={open.id} layoutId={`photo-${open.id}`} src={open.url} alt={open.caption || `Photo by ${open.name}`} className="max-h-full max-w-full rounded-lg object-contain shadow-2xl" />
              {photoCount > 1 && (
                <>
                  <button onClick={() => setOpenIdx((openIdx! - 1 + photoCount) % photoCount)} className="absolute left-0 grid size-11 place-items-center rounded-full bg-white/10 text-ivory hover:bg-white/20" aria-label="Previous"><ChevronLeft /></button>
                  <button onClick={() => setOpenIdx((openIdx! + 1) % photoCount)} className="absolute right-0 grid size-11 place-items-center rounded-full bg-white/10 text-ivory hover:bg-white/20" aria-label="Next"><ChevronRight /></button>
                </>
              )}
            </div>
            <p className="pt-4 text-center text-ivory">
              <span className="font-display text-2xl italic">{open.caption || open.name}</span>
              {open.caption && <span className="block text-sm text-ivory/60">by {open.name}</span>}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ───────── Toast ───────── */}
      <div className="pointer-events-none fixed inset-x-0 bottom-6 z-[60] flex justify-center px-4" role="status" aria-live="polite">
        <AnimatePresence>
          {toast && (
            <motion.div
              key={toast.msg}
              initial={{ opacity: 0, y: 24, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.97 }}
              className="pointer-events-auto flex max-w-md items-center gap-3 rounded-2xl border border-gold/40 bg-ivory px-5 py-3.5 text-sm font-medium text-ink shadow-[0_20px_50px_-15px_rgba(0,0,0,.6)]"
            >
              {toast.ok ? <span className="bg-maroon-700 text-gold-light grid size-6 flex-none place-items-center rounded-full"><Check className="size-3.5" strokeWidth={3} /></span> : <AlertCircle className="size-5 flex-none text-red-700" />}
              {toast.msg}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </MotionConfig>
  );
}

function ReplyFirst({ what, dark = false }: { what: string; dark?: boolean }) {
  return (
    <div className={`flex flex-col items-center gap-4 rounded-3xl border border-dashed px-6 py-10 text-center ${dark ? 'border-gold/30 text-ivory/75' : 'border-ink/20 bg-white/40 text-ink-soft'}`}>
      <Lock className="size-6 opacity-60" />
      <p>Send your RSVP first, then you can {what} here.</p>
      <a href="#rsvp" className={`btn btn-sm ${dark ? 'btn-gold' : 'btn-primary'}`}>RSVP now</a>
    </div>
  );
}

function Reveal({ children, className, delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  return (
    <motion.div className={className} initial={{ opacity: 0, y: 28 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-60px' }} transition={{ duration: 0.8, delay, ease }}>
      {children}
    </motion.div>
  );
}

function Section({ id, n, kicker, title, intro, dark = false, children }: { id: string; n: string; kicker: string; title: string; intro?: string; dark?: boolean; children: ReactNode }) {
  return (
    <section id={id} className={`relative isolate overflow-hidden px-5 py-24 sm:py-32 ${dark ? 'bg-night text-ivory' : 'bg-paper text-ink'}`}>
      {dark && <Scallop flip className="absolute inset-x-0 top-0 text-ivory" />}
      {dark && <Scallop className="absolute inset-x-0 bottom-0 text-ivory" />}
      <Mandala className={`animate-spin-slow pointer-events-none absolute -top-48 -right-48 -z-10 size-[32rem] ${dark ? 'text-gold/[0.07]' : 'text-maroon-700/[0.06]'}`} />
      <div className="mx-auto max-w-6xl">
        <Reveal className="mx-auto mb-14 max-w-2xl text-center">
          <p className={`kicker ${dark ? 'text-gold-light/80' : 'text-saffron-deep'}`}>{n} — {kicker}</p>
          <h2 className="font-display mt-4 text-5xl leading-[1.05] font-semibold text-balance sm:text-6xl">{title}</h2>
          <Ornament className={`mx-auto mt-6 w-44 ${dark ? 'text-gold' : 'text-gold-deep'}`} />
          {intro && <p className={`mt-6 leading-relaxed text-balance ${dark ? 'text-ivory/70' : 'text-ink-soft'}`}>{intro}</p>}
        </Reveal>
        {children}
      </div>
    </section>
  );
}

function InfoTile({ icon: Icon, label, value, sub, delay }: { icon: LucideIcon; label: string; value: string; sub: ReactNode; delay: number }) {
  return (
    <Reveal delay={delay} className="flex flex-col items-center rounded-3xl border border-ink/10 bg-white/60 px-6 py-8 text-center">
      <span className="bg-maroon-700 text-gold-light grid size-12 place-items-center rounded-full"><Icon className="size-5" strokeWidth={1.7} /></span>
      <p className="label mt-5 mb-1">{label}</p>
      <p className="font-display text-2xl leading-tight font-semibold sm:text-[1.7rem]">{value}</p>
      <p className="mt-1 text-sm text-ink-soft">{sub}</p>
    </Reveal>
  );
}

function Avatar({ name, className = '' }: { name: string; className?: string }) {
  const tone = TONES[[...name].reduce((n, ch) => (n * 31 + ch.charCodeAt(0)) % 997, 7) % TONES.length];
  const initials = name.trim().split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase();
  return <span className={`grid flex-none place-items-center rounded-full font-bold text-ivory ring-2 ring-ivory ${className}`} style={{ background: tone }}>{initials}</span>;
}

function ProgressRing({ value }: { value: number }) {
  const r = 30, c = 2 * Math.PI * r;
  return (
    <svg viewBox="0 0 72 72" className="size-20 flex-none -rotate-90">
      <circle cx="36" cy="36" r={r} fill="none" stroke="rgba(43,20,11,.1)" strokeWidth="6" />
      <motion.circle cx="36" cy="36" r={r} fill="none" stroke="#6e1227" strokeWidth="6" strokeLinecap="round" strokeDasharray={c} initial={false} animate={{ strokeDashoffset: c * (1 - value) }} transition={{ duration: 1, ease }} />
    </svg>
  );
}

function Countdown() {
  const now = useSyncExternalStore(tickEverySecond, () => Math.floor(Date.now() / 1000), () => 0);
  if (!now) return <div className="h-[88px]" />;
  const left = Math.floor(START.getTime() / 1000) - now;
  if (left <= 0) {
    return <p className="font-display text-gold-light text-3xl italic">{now * 1000 < END.getTime() ? 'The celebration has begun. Share your photos!' : 'Thank you for the memories.'}</p>;
  }
  const parts = [[Math.floor(left / 86400), 'Days'], [Math.floor(left / 3600) % 24, 'Hours'], [Math.floor(left / 60) % 60, 'Minutes'], [left % 60, 'Seconds']] as const;
  return (
    <div className="flex items-start justify-center gap-2 sm:gap-5" aria-label="Countdown to the party">
      {parts.map(([v, label], i) => (
        <Fragment key={label}>
          {i > 0 && <span className="font-display text-gold/40 pt-1 text-4xl sm:text-5xl" aria-hidden>·</span>}
          <div className="w-16 sm:w-20">
            <span className="font-display relative block h-14 overflow-hidden text-5xl font-semibold text-ivory tabular-nums sm:h-16 sm:text-6xl">
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.span key={v} className="block" initial={{ y: '-100%', opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: '100%', opacity: 0 }} transition={{ duration: 0.45, ease }}>
                  {String(v).padStart(2, '0')}
                </motion.span>
              </AnimatePresence>
            </span>
            <span className="kicker text-gold-light/65 text-[0.58rem]">{label}</span>
          </div>
        </Fragment>
      ))}
    </div>
  );
}
