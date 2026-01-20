import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { PWAInstallButton } from "@/components/shared/pwa-install-button";
import { ToastProvider } from "@/components/ui/toast-provider";
import { ServiceWorkerRegistration } from "@/components/pwa/service-worker-registration";
import { Analytics } from "@vercel/analytics/react";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: {
    default: "TestForPay - Get Paid to Test Apps on Google Play",
    template: "%s | TestForPay",
  },
  description: "Connect with app developers who need verified Google Play testers. Earn money by testing apps and helping developers reach 20+ closed testers.",
  keywords: ["app testing", "Google Play testers", "beta testing", "closed testing", "earn money testing apps", "app developers", "mobile testing"],
  authors: [{ name: "Evans Munsha" }],
  creator: "Evans Munsha",
  manifest: "/manifest.json",
  icons: {
    icon: "/icons/icon.svg",
    apple: "/icons/icon.svg",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://testforpay.com",
    title: "TestForPay - Get Paid to Test Apps on Google Play",
    description: "Connect with app developers who need verified Google Play testers. Earn money by testing apps.",
    siteName: "TestForPay",
    images: ["/images/og-image.svg"],
  },
  twitter: {
    card: "summary_large_image",
    title: "TestForPay - Get Paid to Test Apps",
    description: "Connect with app developers who need verified Google Play testers. Earn money by testing apps.",
    images: ["/images/og-image.svg"],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} font-sans antialiased`}>
        <ToastProvider>
          {children}
          <PWAInstallButton />
          <Analytics/>
          <ServiceWorkerRegistration />
        </ToastProvider>
      </body>
    </html>
  );
}
