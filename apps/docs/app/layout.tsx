import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import '../styles/atmosphere.css';
import '../styles/chart.css';
import '../styles/shell.css';
import '../styles/docs-home.css';

const geist = Geist({ subsets: ['latin'], variable: '--font-geist' });
const geistMono = Geist_Mono({ subsets: ['latin'], variable: '--font-geist-mono' });

export const metadata: Metadata = {
  title: { default: 'VhyxChart — diagrams that move', template: '%s · VhyxChart' },
  description: 'Write Markdown-friendly text. Get animated architecture, flow, sequence and algorithm diagrams that play in docs, GitHub, VS Code and React.',
};

// Applies a saved light theme before first paint, so light-mode readers don't see a dark flash.
const THEME_SCRIPT = `try{if(localStorage.getItem('theme')==='light')document.documentElement.dataset.theme='light'}catch(e){}`;

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
