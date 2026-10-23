import type { Metadata } from 'next';
import { IBM_Plex_Sans_Thai } from 'next/font/google';
import { ShieldCheck } from '@phosphor-icons/react/dist/ssr';
import type { ReactNode } from 'react';
import { SiteNav } from './site-nav.tsx';
import './globals.css';

const font = IBM_Plex_Sans_Thai({ subsets: ['thai', 'latin'], weight: ['400', '500', '600', '700'] });

export const metadata: Metadata = {
  title: 'Coverage',
  description: 'เข้าใจประกันชีวิตและประกันออมทรัพย์ก่อนซื้อ: ได้อะไร เมื่อไร และถ้าหยุดจ่ายจะเป็นอย่างไร',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="th">
      <body className={font.className}>
        <header className="site-header">
          <div className="site-header-inner">
            <a href="/" className="brand">
              <ShieldCheck size={22} weight="duotone" aria-hidden />
              Coverage
            </a>
            <SiteNav />
          </div>
        </header>
        <main className="container">{children}</main>
        <footer className="site-footer">
          <p>
            Coverage อธิบายประกันจากเอกสารสาธารณะของบริษัทประกัน ไม่ขายประกัน ไม่รับค่านายหน้า
            และไม่บอกว่าแบบไหนเหมาะกับคุณ
          </p>
        </footer>
      </body>
    </html>
  );
}
