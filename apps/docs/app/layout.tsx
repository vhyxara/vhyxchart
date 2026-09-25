import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: { default: 'VhyxChart — diagrams that move', template: '%s · VhyxChart' },
  description: 'Write Markdown-friendly, Mermaid-compatible text. Get animated architecture, flow, sequence and algorithm diagrams that play in docs, GitHub, VS Code and React.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
