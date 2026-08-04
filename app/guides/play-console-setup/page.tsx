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
  Copy,
  ExternalLink,
  Lightbulb,
  Link2,
  List,
  Mail,
  Monitor,
  ThumbsUp,
  ThumbsDown,
  TriangleAlert,
  Users,
} from "lucide-react";

// ─── Step data ────────────────────────────────────────────────────────────────

const STEPS = [
  {
    number: "01",
    title: "Open Your Closed Testing Track",
    icon: Monitor,
    content: (
      <div className="space-y-3">
        <p className="text-sm text-gray-600 leading-relaxed">
          Go to{" "}
          <strong>Google Play Console → Testing → Closed testing</strong> and
          click your testing track. It might be named &quot;Alpha&quot;,
          &quot;Closed Test&quot;, or whatever you named it when you set it up.
        </p>
        <p className="text-sm text-gray-600 leading-relaxed">
          Once you&apos;re inside the track, you&apos;ll see three tabs at the
          top: <strong>Testers</strong>, <strong>Releases</strong>, and{" "}
          <strong>Countries / regions</strong>. Click the{" "}
          <strong>Testers</strong> tab.
        </p>
        <div className="rounded-lg border-2 border-dashed border-gray-200 bg-gray-50 p-4 text-center">
          <Monitor className="h-8 w-8 text-gray-300 mx-auto mb-2" />
          <p className="text-xs text-gray-400 font-medium">
            [Screenshot: Closed testing track with Testers / Releases / Countries tabs]
          </p>
        </div>
      </div>
    ),
  },
  {
    number: "02",
    title: "Create a Tester Email List",
    icon: List,
    content: (
      <div className="space-y-3">
        <p className="text-sm text-gray-600 leading-relaxed">
          Inside the Testers tab, scroll down until you see the{" "}
          <strong>Email lists</strong> section. Click{" "}
          <strong>&quot;Create email list&quot;</strong> — the button is
          usually in the top right of that section.
        </p>
        <p className="text-sm text-gray-600 leading-relaxed">
          Name it something descriptive like <em>TestForPay Testers</em> or
          your app name. The name is just for your own reference — Google
          doesn&apos;t use it for anything.
        </p>
        <div className="rounded-lg border-2 border-dashed border-gray-200 bg-gray-50 p-4 text-center">
          <List className="h-8 w-8 text-gray-300 mx-auto mb-2" />
          <p className="text-xs text-gray-400 font-medium">
            [Screenshot: &quot;Create email list&quot; button in the Testers tab]
          </p>
        </div>
        <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 flex items-start gap-2">
          <TriangleAlert className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
          <p className="text-xs text-amber-800">
            <strong>Don&apos;t skip naming it.</strong> If you have multiple
            jobs in the future, generic names like &quot;List 1&quot; get
            confusing fast.
          </p>
        </div>
      </div>
    ),
  },
  {
    number: "03",
    title: "Copy Tester Emails from TestForPay",
    icon: Copy,
    content: (
      <div className="space-y-3">
        <p className="text-sm text-gray-600 leading-relaxed">
          Go back to your{" "}
          <Link
            href="/dashboard/jobs"
            className="text-blue-600 hover:underline font-medium"
          >
            TestForPay dashboard
          </Link>
          , open your job, and look for the{" "}
          <strong>Tester Emails</strong> card in the right sidebar. You&apos;ll
          see a list of all approved tester emails.
        </p>
        <p className="text-sm text-gray-600 leading-relaxed">
          Click <strong>&quot;Copy all emails&quot;</strong>. This copies every
          email as a newline-separated list — exactly the format Google expects.
        </p>
        <div className="rounded-lg border-2 border-dashed border-blue-100 bg-blue-50 p-4 text-center">
          <Copy className="h-8 w-8 text-blue-200 mx-auto mb-2" />
          <p className="text-xs text-blue-400 font-medium">
            [TestForPay: Tester Emails card with &quot;Copy all emails&quot; button]
          </p>
        </div>
        <p className="text-sm text-gray-600 leading-relaxed">
          Go back to the Google Play Console email list and paste. Each email
          goes on its own line. Click <strong>Save</strong>.
        </p>
        <div className="rounded-lg border-2 border-dashed border-gray-200 bg-gray-50 p-4 text-center">
          <Mail className="h-8 w-8 text-gray-300 mx-auto mb-2" />
          <p className="text-xs text-gray-400 font-medium">
            [Screenshot: Pasting emails into the Play Console email list field]
          </p>
        </div>
      </div>
    ),
  },
  {
    number: "04",
    title: "Get the Opt-In Link",
    icon: Link2,
    content: (
      <div className="space-y-3">
        <p className="text-sm text-gray-600 leading-relaxed">
          After saving the email list, scroll back up to the top of the Testers
          tab. Google will now show you a URL that looks something like:
        </p>
        <div className="rounded-lg bg-gray-900 px-4 py-3 font-mono text-xs text-green-400 break-all">
          https://play.google.com/apps/testing/com.yourapp.packagename
        </div>
        <p className="text-sm text-gray-600 leading-relaxed">
          This is the <strong>opt-in link</strong>. Your testers use this to
          join the closed test. Copy it — you&apos;ll need it in the next step.
        </p>
        <div className="rounded-lg border-2 border-dashed border-gray-200 bg-gray-50 p-4 text-center">
          <Link2 className="h-8 w-8 text-gray-300 mx-auto mb-2" />
          <p className="text-xs text-gray-400 font-medium">
            [Screenshot: Opt-in URL shown at the top of the Testers tab after saving]
          </p>
        </div>
        <div className="rounded-lg bg-blue-50 border border-blue-200 p-3 flex items-start gap-2">
          <Lightbulb className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
          <p className="text-xs text-blue-800">
            <strong>Don&apos;t see the link?</strong> Make sure you actually
            saved the email list first. Google won&apos;t generate the opt-in URL
            until there&apos;s at least one email in the list.
          </p>
        </div>
      </div>
    ),
  },
  {
    number: "05",
    title: "Paste the Link Back into TestForPay",
    icon: ExternalLink,
    content: (
      <div className="space-y-3">
        <p className="text-sm text-gray-600 leading-relaxed">
          Go back to your TestForPay job dashboard. Find the{" "}
          <strong>&quot;Google Play Link&quot;</strong> field — it&apos;s in the
          right sidebar under Job Details. Paste the opt-in URL there and save.
        </p>
        <p className="text-sm text-gray-600 leading-relaxed">
          Once you save it, TestForPay can share the link directly with your
          approved testers. They receive it, click it, and join your closed test.
          You don&apos;t have to message anyone manually.
        </p>
        <div className="rounded-lg border-2 border-dashed border-blue-100 bg-blue-50 p-4 text-center">
          <ExternalLink className="h-8 w-8 text-blue-200 mx-auto mb-2" />
          <p className="text-xs text-blue-400 font-medium">
            [TestForPay: Job sidebar showing the Google Play Link field]
          </p>
        </div>
      </div>
    ),
  },
  {
    number: "06",
    title: "Testers Join the Closed Test",
    icon: Users,
    content: (
      <div className="space-y-3">
        <p className="text-sm text-gray-600 leading-relaxed">
          Each tester will receive the opt-in link and follow these steps:
        </p>
        <ol className="space-y-2 text-sm text-gray-600">
          <li className="flex items-start gap-2">
            <span className="shrink-0 w-5 h-5 rounded-full bg-gray-900 text-white text-xs flex items-center justify-center mt-0.5 font-bold">
              1
            </span>
            Click the opt-in link
          </li>
          <li className="flex items-start gap-2">
            <span className="shrink-0 w-5 h-5 rounded-full bg-gray-900 text-white text-xs flex items-center justify-center mt-0.5 font-bold">
              2
            </span>
            Sign in with the <strong>exact Gmail address</strong> you added to Play Console
          </li>
          <li className="flex items-start gap-2">
            <span className="shrink-0 w-5 h-5 rounded-full bg-gray-900 text-white text-xs flex items-center justify-center mt-0.5 font-bold">
              3
            </span>
            Click <strong>&quot;Become a tester&quot;</strong>
          </li>
          <li className="flex items-start gap-2">
            <span className="shrink-0 w-5 h-5 rounded-full bg-gray-900 text-white text-xs flex items-center justify-center mt-0.5 font-bold">
              4
            </span>
            See the <strong>&quot;Download on Google Play&quot;</strong> button — they install from there, not from an APK
          </li>
        </ol>
        <div className="rounded-lg bg-green-50 border border-green-200 p-3 flex items-start gap-2">
          <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
          <p className="text-xs text-green-800">
            Once a tester clicks &quot;Become a tester&quot;, they show up as opted-in
            in your Play Console. The 14-day clock starts when you have 12 or
            more opted in simultaneously.
          </p>
        </div>
      </div>
    ),
  },
];

// ─── FAQ data ─────────────────────────────────────────────────────────────────

const FAQS = [
  {
    q: "I don't see the opt-in link after saving",
    a: "You need at least one email saved in the list before Google generates the URL. If you saved the list and still don't see it, try refreshing the page. It can take up to 60 seconds to appear.",
  },
  {
    q: "Testers say the link doesn't work",
    a: "They must use the exact Gmail address you added to the list. If they have multiple Google accounts on their phone and sign in with the wrong one, the link will say 'Not available'. Ask them to sign out and back in with the correct account.",
  },
  {
    q: "It says 'app not available in your country'",
    a: "Go to Testing → Closed testing → Countries / regions tab and make sure your testers' countries are included. If you set it to only one country, testers elsewhere will be blocked.",
  },
  {
    q: "It says 'This app is not available'",
    a: "The app might still be processing after your last upload. Google can take up to 1 hour to process a new release. Wait and try again. If it persists, check that the release is set to 'Active' not 'Draft'.",
  },
  {
    q: "Can I use a Google Group instead of an email list?",
    a: "Yes. You can add a Google Group email and everyone in the group gets access. But for small, specific groups like TestForPay testers, individual email lists are more reliable and easier to debug when something goes wrong.",
  },
  {
    q: "How do I know the 14-day clock has started?",
    a: "In Play Console, go to your Closed Testing track → Testers tab. You'll see a count of opted-in testers. Once that hits 12+, you're on the clock. There's no big notification — it just happens. Check back after day 14 and your 'Apply for production' button should be unlocked.",
  },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function PlayConsoleSetupPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [helpful, setHelpful] = useState<"yes" | "no" | null>(null);

  return (
    <div className="min-h-screen bg-white">
      {/* Sticky Nav */}
      <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-blue-600 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Back to TestForPay</span>
            <span className="sm:hidden">Back</span>
          </Link>
          <Badge variant="secondary" className="text-xs">
            <BookOpen className="h-3 w-3 mr-1" />
            Setup Guide
          </Badge>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {/* Hero */}
        <div className="mb-10 sm:mb-14">
          <Badge className="mb-4 bg-green-100 text-green-800 hover:bg-green-100 text-xs sm:text-sm">
            Play Console Setup
          </Badge>
          <h1 className="text-2xl sm:text-4xl font-bold text-gray-900 leading-tight mb-4">
            How to Add Testers to Google Play Console: Step-by-Step
          </h1>
          <p className="text-base sm:text-lg text-gray-600 leading-relaxed">
            Takes 3 minutes. No technical knowledge needed. This is exactly what
            you do after getting approved testers from TestForPay.
          </p>
          <div className="flex items-center gap-3 mt-6 text-sm text-gray-500">
            <span className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              4 min read
            </span>
            <span>•</span>
            <span>Last updated August 2026</span>
          </div>
        </div>

        {/* Before You Start */}
        <Card className="mb-10 sm:mb-14 border-l-4 border-l-green-500 bg-green-50/40">
          <CardContent className="p-5 sm:p-6">
            <p className="font-semibold text-gray-900 mb-3 text-sm sm:text-base flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              Before you start — make sure you have:
            </p>
            <ul className="space-y-2">
              {[
                "A Google Play Console account with your app uploaded",
                "Your app assigned to a Closed Testing track (Alpha or custom)",
                "At least a few approved testers in your TestForPay job",
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                  <span className="mt-0.5 shrink-0 w-4 h-4 rounded border-2 border-green-400 bg-white flex items-center justify-center">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                  </span>
                  {item}
                </li>
              ))}
            </ul>
            <p className="mt-4 text-xs text-gray-500">
              Don&apos;t have testers yet?{" "}
              <Link
                href="/dashboard/jobs/new"
                className="text-blue-600 hover:underline font-medium"
              >
                Post a job on TestForPay →
              </Link>
            </p>
          </CardContent>
        </Card>

        {/* Personal note */}
        <Card className="mb-10 sm:mb-14 border-l-4 border-l-blue-500 bg-blue-50/50">
          <CardContent className="p-5 sm:p-6">
            <div className="flex items-start gap-3">
              <Lightbulb className="h-5 w-5 text-blue-600 mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold text-gray-900 mb-2 text-sm sm:text-base">
                  A note from Evans
                </p>
                <p className="text-sm sm:text-base text-gray-700 leading-relaxed">
                  The first time I set this up, I spent 20 minutes hunting for
                  the opt-in link because I didn&apos;t realise you have to save
                  the email list first. Google doesn&apos;t tell you that clearly
                  anywhere. That&apos;s step 4 of this guide — read it before you
                  wonder why the link isn&apos;t showing up.
                </p>
                <p className="text-sm text-gray-500 mt-3 font-medium">
                  — Evans, founder of TestForPay
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Steps */}
        <section className="mb-10 sm:mb-14">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-6">
            The 6 steps
          </h2>
          <div className="space-y-8 sm:space-y-10">
            {STEPS.map((step, i) => (
              <div key={i} className="flex gap-3 sm:gap-4">
                <div className="flex flex-col items-center">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gray-900 text-white flex items-center justify-center shrink-0">
                    <step.icon className="h-4 w-4 sm:h-5 sm:w-5" />
                  </div>
                  {i < STEPS.length - 1 && (
                    <div className="w-0.5 flex-1 bg-gray-200 mt-2 mb-0 min-h-[24px]" />
                  )}
                </div>
                <div className="pb-2 flex-1">
                  <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                    Step {step.number}
                  </span>
                  <h3 className="font-semibold text-gray-900 mt-1 mb-3 text-sm sm:text-base">
                    {step.title}
                  </h3>
                  {step.content}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Next Steps */}
        <section className="mb-10 sm:mb-14">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            What happens next
          </h2>
          <div className="space-y-3">
            {[
              {
                title: "Once 12+ testers are opted in, the 14-day clock starts",
                desc: "You don't need to do anything to trigger it. Google counts automatically. Check your Play Console a day later — if you see 12+ opted in, you're on track.",
              },
              {
                title: "Check your TestForPay dashboard daily for tester missions",
                desc: "Each tester has a daily mission to complete. This keeps them engaged and gives you proof of activity — useful if Google ever asks for it.",
              },
              {
                title: "On day 14, apply for production",
                desc: "Go back to Play Console → Publishing overview and the 'Apply for production access' button should be unlocked. Click it and follow Google's form.",
              },
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-3">
                <span className="shrink-0 w-6 h-6 rounded-full bg-green-100 text-green-700 text-xs font-bold flex items-center justify-center mt-0.5">
                  {i + 1}
                </span>
                <div>
                  <p className="font-medium text-gray-900 text-sm">{item.title}</p>
                  <p className="text-sm text-gray-600 mt-0.5 leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-5">
            <Link
              href="/guides/closed-testing-101"
              className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline font-medium"
            >
              Read the full 14-day closed testing guide
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </section>

        {/* Cross-link: Want to earn money testing apps? */}
        <div className="bg-green-50 border border-green-200 rounded-xl p-6 mt-8">
          <h3 className="font-semibold text-green-900 mb-2">Want to earn money testing apps?</h3>
          <p className="text-green-800 text-sm mb-4">TestForPay pays real Android users to test apps for 14 days. Works on any Android phone.</p>
          <a href="/guides/tester-guide" className="inline-flex items-center text-green-700 font-medium hover:text-green-900">Learn how to become a paid tester →</a>
        </div>

        {/* FAQ */}
        <section className="mb-10 sm:mb-14">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-5 flex items-center gap-2">
            <TriangleAlert className="h-5 w-5 text-amber-500" />
            Common problems
          </h2>
          <div className="space-y-2">
            {FAQS.map((faq, i) => (
              <div
                key={i}
                className="rounded-lg border border-gray-200 overflow-hidden"
              >
                <button
                  className="w-full flex items-center justify-between px-4 sm:px-5 py-4 text-left hover:bg-gray-50 transition-colors"
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                >
                  <span className="font-medium text-gray-900 text-sm pr-4">
                    {faq.q}
                  </span>
                  <ChevronRight
                    className={`h-4 w-4 text-gray-400 shrink-0 transition-transform ${
                      openFaq === i ? "rotate-90" : ""
                    }`}
                  />
                </button>
                {openFaq === i && (
                  <div className="px-4 sm:px-5 pb-4 border-t border-gray-100 bg-gray-50">
                    <p className="text-sm text-gray-600 leading-relaxed pt-3">
                      {faq.a}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Was this helpful */}
        <div className="mb-10 sm:mb-14 rounded-xl border border-gray-200 p-5 sm:p-6">
          <p className="font-medium text-gray-900 text-sm sm:text-base mb-3 text-center">
            Was this guide helpful?
          </p>
          {helpful === null ? (
            <div className="flex justify-center gap-3">
              <button
                onClick={() => setHelpful("yes")}
                className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-green-50 hover:border-green-300 hover:text-green-700 transition-colors"
              >
                <ThumbsUp className="h-4 w-4" />
                Yes, helped me
              </button>
              <button
                onClick={() => setHelpful("no")}
                className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-red-50 hover:border-red-300 hover:text-red-700 transition-colors"
              >
                <ThumbsDown className="h-4 w-4" />
                Still confused
              </button>
            </div>
          ) : helpful === "yes" ? (
            <p className="text-center text-sm text-green-700 font-medium">
              Glad it helped! 🎉 Good luck with your launch.
            </p>
          ) : (
            <p className="text-center text-sm text-gray-600">
              Sorry it wasn&apos;t clear enough. Email us at{" "}
              <a
                href="mailto:testforpays@gmail.com"
                className="text-blue-600 hover:underline font-medium"
              >
                testforpays@gmail.com
              </a>{" "}
              and we&apos;ll walk you through it.
            </p>
          )}
        </div>

        {/* Understand the rule first — cross-link to closed-testing-101 */}
        <section className="bg-gray-50 border-t border-gray-200 py-10 px-4 -mx-4 sm:-mx-6 mb-10 sm:mb-14">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-2">
              Not sure why Google requires 14 days?
            </h2>
            <p className="text-sm text-gray-600 mb-5">
              Before adding testers, it helps to understand what you&apos;re
              trying to prove to Google — and the mistakes that reset your
              testing clock.
            </p>
            <Link
              href="/guides/closed-testing-101"
              className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 font-medium text-sm"
            >
              ← Back to: What is the 12-tester rule?
            </Link>
          </div>
        </section>

        {/* CTA */}
        <div className="bg-gray-900 rounded-2xl p-6 sm:p-10 text-center mb-10 sm:mb-14">
          <h2 className="text-xl sm:text-2xl font-bold text-white mb-3">
            Ready to hire testers?
          </h2>
          <p className="text-sm sm:text-base text-gray-300 mb-6 max-w-lg mx-auto leading-relaxed">
            Get 12 verified Android testers in under 6 hours. We give you their
            emails, you paste them into Play Console, and the 14-day clock
            starts.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/dashboard/jobs/new">
              <Button
                size="lg"
                className="bg-white text-gray-900 hover:bg-gray-100 font-semibold px-6 sm:px-8 h-11 sm:h-12 text-sm sm:text-base"
              >
                Post your job →
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
            <Link href="/guides/closed-testing-101">
              <Button
                variant="outline"
                size="lg"
                className="border-gray-600 text-white hover:bg-gray-800 hover:text-white px-6 sm:px-8 h-11 sm:h-12 text-sm sm:text-base"
              >
                Read the 14-day guide
              </Button>
            </Link>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-6 border-t border-gray-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="text-sm text-gray-500">
            <p className="font-medium text-gray-700">Still stuck?</p>
            <p>
              Email{" "}
              <a
                href="mailto:testforpays@gmail.com"
                className="text-blue-600 hover:underline"
              >
                testforpays@gmail.com
              </a>{" "}
              with a screenshot and Evans will help.
            </p>
          </div>
          <Link
            href="/"
            className="text-sm text-blue-600 hover:underline font-medium flex items-center gap-1"
          >
            Back to home
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </main>
    </div>
  );
}
