"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckCircle,
  ChevronRight,
  Clock,
  DollarSign,
  Lightbulb,
  Smartphone,
  Star,
  ThumbsUp,
  TriangleAlert,
  UserPlus,
  XCircle,
  Zap,
} from "lucide-react";

const STEPS = [
  {
    number: "01",
    title: "Sign Up",
    time: "2 minutes",
    icon: UserPlus,
    color: "bg-blue-600",
    items: [
      "Create a free account at testforpay.com",
      'Select "Tester" as your role — not Developer',
      "Add your device info: Android version and phone model",
      "Verify your email address",
    ],
    note: "Your phone model matters. Developers specifically want to know which Android versions their app works on. Older phones are often more valuable.",
  },
  {
    number: "02",
    title: "Browse & Apply",
    time: "5 minutes",
    icon: Smartphone,
    color: "bg-purple-600",
    items: [
      "Go to your dashboard and browse available testing jobs",
      "Each job shows: app name, payment amount, and duration (always 14 days)",
      'Click "Apply" on jobs that interest you',
      "Wait for the developer to approve your application — usually within 24 hours",
    ],
    note: "Apply to multiple jobs at once. Not every developer approves every applicant, so casting a wider net gets you working faster.",
  },
  {
    number: "03",
    title: "Install the App",
    time: "3 minutes",
    icon: Zap,
    color: "bg-green-600",
    items: [
      "Once approved, you receive a Google Play opt-in link",
      "Click the link and sign in with your Google account",
      'Click "Become a tester"',
      "Install the app from Google Play — never from an APK file",
      "Open the app once to confirm it works",
    ],
    note: "Use the exact Gmail address you registered with. A different Google account = the link won't work.",
  },
  {
    number: "04",
    title: "Complete Daily Missions",
    time: "2 minutes/day",
    icon: CheckCircle,
    color: "bg-amber-500",
    items: [
      "Every day for 14 days, check your TestForPay dashboard",
      'You\'ll see one specific mission — e.g., "Create an invoice and screenshot it"',
      "Complete the task in the app",
      "Submit your feedback through the dashboard",
      "This proves to Google that you're genuinely using the app",
    ],
    note: "Missions take about 2 minutes. Don't overthink them — honest feedback about what works and what doesn't is exactly what developers need.",
  },
  {
    number: "05",
    title: "Get Paid",
    time: "After day 14",
    icon: DollarSign,
    color: "bg-emerald-600",
    items: [
      "Once the 14-day period ends, the developer confirms completion",
      "Payment is sent to your connected Stripe account",
      "Set up your payout account in Settings → Payout Settings",
      "Stripe supports bank transfers in 40+ countries",
      "Payment usually arrives within 3–5 business days",
    ],
    note: "Set up your Stripe payout account before day 14 so there's no delay. Go to Dashboard → Settings → Payout Settings.",
  },
];

const EARNINGS = [
  { plan: "Starter", testers: 12, payment: "€2.30", duration: "14 days" },
  { plan: "Growth", testers: 15, payment: "€2.75", duration: "14 days" },
  { plan: "Pro", testers: 25, payment: "€2.75", duration: "14 days" },
];

const REQUIREMENTS_YES = [
  "Android phone (any version — older phones are often more valuable to developers)",
  "Google Play account",
  "Internet connection to download the app and submit daily missions",
  "14 days of consistency — this is the most important requirement",
];

const REQUIREMENTS_NO = [
  "No technical experience needed",
  "No coding knowledge",
  "No resume or interview",
  "No upfront payment — TestForPay is 100% free for testers",
];

const RULES = [
  "Do NOT uninstall the app before day 14",
  "Do NOT opt out of the closed test early",
  "Do NOT submit fake screenshots or copy-pasted feedback",
  "Do NOT create multiple accounts to apply to the same job",
  "Do NOT share your opt-in link with people who weren't approved",
];

const FAQS = [
  {
    q: "Do I need to pay anything?",
    a: "No. TestForPay is completely free for testers. You get paid — not the other way around. Developers pay us, we pay you.",
  },
  {
    q: "What if I miss a day?",
    a: "You can submit a missed mission the next day. But missing 3 or more days in a row may affect your final payment. Consistency is what developers are paying for.",
  },
  {
    q: "Can I test multiple apps at once?",
    a: "Yes, as long as you can complete daily missions for each one. Each app pays separately. Just make sure you have enough phone storage.",
  },
  {
    q: "What if the app crashes or doesn't work?",
    a: "Report it in your daily mission feedback. That's exactly the kind of information developers need — it's why they hire testers. You still get paid as long as you submitted your feedback.",
  },
  {
    q: "How do I get paid?",
    a: "Through Stripe — the same payment system used by Amazon and Shopify. You connect your bank account in Settings → Payout Settings. Stripe supports bank transfers in 40+ countries. Setup takes about 5 minutes.",
  },
  {
    q: "Is this available in my country?",
    a: "TestForPay works globally as long as you have a Google Play account and an Android phone. Stripe payouts are available in 40+ countries. If your country isn't supported by Stripe yet, email us and we'll find a solution.",
  },
  {
    q: "What happens after 14 days?",
    a: "You can uninstall the app. The developer reviews your feedback and confirms completion. You get paid within 3–5 business days. Then you're free to apply for new testing jobs.",
  },
  {
    q: "What if a developer never confirms payment?",
    a: "Developers pay upfront into escrow before any tester starts. If a developer disappears or doesn't confirm, we release payment automatically after the testing period ends. Your money is protected.",
  },
];

export default function TesterGuidePage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [helpful, setHelpful] = useState<"yes" | "no" | null>(null);

  return (
    <div className="min-h-screen bg-white">
      {/* Sticky Nav */}
      <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-blue-600 transition-colors">
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Back to TestForPay</span>
            <span className="sm:hidden">Back</span>
          </Link>
          <Badge variant="secondary" className="text-xs">
            <BookOpen className="h-3 w-3 mr-1" />
            Tester Guide
          </Badge>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {/* Hero */}
        <div className="mb-10 sm:mb-14">
          <Badge className="mb-4 bg-purple-100 text-purple-800 hover:bg-purple-100 text-xs sm:text-sm">
            For Testers
          </Badge>
          <h1 className="text-2xl sm:text-4xl font-bold text-gray-900 leading-tight mb-4">
            Get Paid to Test Android Apps — Complete Guide
          </h1>
          <p className="text-base sm:text-lg text-gray-600 leading-relaxed mb-6">
            Earn €2.30–€2.75 per app test. No experience needed. Works on any Android phone.
          </p>
          <a
            href="/signup?role=TESTER"
            className="inline-flex items-center gap-2 bg-gray-900 text-white px-6 py-3 rounded-lg font-semibold hover:bg-gray-800 transition text-sm sm:text-base"
          >
            Sign up as a tester
            <ArrowRight className="h-4 w-4" />
          </a>
          <div className="flex items-center gap-3 mt-6 text-sm text-gray-500">
            <span className="flex items-center gap-1"><Clock className="h-4 w-4" />6 min read</span>
            <span>•</span>
            <span>Last updated August 2026</span>
          </div>
        </div>

        {/* What is TestForPay */}
        <Card className="mb-10 sm:mb-14 border-l-4 border-l-purple-500 bg-purple-50/40">
          <CardContent className="p-5 sm:p-6">
            <div className="flex items-start gap-3">
              <Lightbulb className="h-5 w-5 text-purple-600 mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold text-gray-900 mb-3 text-sm sm:text-base">What is TestForPay?</p>
                <ul className="space-y-2 text-sm text-gray-700">
                  <li className="flex items-start gap-2"><CheckCircle className="h-4 w-4 text-purple-500 mt-0.5 shrink-0" />TestForPay connects real Android users with app developers who need testers</li>
                  <li className="flex items-start gap-2"><CheckCircle className="h-4 w-4 text-purple-500 mt-0.5 shrink-0" />Developers need 12+ testers to stay in their app for 14 days before Google lets them publish</li>
                  <li className="flex items-start gap-2"><CheckCircle className="h-4 w-4 text-purple-500 mt-0.5 shrink-0" />You get paid to install the app, use it daily, and submit honest feedback</li>
                  <li className="flex items-start gap-2"><CheckCircle className="h-4 w-4 text-purple-500 mt-0.5 shrink-0" />Your data stays on your device — we never access your personal information</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Steps */}
        <section className="mb-10 sm:mb-14">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-6">How it works</h2>
          <div className="space-y-4 sm:space-y-5">
            {STEPS.map((step, i) => (
              <Card key={i} className="border-gray-200">
                <CardContent className="p-4 sm:p-6">
                  <div className="flex items-start gap-3 sm:gap-4">
                    <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full ${step.color} text-white flex items-center justify-center shrink-0`}>
                      <step.icon className="h-4 w-4 sm:h-5 sm:w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Step {step.number}</span>
                        <Badge variant="secondary" className="text-xs font-normal">
                          <Clock className="h-2.5 w-2.5 mr-1" />{step.time}
                        </Badge>
                      </div>
                      <h3 className="font-semibold text-gray-900 mb-3 text-sm sm:text-base">{step.title}</h3>
                      <ul className="space-y-1.5 mb-3">
                        {step.items.map((item, j) => (
                          <li key={j} className="flex items-start gap-2 text-sm text-gray-600">
                            <ChevronRight className="h-3.5 w-3.5 text-gray-400 mt-0.5 shrink-0" />
                            {item}
                          </li>
                        ))}
                      </ul>
                      <div className="rounded-lg bg-gray-50 border border-gray-100 px-3 py-2 text-xs text-gray-600 flex items-start gap-2">
                        <Lightbulb className="h-3.5 w-3.5 text-amber-500 mt-0.5 shrink-0" />
                        {step.note}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Earnings Table */}
        <section className="mb-10 sm:mb-14">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2 flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-emerald-600" />How much can you earn?
          </h2>
          <p className="text-sm text-gray-600 mb-5">Payment depends on which plan the developer chose when posting their job.</p>
          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {["Plan", "Testers needed", "Your payment", "Duration"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left font-semibold text-gray-700 text-xs sm:text-sm">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {EARNINGS.map((row, i) => (
                  <tr key={i} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{row.plan}</td>
                    <td className="px-4 py-3 text-gray-600">{row.testers}</td>
                    <td className="px-4 py-3 font-semibold text-emerald-600">{row.payment}</td>
                    <td className="px-4 py-3 text-gray-600">{row.duration}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 space-y-1.5 text-sm text-gray-600">
            <p className="flex items-start gap-2"><CheckCircle className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />You can test multiple apps at once if you have enough phone storage</p>
            <p className="flex items-start gap-2"><CheckCircle className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />Payments are per completed test, not hourly</p>
            <p className="flex items-start gap-2"><CheckCircle className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />14 days = roughly 10 cents per day of actual work — but the daily time is only about 2 minutes</p>
          </div>
        </section>

        {/* Requirements */}
        <section className="mb-10 sm:mb-14">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-5">Requirements</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <Card className="border-green-200 bg-green-50/30">
              <CardContent className="p-4 sm:p-5">
                <p className="font-semibold text-gray-900 mb-3 text-sm flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />You need
                </p>
                <ul className="space-y-2">
                  {REQUIREMENTS_YES.map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                      <CheckCircle className="h-3.5 w-3.5 text-green-500 mt-0.5 shrink-0" />{item}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
            <Card className="border-gray-200 bg-gray-50/30">
              <CardContent className="p-4 sm:p-5">
                <p className="font-semibold text-gray-900 mb-3 text-sm flex items-center gap-2">
                  <XCircle className="h-4 w-4 text-gray-400" />You don&apos;t need
                </p>
                <ul className="space-y-2">
                  {REQUIREMENTS_NO.map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                      <XCircle className="h-3.5 w-3.5 text-gray-400 mt-0.5 shrink-0" />{item}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Rules */}
        <section className="mb-10 sm:mb-14">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2 flex items-center gap-2">
            <TriangleAlert className="h-5 w-5 text-red-500" />Rules
          </h2>
          <p className="text-sm text-gray-600 mb-4">Breaking these rules means no payment and a permanent ban from TestForPay.</p>
          <Card className="border-red-100 bg-red-50/20">
            <CardContent className="p-4 sm:p-5">
              <ul className="space-y-2">
                {RULES.map((rule, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-800 font-medium">
                    <XCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />{rule}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </section>

        {/* FAQ */}
        <section className="mb-10 sm:mb-14">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-5">Common questions</h2>
          <div className="space-y-2">
            {FAQS.map((faq, i) => (
              <div key={i} className="rounded-lg border border-gray-200 overflow-hidden">
                <button
                  className="w-full flex items-center justify-between px-4 sm:px-5 py-4 text-left hover:bg-gray-50 transition-colors"
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                >
                  <span className="font-medium text-gray-900 text-sm pr-4">{faq.q}</span>
                  <ChevronRight className={`h-4 w-4 text-gray-400 shrink-0 transition-transform ${openFaq === i ? "rotate-90" : ""}`} />
                </button>
                {openFaq === i && (
                  <div className="px-4 sm:px-5 pb-4 border-t border-gray-100 bg-gray-50">
                    <p className="text-sm text-gray-600 leading-relaxed pt-3">{faq.a}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Trust Signals */}
        <section className="mb-10 sm:mb-14">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-5 flex items-center gap-2">
            <Star className="h-5 w-5 text-amber-500" />Why trust TestForPay?
          </h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {[
              { icon: "🇿🇲", text: "Built by Evans Munsha, a solo developer from Zambia — someone who understands earning in global currencies" },
              { icon: "🌍", text: "Testers from 10+ countries have already earned through TestForPay" },
              { icon: "🔒", text: "Payments held in escrow — developers pay upfront before any tester starts, so you're always protected" },
              { icon: "📱", text: "Your data stays on your device — we never collect personal information beyond what's needed to process payment" },
            ].map((item, i) => (
              <Card key={i} className="border-gray-100 bg-gray-50">
                <CardContent className="p-4 sm:p-5 flex items-start gap-3">
                  <span className="text-xl shrink-0">{item.icon}</span>
                  <p className="text-sm text-gray-700 leading-relaxed">{item.text}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Was this helpful */}
        <div className="mb-10 sm:mb-14 rounded-xl border border-gray-200 p-5 sm:p-6">
          <p className="font-medium text-gray-900 text-sm sm:text-base mb-3 text-center">Was this guide helpful?</p>
          {helpful === null ? (
            <div className="flex justify-center gap-3">
              <button onClick={() => setHelpful("yes")} className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-green-50 hover:border-green-300 hover:text-green-700 transition-colors">
                <ThumbsUp className="h-4 w-4" />Yes, clear
              </button>
              <button onClick={() => setHelpful("no")} className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-red-50 hover:border-red-300 hover:text-red-700 transition-colors">
                Still confused
              </button>
            </div>
          ) : helpful === "yes" ? (
            <p className="text-center text-sm text-green-700 font-medium">Great! Sign up and start earning 🎉</p>
          ) : (
            <p className="text-center text-sm text-gray-600">Email <a href="mailto:testforpays@gmail.com" className="text-blue-600 hover:underline font-medium">testforpays@gmail.com</a> and Evans will personally help you get started.</p>
          )}
        </div>

        {/* CTA */}
        <div className="bg-gray-900 rounded-2xl p-6 sm:p-10 text-center mb-10 sm:mb-14">
          <h2 className="text-xl sm:text-2xl font-bold text-white mb-3">Ready to start earning?</h2>
          <p className="text-sm sm:text-base text-gray-300 mb-6 max-w-lg mx-auto leading-relaxed">
            Sign up free. Browse jobs. Apply in minutes. Your first payment could arrive in as little as 17 days.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center mb-4">
            <a href="/signup?role=TESTER" className="inline-flex items-center justify-center gap-2 bg-white text-gray-900 hover:bg-gray-100 font-semibold px-6 sm:px-8 h-11 sm:h-12 text-sm sm:text-base rounded-lg transition">
              Create Tester Account <ChevronRight className="h-4 w-4" />
            </a>
          </div>
          <a href="/login" className="text-sm text-gray-400 hover:text-white transition">
            Already have an account? Log in →
          </a>
        </div>

        {/* Cross-links */}
        <section className="bg-gray-50 border border-gray-200 rounded-xl p-5 sm:p-6 mb-10 sm:mb-14">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Related guides</p>
          <div className="space-y-2">
            <Link href="/guides/closed-testing-101" className="flex items-center gap-2 text-sm text-blue-600 hover:underline font-medium">
              <ArrowLeft className="h-3.5 w-3.5" />What is Google Play&apos;s 12-tester rule?
            </Link>
            <Link href="/guides/play-console-setup" className="flex items-center gap-2 text-sm text-blue-600 hover:underline font-medium">
              <ArrowRight className="h-3.5 w-3.5" />Are you a developer? How to add testers to Play Console
            </Link>
          </div>
        </section>

        {/* Footer */}
        <div className="pt-6 border-t border-gray-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="text-sm text-gray-500">
            <p className="font-medium text-gray-700">Questions?</p>
            <p>Email <a href="mailto:testforpays@gmail.com" className="text-blue-600 hover:underline">testforpays@gmail.com</a></p>
          </div>
          <Link href="/" className="text-sm text-blue-600 hover:underline font-medium flex items-center gap-1">
            Back to home <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </main>
    </div>
  );
}
