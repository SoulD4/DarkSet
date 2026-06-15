import type { Metadata, Viewport } from 'next';
import { Barlow_Condensed, Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-inter',
  display: 'swap',
});

const barlowCondensed = Barlow_Condensed({
  subsets: ['latin'],
  weight: ['400', '600', '700', '800', '900'],
  variable: '--font-barlow',
  display: 'swap',
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#0f0f13',
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
    <html lang="pt-BR" className={`${inter.variable} ${barlowCondensed.variable}`}>
      <body style={{ fontFamily: 'var(--font-inter, Inter, sans-serif)', background: '#0f0f13', color: '#f0f0f2', margin: 0 }}>
        {children}
      </body>
    </html>
  );
}
