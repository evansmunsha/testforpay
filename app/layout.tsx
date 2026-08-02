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
  metadataBase: new URL('https://www.testforpay.com'),
  title: {
    default: "TestForPay — Hire Real Testers for Google Play Closed Testing",
    template: "%s | TestForPay",
  },
  description: "Meet Google Play's 12-tester requirement in 24 hours. Hire real Android testers who stay opted in for 14 days. From €28. No guesswork — just approval.",
  keywords: [
    "hire android testers",
    "google play closed testing service",
    "google play 12 testers",
    "closed testing requirement",
    "google play testing service",
    "hire testers google play",
    "closed testing 14 days",
    "google play tester requirement",
    "android closed testing help",
    "publish android app google play",
  ],
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
    title: "TestForPay — Hire Real Testers for Google Play Closed Testing",
    description: "Meet Google Play's 12-tester requirement in 24 hours. Real Android testers, 14-day testing period. From €28.",
    siteName: "TestForPay",
    images: ["/images/og-image.svg"],
  },
  twitter: {
    card: "summary_large_image",
    title: "TestForPay — Hire Real Testers for Google Play Closed Testing",
    description: "Meet Google Play's 12-tester requirement in 24 hours. Real Android testers, 14-day testing period. From €28.",
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
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      // Organization schema — tells Google who you are
      {
        '@type': 'Organization',
        '@id': 'https://www.testforpay.com/#organization',
        name: 'TestForPay',
        url: 'https://www.testforpay.com',
        logo: 'https://www.testforpay.com/images/logo.svg',
        contactPoint: {
          '@type': 'ContactPoint',
          email: 'testforpays@gmail.com',
          contactType: 'customer support',
        },
      },
      // WebSite schema — enables Google sitelinks search box
      {
        '@type': 'WebSite',
        '@id': 'https://www.testforpay.com/#website',
        url: 'https://www.testforpay.com',
        name: 'TestForPay',
        description: 'Connect app developers with paid Google Play beta testers.',
        publisher: { '@id': 'https://www.testforpay.com/#organization' },
      },
      // FAQPage schema — unlocks FAQ rich results in Google search
      {
        '@type': 'FAQPage',
        mainEntity: [
          {
            '@type': 'Question',
            name: 'How does TestForPay ensure testers are real?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'All testers must verify their email and Google Play account. We track opt-in status and activity throughout the 14-day period to ensure genuine participation.',
            },
          },
          {
            '@type': 'Question',
            name: 'Is TestForPay compliant with Google Play policies?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Yes. TestForPay connects developers with real users who genuinely opt-in to test apps. This fully complies with Google Play closed testing requirements.',
            },
          },
          {
            '@type': 'Question',
            name: 'When do developers pay for testing jobs?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Payment is held in escrow and only released when testers complete the full 14-day testing period. Developers only pay for verified, completed tests.',
            },
          },
          {
            '@type': 'Question',
            name: 'How long until I get 20 testers on Google Play?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Most testing jobs are fully filled within 24 hours. Our large pool of active testers ensures fast matching.',
            },
          },
          {
            '@type': 'Question',
            name: 'How do testers get paid on TestForPay?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Testers set up a Stripe payout account in Settings and receive payment automatically after completing the 14-day testing period.',
            },
          },
          {
            '@type': 'Question',
            name: 'Can testers write reviews for apps they test?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Testers provide feedback directly through the TestForPay platform. We do not incentivize public reviews to maintain Google Play policy compliance.',
            },
          },
        ],
      },
    ],
  }

  return (
    <html lang="en">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
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
