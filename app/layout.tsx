import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import { ThemeProvider } from "next-themes";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { PWARegister } from "@/components/pwa/PWARegister";
import { InstallPrompt } from "@/components/pwa/InstallPrompt";

const defaultUrl = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(defaultUrl),
  title: "Energy Rite - Fleet Management Dashboard",
  description: "Comprehensive fleet management and fuel monitoring system",
  applicationName: "Energy Rite",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Energy Rite",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: "/energyease_logo_green_orange_1m.png",
    apple: "/energyease_logo_green_orange_1m.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#1e3a5f",
};

const geistSans = Geist({
  variable: "--font-geist-sans",
  display: "swap",
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.className} antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem={false}
          disableTransitionOnChange
        >
          <PWARegister />
          <InstallPrompt />
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
