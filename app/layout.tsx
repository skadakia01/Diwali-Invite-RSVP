import type { Metadata, Viewport } from 'next';
import { Cormorant_Garamond, Manrope, Tiro_Devanagari_Hindi } from 'next/font/google';
import { DATE_STR, FULL_TITLE, SITE_URL, TIME_STR } from '@/lib/party';
import './globals.css';

const cormorant = Cormorant_Garamond({ subsets: ['latin'], weight: ['500', '600', '700'], style: ['normal', 'italic'], variable: '--font-cormorant' });
const manrope = Manrope({ subsets: ['latin'], variable: '--font-manrope' });
const tiro = Tiro_Devanagari_Hindi({ subsets: ['devanagari', 'latin'], weight: '400', variable: '--font-tiro' });

const description = `You're warmly invited to celebrate the festival of lights. ${DATE_STR}, ${TIME_STR}.`;

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: FULL_TITLE,
  description,
  openGraph: { title: `You're invited · ${FULL_TITLE}`, description, type: 'website' },
  robots: { index: false, follow: false }, // party invite, keep it out of search engines
};

export const viewport: Viewport = { themeColor: '#2a0510' };

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="en" className={`${cormorant.variable} ${manrope.variable} ${tiro.variable}`}>
      {/* Browser extensions (e.g. ColorZilla) add attributes to <body>; ignore those mismatches. */}
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
