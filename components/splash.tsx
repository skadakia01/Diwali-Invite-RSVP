import { Diya, Mandala, Toran } from './decor';

// Shown for the split second while the guest list and photos load.
export function Splash() {
  return (
    <main className="bg-night relative grid min-h-svh place-items-center overflow-hidden px-6 text-center text-ivory">
      <Toran className="absolute inset-x-0 top-0 h-24 w-full sm:h-32" />
      <Mandala className="text-gold/10 animate-spin-slow absolute top-1/2 left-1/2 size-[140vmin] -translate-x-1/2 -translate-y-1/2" />
      <div className="relative">
        <Diya className="mx-auto size-28" />
        <p className="font-deva text-gold-light mt-4 text-2xl">शुभ दीपावली</p>
        <p className="kicker text-gold-light/70 mt-6">Lighting the diyas…</p>
      </div>
    </main>
  );
}
