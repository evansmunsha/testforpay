import Image from 'next/image'
import Link from 'next/link'
import { CheckCircle, ArrowRight, Clock, Globe, DollarSign, Smartphone } from 'lucide-react'
import { Testimonials } from '@/components/feedback/testimonials'

export const metadata = {
  title: 'Get Paid to Test Apps — Earn €2.75 Per Test | TestForPay',
  description:
    'Earn money testing Android apps from your phone. No experience needed. Install apps, check in daily for 14 days, get paid via PayPal or bank transfer. Join free.',
}

export default function TestersPage() {
  return (
    <div className="min-h-screen bg-white">
      <nav className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="inline-flex items-center">
              <Image src="/images/logo.svg" alt="TestForPay" width={180} height={40} className="h-10 w-auto" />
            </Link>
            <div className="hidden md:flex items-center space-x-6">
              <Link href="/" className="text-gray-700 hover:text-emerald-600">For Developers</Link>
              <Link href="/hire-testers" className="text-gray-700 hover:text-emerald-600">Hire Testers</Link>
              <a href="/signup?role=TESTER" className="bg-emerald-600 text-white px-5 py-2 rounded-lg hover:bg-emerald-700 font-semibold">
                Get Started
              </a>
            </div>
          </div>
        </div>
      </nav>

      <section className="bg-gradient-to-br from-emerald-600 to-emerald-700 text-white px-4 pt-16 pb-20">
        <div className="max-w-4xl mx-auto text-center">
          <span className="inline-block bg-white/20 text-emerald-100 px-4 py-1 rounded-full text-sm font-semibold mb-4 border border-white/30">
            Passive Side Income
          </span>
          <h1 className="text-4xl md:text-5xl font-extrabold mb-4 leading-tight">
            Get Paid to Test Android Apps<br />
            <span className="text-emerald-200">from Your Phone</span>
          </h1>
          <p className="text-lg text-emerald-100 mb-8 max-w-2xl mx-auto">
            Earn €2.30–€2.75 per test. No experience needed. Just install apps, use them naturally for 14 days, and get paid via PayPal or bank transfer.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <a href="/signup?role=TESTER" className="bg-white text-emerald-700 px-8 py-3 rounded-lg font-bold text-lg hover:bg-emerald-50 transition">
              Create Free Account
            </a>
            <span className="text-emerald-200 text-sm flex items-center">✓ No credit card required</span>
          </div>
        </div>
      </section>

      <section className="py-12 px-4 bg-gray-50">
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { icon: <DollarSign className="h-6 w-6" />, label: '€2.30–€2.75', sub: 'Per completed test' },
            { icon: <Smartphone className="h-6 w-6" />, label: 'Android Only', sub: 'Real device needed' },
            { icon: <Clock className="h-6 w-6" />, label: '14 Days', sub: 'Light daily use' },
            { icon: <Globe className="h-6 w-6" />, label: '40+ Countries', sub: 'Open worldwide' },
          ].map((s, i) => (
            <div key={i} className="bg-white border border-gray-200 rounded-xl p-5 text-center">
              <div className="text-emerald-600 flex justify-center mb-2">{s.icon}</div>
              <div className="font-bold text-gray-900">{s.label}</div>
              <div className="text-xs text-gray-500 mt-1">{s.sub}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="py-12 px-4">
        <div className="max-w-3xl mx-auto bg-amber-50 border border-amber-200 rounded-xl p-8">
          <h2 className="text-xl font-bold text-amber-900 mb-3">💡 How Much Can I Realistically Earn?</h2>
          <p className="text-amber-900 mb-6 leading-relaxed">
            Let's be honest — this is <strong>passive side income</strong>, not a job replacement. Each test pays €2.30–€2.75 for 14 days of light daily app use (about 2–3 minutes per day).
          </p>
          <div className="grid grid-cols-3 gap-3 mb-4">
            {[
              { tests: '1 test/mo', pay: '~€2.50/month' },
              { tests: '3 tests/mo', pay: '~€7.50/month' },
              { tests: '5 tests/mo', pay: '~€12.50/month' },
            ].map((e) => (
              <div key={e.tests} className="bg-white rounded-lg p-4 text-center">
                <div className="font-extrabold text-emerald-700 text-lg">{e.tests}</div>
                <div className="text-xs text-gray-500 mt-1">{e.pay}</div>
              </div>
            ))}
          </div>
          <p className="text-sm text-amber-800">
            The value? It takes 5 minutes to set up, then you earn passively while using apps you'd use anyway.
          </p>
        </div>
      </section>

      <section className="py-16 px-4 bg-gray-50" id="how-it-works">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">How It Works</h2>
          <div className="grid md:grid-cols-4 gap-6">
            {[
              { n: '1', title: 'Browse Testing Jobs', desc: 'Find apps that match your interests and device' },
              { n: '2', title: 'Apply & Opt-In', desc: 'Join the closed test on Google Play and verify your opt-in' },
              { n: '3', title: 'Test for 14 Days', desc: 'Use the app naturally and provide honest feedback' },
              { n: '4', title: 'Get Paid', desc: 'Receive €2.50–€3.00 per completed test via PayPal or bank transfer' },
            ].map((step, i) => (
              <div key={step.n} className="text-center">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg mx-auto mb-3 ${i === 3 ? 'bg-emerald-500' : 'bg-emerald-600'}`}>
                  {step.n}
                </div>
                <div className="font-semibold text-gray-900">{step.title}</div>
                <div className="text-sm text-gray-500 mt-1">{step.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/*<section className="py-12 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-xl font-bold mb-4">Trusted by 500+ Testers Worldwide</h2>
          <div className="flex justify-center gap-6 mb-6 text-gray-700 font-medium">
            <span className="flex items-center gap-2">🏦 Bank Transfer</span>
          </div>
          <div className="bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg p-8 text-gray-400 text-sm">
            [Upload real PayPal/bank screenshot here — replace with Image component]
          </div>
        </div>
      </section>*/}

      <section className="py-16 px-4 bg-gray-50">
        <div className="max-w-5xl mx-auto">
          <Testimonials
            limit={6}
            title="What Testers Say"
            intro="Real feedback from testers earning extra income with TestForPay"
          />
        </div>
      </section>

      <section className="py-16 px-4" id="faq">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-4">Common Questions</h2>
          <p className="text-center text-gray-600 mb-8">
            Can't find your question?{' '}
            <a href="mailto:testforpays@gmail.com" className="text-emerald-600 hover:underline font-medium">
              Email us
            </a>{' '}
            and a real person will reply fast.
          </p>
          <div className="space-y-3">
            {[
              { q: 'Is TestForPay legit?', a: "Yes. We're a real marketplace connecting app developers with real Android users. Testers get paid after completing the full 14-day test period." },
              { q: 'How do I get paid?', a: 'Payments are sent via PayPal or bank transfer within 48 hours of completing a test. You see the payment amount before accepting any job.' },
              { q: 'How often are jobs available?', a: 'New testing jobs are posted daily. The number available depends on developer demand, but active testers typically see 2–5 new apps per week.' },
              { q: 'Is this allowed by Google Play?', a: 'Yes. Google Play requires real testers like you to join app closed tests and stay opted in for 14 days. We connect you with real developers who genuinely need you to install their app and remain in the test. No bots, no fake accounts — just real people helping real apps get ready for launch.' },
              { q: 'Do I need experience?', a: 'No experience needed. If you have an Android phone and can use apps naturally, you qualify. We provide clear instructions for every test.' },
              { q: 'What if I don\'t like the app?', a: 'You can see the app details before accepting. Once you opt in, you\'re expected to complete the 14 days. Choose jobs that match your interests.' },
            ].map((faq, i) => (
              <details key={i} className="bg-white border border-gray-200 rounded-lg p-5 group">
                <summary className="font-semibold cursor-pointer list-none flex justify-between items-center text-gray-900">
                  {faq.q}
                  <ArrowRight className="h-4 w-4 text-gray-400 group-open:rotate-90 transition" />
                </summary>
                <p className="mt-3 text-sm text-gray-600 leading-relaxed">{faq.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-gradient-to-br from-emerald-600 to-emerald-700 text-white px-4 py-16 text-center">
        <div className="max-w-xl mx-auto">
          <h2 className="text-3xl font-bold mb-3">Ready to Start Earning?</h2>
          <p className="text-emerald-100 mb-6">Join 500+ testers earning extra income from their phones. Free to sign up.</p>
          <a href="/signup?role=TESTER" className="inline-block bg-white text-emerald-700 px-10 py-4 rounded-lg font-bold text-lg hover:bg-emerald-50 transition">
            Create Free Tester Account
          </a>
        </div>
      </section>

      <footer className="bg-gray-900 text-gray-300 py-10 px-4">
        <div className="max-w-5xl mx-auto text-center">
          <p className="text-sm">© 2026 TestForPay. All rights reserved.</p>
          <p className="mt-1 text-gray-500 text-sm">Made with ❤️ in Zambia by Evans Munsha</p>
          <div className="mt-4 flex justify-center gap-6 text-sm">
            <Link href="/" className="hover:text-white">For Developers</Link>
            <Link href="/privacy" className="hover:text-white">Privacy</Link>
            <Link href="/terms" className="hover:text-white">Terms</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
