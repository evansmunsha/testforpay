'use client'

import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-12">
        <Link href="/" className="inline-flex items-center text-blue-600 hover:text-blue-800 mb-8">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Home
        </Link>

        <h1 className="text-4xl font-bold text-gray-900 mb-4">Privacy Policy</h1>
        <p className="text-gray-600 mb-8">Last updated: January 19, 2026</p>

        <div className="prose prose-gray max-w-none">
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">1. Introduction</h2>
            <p className="text-gray-700 mb-4">
              Welcome to TestForPay ("we," "our," or "us"). We are committed to protecting your personal information 
              and your right to privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard 
              your information when you use our platform.
            </p>
            <p className="text-gray-700">
              TestForPay is operated by Evans Munsha. If you have questions about this policy, please contact us at{' '}
              <a href="mailto:evansensteen@gmail.com" className="text-blue-600 hover:underline">evansensteen@gmail.com</a>.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">2. Information We Collect</h2>
            
            <h3 className="text-xl font-medium text-gray-800 mb-3">2.1 Personal Information</h3>
            <p className="text-gray-700 mb-4">When you register and use TestForPay, we collect:</p>
            <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-2">
              <li>Name and email address</li>
              <li>Password (stored securely using bcrypt encryption)</li>
              <li>Phone number (optional, for testers)</li>
              <li>Device information (for testers: device model, Android version)</li>
              <li>Payment information (processed securely through Stripe)</li>
            </ul>

            <h3 className="text-xl font-medium text-gray-800 mb-3">2.2 Usage Information</h3>
            <p className="text-gray-700 mb-4">We automatically collect:</p>
            <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-2">
              <li>Log data (IP address, browser type, pages visited)</li>
              <li>Application activity (jobs applied, tests completed)</li>
              <li>Screenshots uploaded for verification purposes</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">3. How We Use Your Information</h2>
            <p className="text-gray-700 mb-4">We use your information to:</p>
            <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-2">
              <li>Create and manage your account</li>
              <li>Connect developers with testers</li>
              <li>Process payments and payouts via Stripe</li>
              <li>Verify tester participation in app testing</li>
              <li>Send notifications about job status and payments</li>
              <li>Improve our platform and services</li>
              <li>Comply with legal obligations</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">4. Information Sharing</h2>
            <p className="text-gray-700 mb-4">We share your information with:</p>
            <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-2">
              <li><strong>Developers (for testers):</strong> Your email and device information are shared with developers when you apply to test their apps</li>
              <li><strong>Stripe:</strong> Payment information is processed by Stripe for secure transactions</li>
              <li><strong>Service providers:</strong> We use trusted services for hosting, email, and file storage</li>
              <li><strong>Legal requirements:</strong> When required by law or to protect our rights</li>
            </ul>
            <p className="text-gray-700">We do not sell your personal information to third parties.</p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">5. Data Security</h2>
            <p className="text-gray-700 mb-4">
              We implement appropriate security measures including:
            </p>
            <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-2">
              <li>Encrypted password storage using bcrypt</li>
              <li>Secure HTTPS connections</li>
              <li>JWT-based authentication</li>
              <li>Stripe's PCI-compliant payment processing</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">6. Your Rights</h2>
            <p className="text-gray-700 mb-4">You have the right to:</p>
            <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-2">
              <li>Access your personal data</li>
              <li>Correct inaccurate information</li>
              <li>Delete your account and associated data</li>
              <li>Export your data</li>
              <li>Opt out of marketing communications</li>
            </ul>
            <p className="text-gray-700">
              To exercise these rights, go to Settings in your dashboard or contact us directly.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">7. Cookies</h2>
            <p className="text-gray-700 mb-4">
              We use essential cookies to maintain your login session. We do not use tracking or advertising cookies.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">8. Data Retention</h2>
            <p className="text-gray-700 mb-4">
              We retain your data for as long as your account is active. After account deletion, we may retain 
              certain information for legal compliance and dispute resolution for up to 2 years.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">9. Children's Privacy</h2>
            <p className="text-gray-700 mb-4">
              TestForPay is not intended for users under 18 years of age. We do not knowingly collect 
              information from children.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">10. Changes to This Policy</h2>
            <p className="text-gray-700 mb-4">
              We may update this Privacy Policy from time to time. We will notify you of any changes by 
              posting the new policy on this page and updating the "Last updated" date.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">11. Contact Us</h2>
            <p className="text-gray-700 mb-4">
              If you have questions about this Privacy Policy, please contact us:
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
