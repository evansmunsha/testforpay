'use client'

import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-12">
        <Link href="/" className="inline-flex items-center text-blue-600 hover:text-blue-800 mb-8">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Home
        </Link>

        <h1 className="text-4xl font-bold text-gray-900 mb-4">Terms of Service</h1>
        <p className="text-gray-600 mb-8">Last updated: January 19, 2026</p>

        <div className="prose prose-gray max-w-none">
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">1. Agreement to Terms</h2>
            <p className="text-gray-700 mb-4">
              By accessing or using TestForPay ("the Platform"), you agree to be bound by these Terms of Service. 
              If you do not agree to these terms, please do not use our platform.
            </p>
            <p className="text-gray-700">
              TestForPay is a platform that connects app developers who need Google Play closed testers with 
              individuals willing to test apps and provide feedback in exchange for compensation.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">2. Definitions</h2>
            <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-2">
              <li><strong>"Developer"</strong> - A user who posts testing jobs and pays testers</li>
              <li><strong>"Tester"</strong> - A user who applies to test apps and receives payment</li>
              <li><strong>"Testing Job"</strong> - A listing posted by a Developer seeking testers</li>
              <li><strong>"Testing Period"</strong> - The required duration a Tester must keep an app installed (minimum 14 days)</li>
              <li><strong>"Platform Fee"</strong> - The 15% fee charged by TestForPay on each transaction</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">3. Eligibility</h2>
            <p className="text-gray-700 mb-4">To use TestForPay, you must:</p>
            <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-2">
              <li>Be at least 18 years old</li>
              <li>Have a valid email address</li>
              <li>For Testers: Own an Android device capable of installing apps from Google Play</li>
              <li>For Developers: Have a Google Play Developer account with a closed testing track</li>
              <li>Provide accurate and truthful information</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">4. Developer Obligations</h2>
            <p className="text-gray-700 mb-4">As a Developer, you agree to:</p>
            <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-2">
              <li>Provide accurate app information and valid Google Play links</li>
              <li>Add approved testers' email addresses to your closed testing track</li>
              <li>Pay the full amount (tester payment + platform fee) before job activation</li>
              <li>Review and respond to tester applications in a timely manner</li>
              <li>Verify tester screenshots honestly and fairly</li>
              <li>Not request testers to perform illegal activities</li>
              <li>Not collect testers' personal information beyond what's necessary</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">5. Tester Obligations</h2>
            <p className="text-gray-700 mb-4">As a Tester, you agree to:</p>
            <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-2">
              <li>Provide accurate device information</li>
              <li>Only apply to jobs you can genuinely complete</li>
              <li>Install the app and keep it installed for the full testing period</li>
              <li>Submit honest verification screenshots</li>
              <li>Provide genuine and constructive feedback</li>
              <li>Not use fake accounts, emulators, or automated tools</li>
              <li>Not submit fraudulent applications or screenshots</li>
              <li>Set up Stripe Connect to receive payments</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">6. Payments and Fees</h2>
            
            <h3 className="text-xl font-medium text-gray-800 mb-3">6.1 Developer Payments</h3>
            <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-2">
              <li>Developers pay upfront when creating a testing job</li>
              <li>Payment includes tester compensation plus 15% platform fee</li>
              <li>Payments are processed securely through Stripe</li>
              <li>Refunds may be issued if a job is cancelled before testers are approved</li>
            </ul>

            <h3 className="text-xl font-medium text-gray-800 mb-3">6.2 Tester Payouts</h3>
            <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-2">
              <li>Testers are paid after completing the full testing period</li>
              <li>Payouts are processed via Stripe Connect</li>
              <li>Testers must complete Stripe onboarding to receive payments</li>
              <li>Payment timing depends on Stripe's processing (typically 2-7 business days)</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">7. Verification Process</h2>
            <p className="text-gray-700 mb-4">
              Testers must verify their participation by uploading a screenshot showing:
            </p>
            <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-2">
              <li>The app in Google Play Store, or</li>
              <li>The app installed on their device's home screen</li>
            </ul>
            <p className="text-gray-700 mb-4">
              Developers review screenshots and approve or reject them. Fraudulent screenshots will 
              result in account suspension.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">8. Prohibited Activities</h2>
            <p className="text-gray-700 mb-4">Users are prohibited from:</p>
            <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-2">
              <li>Creating multiple accounts</li>
              <li>Submitting fake or manipulated screenshots</li>
              <li>Using emulators or modified devices to fake testing</li>
              <li>Uninstalling apps before the testing period ends</li>
              <li>Harassing other users</li>
              <li>Posting malicious or illegal apps</li>
              <li>Attempting to bypass the platform for payments</li>
              <li>Violating Google Play's terms of service</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">9. Account Termination</h2>
            <p className="text-gray-700 mb-4">
              We reserve the right to suspend or terminate accounts that:
            </p>
            <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-2">
              <li>Violate these Terms of Service</li>
              <li>Engage in fraudulent activities</li>
              <li>Receive multiple complaints from other users</li>
              <li>Remain inactive for extended periods</li>
            </ul>
            <p className="text-gray-700">
              You may also delete your account at any time from the Settings page.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">10. Intellectual Property</h2>
            <p className="text-gray-700 mb-4">
              TestForPay and its original content, features, and functionality are owned by Evans Munsha 
              and are protected by copyright and trademark laws. Apps listed by Developers remain the 
              property of their respective owners.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">11. Disclaimers</h2>
            <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-2">
              <li>TestForPay is provided "as is" without warranties of any kind</li>
              <li>We do not guarantee specific earnings for testers</li>
              <li>We are not responsible for app quality or behavior</li>
              <li>We do not guarantee Google Play account safety</li>
              <li>Payment processing is handled by Stripe; we are not liable for their service issues</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">12. Limitation of Liability</h2>
            <p className="text-gray-700 mb-4">
              To the maximum extent permitted by law, TestForPay and its owner shall not be liable for any 
              indirect, incidental, special, consequential, or punitive damages resulting from your use 
              of the platform.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">13. Dispute Resolution</h2>
            <p className="text-gray-700 mb-4">
              For disputes between Developers and Testers, we encourage resolution through our platform. 
              Contact support for assistance. We reserve the right to make final decisions on disputes.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">14. Changes to Terms</h2>
            <p className="text-gray-700 mb-4">
              We may modify these Terms at any time. Continued use of the platform after changes 
              constitutes acceptance of the new terms.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">15. Governing Law</h2>
            <p className="text-gray-700 mb-4">
              These Terms shall be governed by the laws of Zambia, without regard to conflict of law principles.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">16. Contact</h2>
            <p className="text-gray-700 mb-4">
              For questions about these Terms, contact us:
            </p>
            <div className="bg-gray-100 p-4 rounded-lg">
              <p className="text-gray-700"><strong>Evans Munsha</strong></p>
              <p className="text-gray-700">Email: <a href="mailto:evansensteen@gmail.com" className="text-blue-600 hover:underline">evansensteen@gmail.com</a></p>
              <p className="text-gray-700">Phone: <a href="tel:+260963266937" className="text-blue-600 hover:underline">+260 963 266 937</a></p>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
