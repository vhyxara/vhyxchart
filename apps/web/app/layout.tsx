import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'VhyxChart — diagrams that move',
  description:
    'Write architecture, flows, sequences and algorithms as text. Add a scenario and the diagram animates — in docs, GitHub READMEs, VS Code and React.',
  openGraph: { title: 'VhyxChart', description: 'Diagrams that move.' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
