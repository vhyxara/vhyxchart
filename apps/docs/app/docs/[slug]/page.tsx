import React from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { DocsShell } from '../../../components/ui';
import { PAGES } from '../../../content/pages';

export function generateStaticParams(): Array<{ slug: string }> {
  return PAGES.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const page = PAGES.find((p) => p.slug === slug);
  return page ? { title: page.title, description: page.description } : {};
}

export default async function DocPage({ params }: { params: Promise<{ slug: string }> }): Promise<React.ReactElement> {
  const { slug } = await params;
  const page = PAGES.find((p) => p.slug === slug);
  if (!page) notFound();
  const Body = page.body;
  return (
    <DocsShell toc={page.toc}>
      <Body />
    </DocsShell>
  );
}
