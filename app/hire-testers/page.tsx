import Link from 'next/link'
import { Testimonials } from '@/components/feedback/testimonials'

export const metadata = {
  title: "Hire App Testers for Google Play — 12 Testers, 14 Days",
  description: "Hire verified Android testers to meet Google Play's closed testing requirement. 12 testers, 14 days, dropout replacement. Approval guarantee from €28.",
};

export default function HireTestersPage() {
  return (
    <main className="min-h-screen bg-white">
      {/* Hero */}
      <section className="bg-gradient-to-br from-gray-900 to-indigo-950 text-white px-6 py-20">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center gap-12">
          <div className="flex-1">
            <span className="inline-block bg-amber-500/20 text-amber-300 px-4 py-1 rounded-full text-sm font-semibold mb-4 border border-amber-500/30">
              ⚡ Hire in Under 6 Hours
            </span>
            <h1 className="text-4xl md:text-5xl font-extrabold mb-4 leading-tight">
              Hire Verified Testers for<br />
              <span className="text-violet-400">Google Play Closed Testing</span>
            </h1>
            <p className="text-lg text-gray-300 mb-8 max-w-lg">
              Tried Reddit, friends, and tester groups? They drop out on day 3. We guarantee 12 testers for the full 14 days — or your money back.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link href="/signup?user_type=developer" className="bg-violet-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-violet-700 transition inline-flex items-center">
                Hire Testers from €28
              </Link>
              <Link href="/#video" className="border-2 border-white/30 text-white px-8 py-3 rounded-lg font-semibold hover:bg-white/10 transition inline-flex items-center">
                Watch 2-Min Demo
              </Link>
            </div>
          </div>
          <div className="flex-1 max-w-sm bg-black/30 rounded-xl p-5 border border-white/10">
            <div className="text-xs text-gray-400 uppercase tracking-wider mb-3">Play Console Preview</div>
            {[
              "tester1@email.com — opted in",
              "tester2@email.com — opted in",
              "tester3@email.com — opted in",
            ].map((t, i) => (
              <div key={i} className="bg-emerald-500/15 border border-emerald-500/30 rounded-md px-3 py-2 text-emerald-400 text-sm mb-2 flex items-center gap-2">
                <span>✓</span> {t}
              </div>
            ))}
            <div className="border border-dashed border-white/20 rounded-md px-3 py-2 text-gray-500 text-sm text-center mb-3">
              + 9 more testers ready
            </div>
            <div className="rounded-md bg-amber-500/10 border border-amber-500/30 px-3 py-2 text-amber-200 text-xs leading-5">
              Includes screenshot proof, daily activity checks, and automatic replacement if a tester drops out.
            </div>
          </div>
        </div>
      </section>

      {/* Problem vs Solution */}
      <section className="py-12 px-6">
        <div className="max-w-4xl mx-auto grid md:grid-cols-2 rounded-xl overflow-hidden">
          <div className="bg-red-50 border-r border-red-200 p-8">
            <div className="text-xs font-bold text-red-700 uppercase tracking-wider mb-4">❌ Without TestForPay</div>
            <ul className="text-sm text-red-900 space-y-3">
              <li>• Post in forums, get 3 responses</li>
              <li>• Testers drop out on day 3</li>
              <li>• 14-day timer resets</li>
              <li>• Delayed launch, lost revenue</li>
            </ul>
          </div>
          <div className="bg-emerald-50 p-8">
            <div className="text-xs font-bold text-emerald-700 uppercase tracking-wider mb-4">✅ With TestForPay</div>
            <ul className="text-sm text-emerald-900 space-y-3">
              <li>• 12 testers in under 6 hours</li>
              <li>• Fair pay = 95% retention</li>
              <li>• 14 days complete on schedule</li>
              <li>• Publish to production on time</li>
            </ul>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-12 px-6 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-10">From Post to Publish in 4 Steps</h2>
          <div className="flex flex-col md:flex-row gap-4">
            {[
              { n: "1", title: "Post Your Job", desc: "Add app link & pick a plan" },
              { n: "2", title: "Paste Emails", desc: "Copy into Play Console" },
              { n: "3", title: "Track Live", desc: "See opt-ins in real time" },
              { n: "4", title: "Go Live", desc: "Meet requirements & publish", last: true },
            ].map((step, i) => (
              <div key={step.n} className="flex-1 text-center relative">
                <div className={`w-11 h-11 rounded-full flex items-center justify-center text-white font-bold mx-auto mb-3 ${step.last ? "bg-emerald-500" : "bg-violet-600"}`}>
                  {step.n}
                </div>
                <div className="font-semibold text-gray-900 text-sm">{step.title}</div>
                <div className="text-xs text-gray-500 mt-1">{step.desc}</div>
                {!step.last && (
                  <div className="hidden md:block absolute top-5 right-0 w-1/2 h-0.5 bg-gray-200 translate-x-1/2" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonial + Pricing */}
      <section className="py-12 px-6">
        <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-6">
          <div className="bg-gray-50 rounded-xl p-6">
            
            <Testimonials limit={2} title="Trusted by developers" intro="What customers say after using TestForPay to ship on time." />
          </div>
          <div className="grid gap-6">
            <div className="rounded-xl border border-gray-200 p-6 bg-white">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-gray-500 uppercase">Starter</div>
                  <div className="mt-2 text-3xl font-extrabold text-gray-900">€28 <span className="text-sm text-gray-400 line-through ml-2">€38</span></div>
                  <div className="mt-2 text-sm text-gray-600">🚀 Founding price — limited slots</div>
                </div>
              </div>
              <ul className="mt-4 text-sm text-gray-700 space-y-2">
                <li>✓ 12 verified testers</li>
                <li>✓ 14-day guarantee</li>
                <li>✓ Screenshot-ready activity tracking</li>
                <li>✓ Basic dashboard tracking</li>
                <li>✓ Email support</li>
                <li>✓ Approval guarantee</li>
              </ul>
              <div className="mt-6">
                <Link href="/signup?user_type=developer&plan=starter" className="inline-flex w-full items-center justify-center rounded-lg bg-violet-600 px-4 py-2 text-white font-semibold hover:bg-violet-700">Get Started</Link>
              </div>
            </div>

            <div className="rounded-xl border-2 border-violet-600 p-6 bg-white">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-violet-700 uppercase">Growth</div>
                  <div className="mt-2 text-3xl font-extrabold text-gray-900">€48 <span className="text-sm text-gray-400 line-through ml-2">€58</span></div>
                  <div className="mt-2 text-sm text-gray-600">⭐ Most popular — best value</div>
                </div>
              </div>
              <ul className="mt-4 text-sm text-gray-700 space-y-2">
                <li>✓ 15 verified testers</li>
                <li>✓ 14-day guarantee</li>
                <li>✓ Screenshot proof + feedback reports</li>
                <li>✓ Detailed feedback reports</li>
                <li>✓ Priority support</li>
                <li>✓ Dropout replacement</li>
                <li>✓ Approval guarantee</li>
              </ul>
              <div className="mt-6">
                <Link href="/signup?user_type=developer&plan=growth" className="inline-flex w-full items-center justify-center rounded-lg bg-violet-600 px-4 py-2 text-white font-semibold hover:bg-violet-700">Get Started</Link>
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 p-6 bg-white">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-gray-500 uppercase">Pro</div>
                  <div className="mt-2 text-3xl font-extrabold text-gray-900">€78 <span className="text-sm text-gray-400 line-through ml-2">€88</span></div>
                  <div className="mt-2 text-sm text-gray-600">🛡️ Maximum safety for serious apps</div>
                </div>
              </div>
              <ul className="mt-4 text-sm text-gray-700 space-y-2">
                <li>✓ 25 verified testers</li>
                <li>✓ 14-day guarantee</li>
                <li>✓ Advanced analytics + proof tracking</li>
                <li>✓ Dedicated support</li>
                <li>✓ Dropout replacement</li>
                <li>✓ Approval guarantee</li>
              </ul>
              <div className="mt-6">
                <Link href="/signup?user_type=developer&plan=pro" className="inline-flex w-full items-center justify-center rounded-lg bg-violet-600 px-4 py-2 text-white font-semibold hover:bg-violet-700">Get Started</Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Guarantee */}
      <section className="bg-gradient-to-r from-gray-900 to-indigo-950 text-white px-6 py-10">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <div className="text-xl font-bold mb-1">Approval or Full Refund</div>
            <div className="text-sm text-gray-300">If Google rejects your app due to tester issues, we refund 100%. No questions.</div>
          </div>
          <div className="text-5xl opacity-20">🛡️</div>
        </div>
      </section>
    </main>
  );
}
