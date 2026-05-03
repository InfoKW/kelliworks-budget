import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'KelliWorks Client Portal',
  description: 'Secure financial dashboard powered by KelliWorks',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  )
}
