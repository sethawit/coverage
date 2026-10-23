import type { Metadata } from 'next';
import { Noto_Sans_Thai } from 'next/font/google';
import type { ReactNode } from 'react';
import './globals.css';

const font = Noto_Sans_Thai({ subsets: ['thai', 'latin'], weight: ['400', '500', '700'] });

export const metadata: Metadata = {
  title: 'Coverage',
  description: 'เข้าใจประกันชีวิตและประกันออมทรัพย์ก่อนซื้อ: ได้อะไร เมื่อไร และถ้าหยุดจ่ายจะเป็นอย่างไร',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="th">
      <body className={font.className}>
        <header className="site-header">
          <a href="/" className="brand">Coverage</a>
          <nav className="site-nav">
            <a href="/">ค้นหาประกัน</a>
            <a href="/tax">วางแผนภาษี</a>
          </nav>
        </header>
        <main className="container">{children}</main>
      </body>
    </html>
  );
}
