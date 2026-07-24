"use client";

import Link from "next/link";
import { ArrowLeft, Shield, Mail } from "lucide-react";

export default function RefundPolicyPage() {
  return (
    <div className="min-h-screen bg-linear-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <nav className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16">
            <Link
              href="/"
              className="flex items-center gap-2 text-gray-700 hover:text-blue-600"
            >
              <ArrowLeft className="h-5 w-5" />
              <span className="font-medium">Back to Home</span>
            </Link>
          </div>
        </div>
      </nav>

      {/* Content */}
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <Shield className="h-16 w-16 text-blue-600 mx-auto mb-4" />
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Refund Policy
          </h1>
          <p className="text-lg text-gray-600">
            Last updated: July 24, 2026
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-8 md:p-12 space-y-8">
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Our Promise
            </h2>
            <p className="text-gray-700 leading-relaxed">
              At TestForPay, we stand behind our service. If Google Play rejects
              your app specifically due to tester compliance issues after you used
              TestForPay correctly, we will refund 100% of your payment. No
              questions asked.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              What Is Covered
            </h2>
            <p className="text-gray-700 mb-4">
              Our approval guarantee covers rejections directly caused by:
            </p>
            <ul className="space-y-3 text-gray-700">
              <li className="flex items-start gap-3">
                <span className="text-green-500 mt-1 shrink-0">✓</span>
                <span>
                  Not enough genuine testers completing the full 14-day period
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-green-500 mt-1 shrink-0">✓</span>
                <span>
                  Tester accounts flagged by Google as suspicious or
                  non-genuine
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-green-500 mt-1 shrink-0">✓</span>
                <span>
                  High tester dropout before day 14 that we failed to replace
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-green-500 mt-1 shrink-0">✓</span>
                <span>
                  Failure to deliver the number of testers you paid for within
                  the promised timeframe
                </span>
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              What Is Not Covered
            </h2>
            <p className="text-gray-700 mb-4">
              We cannot issue refunds for rejections caused by:
            </p>
            <ul className="space-y-3 text-gray-700">
              <li className="flex items-start gap-3">
                <span className="text-red-400 mt-1 shrink-0">✗</span>
                <span>
                  App quality issues, crashes, bugs, or policy violations in
                  your app itself
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-red-400 mt-1 shrink-0">✗</span>
                <span>
                  Incorrect Google Play Console setup (e.g., wrong track,
                  missing privacy policy, incorrect target countries)
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-red-400 mt-1 shrink-0">✗</span>
                <span>
                  Violations of Google Play's content, gambling, or malware
                  policies
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-red-400 mt-1 shrink-0">✗</span>
                <span>
                  Changes you made to your app during the testing period that
                  caused rejection
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-red-400 mt-1 shrink-0">✗</span>
                <span>
                  You requesting a refund after your app was successfully
                  approved
                </span>
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              How to Request a Refund
            </h2>
            <ol className="space-y-4 text-gray-700 list-decimal list-inside">
              <li>
                <strong>Contact us within 14 days</strong> of your Google Play
                rejection notice.
              </li>
              <li>
                <strong>Email testforpays@gmail.com</strong> with:
                <ul className="mt-2 ml-6 space-y-2 list-disc">
                  <li>Your TestForPay account email</li>
                  <li>The rejection email or screenshot from Google Play</li>
                  <li>Your app's package name</li>
                  <li>The testing job ID from your TestForPay dashboard</li>
                </ul>
              </li>
              <li>
                <strong>We review within 48 hours.</strong> If your rejection
                falls under our covered reasons, we process the refund to your
                original payment method within 5–7 business days.
              </li>
            </ol>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Partial Refunds
            </h2>
            <p className="text-gray-700 leading-relaxed">
              If we delivered some but not all of your paid testers (e.g., only
              10 out of 12 testers completed the full period due to our
              failure), we will issue a pro-rata refund for the missing testers.
              This is separate from the full approval guarantee.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Tester Payments Are Final
            </h2>
            <p className="text-gray-700 leading-relaxed">
              Once testers have completed the full 14-day testing period and
              been verified, their payment is released from escrow and is
              non-refundable. This protects our testers, who rely on TestForPay
              for income. Refunds to developers only apply to the platform
              service fee or undelivered testing slots.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Changes to This Policy
            </h2>
            <p className="text-gray-700 leading-relaxed">
              We may update this Refund Policy from time to time. Any changes
              will be posted on this page with an updated date. Refund requests
              are evaluated based on the policy in effect at the time of your
              purchase.
            </p>
          </section>

          <div className="bg-blue-50 rounded-xl p-6 text-center">
            <Mail className="h-8 w-8 text-blue-600 mx-auto mb-3" />
            <p className="text-gray-800 font-medium mb-2">
              Questions about refunds?
            </p>
            <a
              href="mailto:testforpays@gmail.com"
              className="text-blue-600 font-semibold hover:underline"
            >
              testforpays@gmail.com
            </a>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-300 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-sm">© 2026 TestForPay. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}