import type { Metadata } from 'next';
import './globals.css';
import { AppLayout } from '@/components/layout/app-layout';
import { Toaster } from '@/components/ui/toaster';
import { ErrorBoundary } from '@/components/error-boundary';
import { QueryProvider } from '@/lib/query-client';
import { AuthProvider } from '@/contexts/auth-context';

export const metadata: Metadata = {
  title: 'Pickleball Stats Tracker',
  description: 'Track scores and stats for your pickleball club',
  manifest: '/manifest.json',
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon.ico',
    apple: '/icons/apple-touch-icon.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'PBStats',
  },
  other: {
    'mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-status-bar-style': 'default',
    'apple-mobile-web-app-title': 'PBStats',
    'msapplication-TileColor': '#4287f5',
    'msapplication-tap-highlight': 'no',
    'theme-color': '#4287f5',
    'format-detection': 'telephone=no',
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=PT+Sans:wght@400;700&display=swap"
          rel="stylesheet"
        />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png?v=2025" />
        <link rel="apple-touch-icon" sizes="152x152" href="/icons/apple-touch-icon.png?v=2025" />
        <link rel="icon" type="image/png" sizes="96x96" href="/icons/favicon-96x96.png?v=2025" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png?v=2025" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png?v=2025" />
        <link rel="shortcut icon" href="/favicon.ico?v=2025" />
        <meta name="msapplication-TileImage" content="/icons/icon-192x192.png" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator && !window.location.hostname.includes('localhost')) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').then(function(registration) {
                    console.log('SW registered: ', registration);
                    
                    // Enable aggressive update checking only in production
                    setInterval(function() {
                      try {
                        registration.update();
                      } catch (error) {
                        console.warn('SW update check failed:', error);
                      }
                    }, 60000); // Check every minute
                    
                    // Check for updates when the page becomes visible
                    document.addEventListener('visibilitychange', function() {
                      if (!document.hidden) {
                        setTimeout(function() {
                          try {
                            registration.update();
                          } catch (error) {
                            console.warn('SW update check failed:', error);
                          }
                        }, 1000);
                      }
                    });
                    
                    // Check for updates on focus
                    window.addEventListener('focus', function() {
                      try {
                        registration.update();
                      } catch (error) {
                        console.warn('SW update check failed:', error);
                      }
                    });
                    
                  }, function(registrationError) {
                    console.log('SW registration failed: ', registrationError);
                  });
                });
              }
            `,
          }}
        />
      </head>
      <body className="font-body antialiased">
        <AuthProvider>
          <QueryProvider>
            <ErrorBoundary>
              <AppLayout>{children}</AppLayout>
            </ErrorBoundary>
            <Toaster />
          </QueryProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
