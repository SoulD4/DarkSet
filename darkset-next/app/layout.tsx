import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'DarkSet — Seu Treino, Sua Evolução',
  description: 'Monte fichas de treino, registre séries e acompanhe sua evolução.',
  manifest: '/manifest.json',
  appleWebApp: { capable: true, statusBarStyle: 'black-translucent', title: 'DarkSet' },
};
export const viewport: Viewport = {
  width: 'device-width', initialScale: 1,
  viewportFit: 'cover', themeColor: '#080808',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-br">
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
      </head>
      <body>{children}</body>
    </html>
  );
}
