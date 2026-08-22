import type { Metadata, Viewport } from "next"
import { Inter, Fraunces } from "next/font/google"
import { Toaster } from "@/components/ui/sonner"
import "./globals.css"

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" })
const fraunces = Fraunces({ subsets: ["latin"], variable: "--font-fraunces" })

export const metadata: Metadata = {
  title: "Mercados Nixta — Punto de venta",
  description: "Punto de venta simple y rápido para mercados, ferias y food trucks.",
}

export const viewport: Viewport = {
  themeColor: "#b4462e",
  colorScheme: "light",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es" className={`bg-background ${inter.variable} ${fraunces.variable}`}>
      <body className="font-sans antialiased">
        {children}
        <Toaster position="top-center" richColors />
      </body>
    </html>
  )
}
