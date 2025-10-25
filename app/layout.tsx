import '@livekit/components-styles';
import '@livekit/components-styles/prefabs';
import '../styles/globals.css';
import type { Metadata, Viewport } from 'next';
import { Toaster } from 'react-hot-toast';

export const metadata: Metadata = {
  title: {
    default: 'Созвон | Видеовстречи',
    template: '%s | Созвон',
  },
  description: 'Созвон — простое приложение для групповых видеозвонков.',
  twitter: {
    card: 'summary_large_image',
  },
  openGraph: {
    siteName: 'Созвон',
  },
  icons: {
    icon: {
      rel: 'icon',
      url: '/favicon.ico',
    },
    apple: [
      {
        rel: 'apple-touch-icon',
        url: '/images/sozvon-apple-touch.png',
        sizes: '180x180',
      },
      { rel: 'mask-icon', url: '/images/sozvon-safari-pinned-tab.svg', color: '#070707' },
    ],
  },
};

export const viewport: Viewport = {
  themeColor: '#070707',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body data-lk-theme="default">
        <Toaster />
        {children}
      </body>
    </html>
  );
}
