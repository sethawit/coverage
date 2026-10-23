'use client';

import { Calculator, MagnifyingGlass } from '@phosphor-icons/react';
import { usePathname } from 'next/navigation';

const LINKS = [
  { href: '/', label: 'ค้นหาประกัน', icon: MagnifyingGlass, match: (p: string) => p === '/' || p.startsWith('/products') || p.startsWith('/compare') },
  { href: '/tax', label: 'วางแผนภาษี', icon: Calculator, match: (p: string) => p.startsWith('/tax') },
];

export function SiteNav() {
  const pathname = usePathname();
  return (
    <nav className="site-nav">
      {LINKS.map(({ href, label, icon: Icon, match }) => (
        <a key={href} href={href} aria-current={match(pathname) ? 'page' : undefined}>
          <Icon size={18} aria-hidden />
          {label}
        </a>
      ))}
    </nav>
  );
}
