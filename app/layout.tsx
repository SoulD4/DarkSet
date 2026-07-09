import type { Metadata, Viewport } from 'next';
import { Space_Grotesk, Barlow_Condensed } from 'next/font/google';
import { GeistSans } from 'geist/font/sans';
import './globals.css';

/**
 * Tipografia DarkSet 2026:
 * - Space Grotesk → display: títulos, números grandes, stats
 * - Geist → corpo de texto e UI
 * - Barlow Condensed 900 → EXCLUSIVAMENTE o logotipo (identidade preservada)
 */
const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-display',
  display: 'swap',
});

const barlowLogo = Barlow_Condensed({
  subsets: ['latin'],
  weight: ['800', '900'],
  variable: '--font-logo',
  display: 'swap',
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#0C0E11',
};

export const metadata: Metadata = {
  title: {
    default: 'DarkSet — Seu Treino',
    template: '%s | DarkSet',
  },
  description: 'Treine. Evolua. Domine. Acompanhe seus treinos, evolução e ranking global.',
  applicationName: 'DarkSet',
  keywords: ['treino', 'academia', 'fitness', 'musculação', 'personal trainer', 'evolução'],
  authors: [{ name: 'DarkSet' }],
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'DarkSet',
  },
  openGraph: {
    type: 'website',
    locale: 'pt_BR',
    title: 'DarkSet — Seu Treino',
    description: 'Treine. Evolua. Domine. O app de treinos mais completo.',
    siteName: 'DarkSet',
  },
  twitter: {
    card: 'summary',
    title: 'DarkSet — Seu Treino',
    description: 'Treine. Evolua. Domine.',
  },
  icons: {
    icon: '/icons/icon-192.png',
    apple: '/icons/icon-192-maskable.png',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="pt-BR"
      className={`${GeistSans.variable} ${spaceGrotesk.variable} ${barlowLogo.variable}`}
      style={{ ['--font-body' as string]: 'var(--font-geist-sans)' }}
    >
      <body>{children}</body>
    </html>
  );
}
