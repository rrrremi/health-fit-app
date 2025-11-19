import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import PsychedelicBackground from '@/components/layout/PsychedelicBackground'
import { ReactQueryProvider } from '@/components/providers/ReactQueryProvider'
import { AuthProvider } from '@/components/auth/AuthProvider'
import { Toaster } from 'sonner'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0f172a' },
  ],
}

export const metadata: Metadata = {
  title: 'FitGen - AI-Powered Workout Generator',
  description: 'Generate personalized workouts with AI. Track your fitness journey and achieve your goals with smart, adaptive training plans.',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'FitGen',
  },
  formatDetection: {
    telephone: false,
  },
  manifest: '/manifest.json',
  icons: {
    icon: '/favicon.svg',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5, user-scalable=yes" />
        <meta name="theme-color" content="#0f172a" />
        <meta name="color-scheme" content="dark light" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
        <link rel="manifest" href="/site.webmanifest" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body suppressHydrationWarning className="min-h-screen text-slate-100 font-sans antialiased overflow-x-hidden" style={{ background: '#5a7f65' }}>
        <ReactQueryProvider>
          <AuthProvider>
            <div className="relative min-h-screen">
              <PsychedelicBackground />

              <div className="relative z-10">
                <Header />
                <main className="flex-1">
                  {children}
                </main>
                <Footer />
              </div>
            </div>
            <Toaster position="top-right" richColors closeButton />
          </AuthProvider>
        </ReactQueryProvider>
      </body>
    </html>
  )
}
