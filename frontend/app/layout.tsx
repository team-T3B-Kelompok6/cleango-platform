import type { Metadata } from 'next';
import { DM_Sans, Plus_Jakarta_Sans } from 'next/font/google';
import './tokens.css';
import './globals.css';
import './admin.css';
import './overrides.css';
import './design.css';
import 'leaflet/dist/leaflet.css';
import './tracking.css';
const body = DM_Sans({
  subsets: ['latin'],
  variable: '--font-body',
  display: 'swap',
});
const heading = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-heading',
  display: 'swap',
});
export const metadata: Metadata = {
  title: { default: 'Cleango Admin', template: '%s | Cleango' },
  description: 'Dashboard operasional layanan kebersihan Cleango.',
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" className={body.variable + ' ' + heading.variable}>
      <body>{children}</body>
    </html>
  );
}
