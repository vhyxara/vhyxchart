import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'VhyxChart Playground — diagrams that move',
  description: 'Write Mermaid-compatible text, watch it animate. Export animated SVG for GitHub, HTML, or Markdown.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
