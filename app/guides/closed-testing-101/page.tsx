"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  ArrowLeft,
  BookOpen,
  AlertTriangle,
  CheckCircle,
  Clock,
  Users,
  Shield,
  ArrowRight,
  Play,
  Smartphone,
  Mail,
  Timer,
  Globe,
  ChevronRight,
  Lightbulb,
} from "lucide-react";

const STEPS = [
  {
    number: "01",
    title: "Open Play Console",
    desc: "Go to Google Play Console → Select your app → Go to Testing → Closed testing.",
    icon: Globe,
  },
  {
    number: "02",
    title: "Create a Closed Test Track",
    desc: "If you don't have one, click 'Create track'. Name it anything — 'Closed Test' works fine.",
    icon: Smartphone,
  },
  {
    number: "03",
    title: "Add Tester Emails",
    desc: "In the Testers tab, create an email list. Paste the 12 tester emails we provide you. Save the list.",
    icon: Mail,
  },
  {
    number: "04",
    title: "Copy the Opt-In Link",
    desc: "Google will show an opt-in link on the same page. Copy it and send it to us — our testers use it to join.",
    icon: ArrowRight,
  },
  {
    number: "05",
    title: "Wait 14 Days",
    desc: "Testers must stay opted in for 14 continuous days. If even one drops out, the streak breaks. That's why we over-deliver testers.",
    icon: Timer,
  },
  {
    number: "06",
    title: "Apply for Production",
    desc: "After 14 days with 12+ active testers, the 'Apply for production' button unlocks. Submit and wait for Google's review.",
    icon: CheckCircle,
  },
];

const MISTAKES = [
  {
    title: "Adding testers but not sending the opt-in link",
    desc: "Just adding emails to Play Console doesn't count. Testers must click the opt-in link and accept the invitation. Check your Play Console — if it says '0 opted in,' the clock hasn't started.",
  },
  {
    title: "Using friends or family who drop out",
    desc: "Your cousin might opt in on day 1, then uninstall your app on day 5. One dropout resets the entire 14-day streak. You need testers who are financially motivated to stay.",
  },
  {
    title: "Starting the 14 days before your app is ready",
    desc: "If Google rejects your app for policy violations during the test, you wasted 14 days. Make sure your app is stable, has a privacy policy, and follows Play Store guidelines before day 1.",
  },
  {
    title: "Thinking 12 testers means exactly 12",
    desc: "12 is the floor. If 2 testers drop out, you're back to 10 and the streak breaks. We recommend 15+ to create a buffer. Our Growth plan gives you 15 testers for exactly this reason.",
  },
];

const TIMELINE = [
  { day: "Day 0", event: "You post your job and pay", color: "bg-blue-600" },
  { day: "Day 0–1", event: "Testers apply and opt in via your Play Console link", color: "bg-green-500" },
  { day: "Day 1–13", event: "Testers keep your app installed and stay opted in", color: "bg-amber-500" },
  { day: "Day 14", event: "Requirement met — apply for production", color: "bg-purple-600" },
  { day: "Day 14–17", event: "Google reviews your production request", color: "bg-gray-400" },
  { day: "Day 17+", event: "Your app is live on Google Play", color: "bg-emerald-600" },
];

export default function ClosedTestingGuidePage() {
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
            Guide
          </Badge>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {/* Hero */}
        <div className="mb-10 sm:mb-14">
          <Badge className="mb-4 bg-blue-100 text-blue-800 hover:bg-blue-100 text-xs sm:text-sm">
            Closed Testing 101
          </Badge>
          <h1 className="text-2xl sm:text-4xl font-bold text-gray-900 leading-tight mb-4">
            Understanding Google Play&apos;s 12-Tester Closed Testing Requirement
          </h1>
          <p className="text-base sm:text-lg text-gray-600 leading-relaxed">
            Everything you need to know about the 14-day rule, why it exists, and how to pass it on your first try — written by a developer who learned the hard way.
          </p>
          <div className="flex items-center gap-3 mt-6 text-sm text-gray-500">
            <span className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              8 min read
            </span>
            <span>•</span>
            <span>Last updated July 2026</span>
          </div>
        </div>

        {/* Personal Story */}
        <Card className="mb-10 sm:mb-14 border-l-4 border-l-blue-500 bg-blue-50/50">
          <CardContent className="p-5 sm:p-6">
            <div className="flex items-start gap-3">
              <Lightbulb className="h-5 w-5 text-blue-600 mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold text-gray-900 mb-2 text-sm sm:text-base">
                  Why I wrote this guide
                </p>
                <p className="text-sm sm:text-base text-gray-700 leading-relaxed">
                  I built TestForPay because my own family couldn&apos;t help me with the 12-tester rule. I asked cousins, friends, anyone with an Android phone. They said yes, then forgot. One uninstalled the app on day 3. Another never clicked the opt-in link. By day 14, I had 8 testers — not 12. I had to start over.
                </p>
                <p className="text-sm sm:text-base text-gray-700 leading-relaxed mt-3">
                  That&apos;s why this guide exists. And that&apos;s why TestForPay pays testers properly — so they actually stay opted in for the full 14 days.
                </p>
                <p className="text-sm text-gray-500 mt-3 font-medium">
                  — Evans, founder of TestForPay
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* What is the rule */}
        <section className="mb-10 sm:mb-14">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Shield className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
            What does Google&apos;s rule actually say?
          </h2>
          <div className="bg-gray-50 rounded-xl p-4 sm:p-6 mb-5">
            <p className="text-sm sm:text-base text-gray-700 italic leading-relaxed">
              &ldquo;If you have a newly created personal developer account, you must run a closed test for your app with a minimum of 12 testers who have been opted-in for at least the last 14 days continuously.&rdquo;
            </p>
            <p className="text-xs sm:text-sm text-gray-500 mt-3">
              — Google Play Console Help
            </p>
          </div>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
              <div>
                <p className="font-medium text-gray-900 text-sm sm:text-base">The testers must be opted in</p>
                <p className="text-sm text-gray-600">Not just added to a list. They must click the opt-in link and accept the invitation in Play Console.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
              <div>
                <p className="font-medium text-gray-900 text-sm sm:text-base">The 14 days must be continuous</p>
                <p className="text-sm text-gray-600">An unbroken streak. If a tester drops out on day 5, the clock resets for that tester. You need 12 active at all times.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
              <div>
                <p className="font-medium text-gray-900 text-sm sm:text-base">It only applies to new personal accounts</p>
                <p className="text-sm text-gray-600">Organization accounts and personal accounts created before November 2023 are exempt. If your friend with a 2019 account says they never did this, they&apos;re right — but it doesn&apos;t apply to you.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Common Mistakes */}
        <section className="mb-10 sm:mb-14">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 sm:h-6 sm:w-6 text-amber-500" />
            Common mistakes that get you rejected
          </h2>
          <div className="space-y-4">
            {MISTAKES.map((mistake, i) => (
              <Card key={i} className="border-red-100 bg-red-50/30">
                <CardContent className="p-4 sm:p-5">
                  <div className="flex items-start gap-3">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-red-100 text-red-600 text-xs font-bold shrink-0 mt-0.5">
                      {i + 1}
                    </span>
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-1 text-sm sm:text-base">
                        {mistake.title}
                      </h3>
                      <p className="text-sm text-gray-600 leading-relaxed">
                        {mistake.desc}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Step by Step */}
        <section className="mb-10 sm:mb-14">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Play className="h-5 w-5 sm:h-6 sm:w-6 text-purple-600" />
            How to set up closed testing in Play Console
          </h2>
          <p className="text-sm sm:text-base text-gray-600 mb-6">
            This takes about 3 minutes. You only do this once per app.
          </p>
          <div className="space-y-4 sm:space-y-5">
            {STEPS.map((step, i) => (
              <div key={i} className="flex gap-3 sm:gap-4">
                <div className="flex flex-col items-center">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gray-900 text-white flex items-center justify-center text-xs sm:text-sm font-bold shrink-0">
                    <step.icon className="h-4 w-4 sm:h-5 sm:w-5" />
                  </div>
                  {i < STEPS.length - 1 && (
                    <div className="w-0.5 h-full bg-gray-200 mt-2" />
                  )}
                </div>
                <div className="pb-6 sm:pb-8">
                  <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                    Step {step.number}
                  </span>
                  <h3 className="font-semibold text-gray-900 mt-1 text-sm sm:text-base">
                    {step.title}
                  </h3>
                  <p className="text-sm text-gray-600 mt-1 leading-relaxed">
                    {step.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Timeline */}
        <section className="mb-10 sm:mb-14">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Timer className="h-5 w-5 sm:h-6 sm:w-6 text-emerald-600" />
            What the 14 days actually look like
          </h2>
          <div className="space-y-0">
            {TIMELINE.map((item, i) => (
              <div key={i} className="flex items-start gap-3 sm:gap-4 py-3 sm:py-4 border-b border-gray-100 last:border-0">
                <div className={`w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full ${item.color} mt-1.5 shrink-0`} />
                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 flex-1">
                  <span className="font-semibold text-gray-900 text-sm sm:text-base min-w-[80px] sm:min-w-[100px]">
                    {item.day}
                  </span>
                  <span className="text-sm text-gray-600">{item.event}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Key Takeaways */}
        <section className="mb-10 sm:mb-14">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Users className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
            Key takeaways
          </h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <Card className="bg-gray-50 border-0">
              <CardContent className="p-4 sm:p-5">
                <p className="font-semibold text-gray-900 mb-1 text-sm sm:text-base">12 is the floor, not the ceiling</p>
                <p className="text-sm text-gray-600">Google requires 12. We recommend 15+ so dropouts don&apos;t break your streak.</p>
              </CardContent>
            </Card>
            <Card className="bg-gray-50 border-0">
              <CardContent className="p-4 sm:p-5">
                <p className="font-semibold text-gray-900 mb-1 text-sm sm:text-base">Paid testers stay longer</p>
                <p className="text-sm text-gray-600">Unpaid friends forget. Testers earning €2.50–€3.00 have a reason to stay opted in.</p>
              </CardContent>
            </Card>
            <Card className="bg-gray-50 border-0">
              <CardContent className="p-4 sm:p-5">
                <p className="font-semibold text-gray-900 mb-1 text-sm sm:text-base">The opt-in link is everything</p>
                <p className="text-sm text-gray-600">If testers don&apos;t click your Play Console opt-in link, they don&apos;t count. Period.</p>
              </CardContent>
            </Card>
            <Card className="bg-gray-50 border-0">
              <CardContent className="p-4 sm:p-5">
                <p className="font-semibold text-gray-900 mb-1 text-sm sm:text-base">One app = one test</p>
                <p className="text-sm text-gray-600">The 14-day requirement is per app. Every new app on a new account needs its own 12 testers.</p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* CTA */}
        <div className="bg-gray-900 rounded-2xl p-6 sm:p-10 text-center">
          <h2 className="text-xl sm:text-2xl font-bold text-white mb-3">
            Ready to get your 12 testers?
          </h2>
          <p className="text-sm sm:text-base text-gray-300 mb-6 max-w-lg mx-auto leading-relaxed">
            Post your job, get verified testers in under 6 hours, and hit that 14-day requirement without begging friends or family.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/dashboard/jobs/new">
              <Button
                size="lg"
                className="bg-white text-gray-900 hover:bg-gray-100 font-semibold px-6 sm:px-8 h-11 sm:h-12 text-sm sm:text-base"
              >
                Start from €28
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
            <Link href="/">
              <Button
                variant="outline"
                size="lg"
                className="border-gray-600 text-white hover:bg-gray-800 hover:text-white px-6 sm:px-8 h-11 sm:h-12 text-sm sm:text-base"
              >
                View Pricing
              </Button>
            </Link>
          </div>
          <p className="text-xs text-gray-500 mt-4">
            Founding developer pricing — first 20 customers only
          </p>
        </div>

        {/* Footer */}
        <div className="mt-10 sm:mt-14 pt-6 border-t border-gray-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="text-sm text-gray-500">
            <p className="font-medium text-gray-700">Questions?</p>
            <p>Email us at hello@testforpay.com</p>
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