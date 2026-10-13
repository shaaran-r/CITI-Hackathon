import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'KaushalSetu | Facilitator',
  description: 'Student support workspace for KaushalSetu facilitators.',
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>): React.JSX.Element {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
