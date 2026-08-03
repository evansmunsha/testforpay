import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'How to Add Testers to Google Play Console (Step-by-Step) | TestForPay',
  description: 'Learn how to add testers to your Google Play Console closed test in 3 minutes. Step-by-step guide for app developers — no technical knowledge needed.',
  keywords: [
    'add testers google play console',
    'google play console closed testing setup',
    'google play tester email list',
    'google play opt-in link',
    'closed testing setup guide',
    'google play console tutorial',
  ],
  openGraph: {
    title: 'How to Add Testers to Google Play Console (Step-by-Step)',
    description: 'Add testers to your Google Play closed test in 3 minutes. Step-by-step guide with screenshots.',
  },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
