import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import '../styles/landing.css';
import '../styles/brand.css';

const geist = Geist({ subsets: ['latin'], variable: '--font-geist' });
const geistMono = Geist_Mono({ subsets: ['latin'], variable: '--font-geist-mono' });

export const metadata: Metadata = {
  title: 'VhyxChart — diagrams that move',
  description:
    'Write Markdown-friendly text. Get animated architecture, flow, sequence and algorithm diagrams that play in docs, GitHub, VS Code and React.',
  metadataBase: new URL('https://vhyxchart.com'),
  alternates: { canonical: '/' },
  openGraph: { title: 'VhyxChart', description: 'Diagrams that move.', url: 'https://vhyxchart.com' },
};

// Applies a saved light theme before first paint (dark is the default).
// Also marks that scripts run, so scroll-reveal only hides content when it can reveal it again.
const THEME_SCRIPT = `document.documentElement.classList.add('js');try{if(localStorage.getItem('theme')==='light')document.documentElement.dataset.theme='light'}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="dark" className={`${geist.variable} ${geistMono.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
