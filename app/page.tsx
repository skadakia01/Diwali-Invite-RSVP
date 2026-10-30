import { Suspense } from 'react';
import { connection } from 'next/server';
import { Invite } from '@/components/invite';
import { Splash } from '@/components/splash';
import { getLive } from '@/lib/server';

export default function Home() {
  return (
    <Suspense fallback={<Splash />}>
      <Page />
    </Suspense>
  );
}

async function Page() {
  await connection();
  const { state } = await getLive();
  return <Invite initial={state} />;
}
