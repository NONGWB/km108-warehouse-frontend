import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'KM 108 Shop',
  description: 'ระบบค้นหาและจัดการสินค้า KM 108 Shop',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="th">
      <body>
        {children}
      </body>
    </html>
  );
}
