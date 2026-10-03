import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Price Display Management Dashboard',
  description: 'Smart Price Display Management Dashboard for ESP32-C6 and LilyGO T-Display-S3',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
