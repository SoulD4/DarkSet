import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'DarkSet',
  description: 'Treine. Evolua. Domine.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com"/>
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous"/>
        <link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;600;700;800;900&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet"/>
      </head>
      <body style={{fontFamily:"Inter,sans-serif",background:'#0f0f13',color:'#f0f0f2',margin:0}}>
        {children}
      </body>
    </html>
  );
}
