import Link from 'next/link'
import { Testimonials } from '@/components/feedback/testimonials'
import { LiveStats } from '@/components/shared/live-stats'

export const metadata = {
  title: 'Get 12 Google Play Testers in 24 Hours | TestForPay',
  description:
    'Hire verified Android testers for Google Play closed testing in under 24 hours. 12 testers, 14-day requirement, dropout replacement, and money-back guarantee from €28.',
}

export default function HireTestersPage() {
  return (
    <main className="min-h-screen bg-white text-slate-900">
      <section className="bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 px-6 py-20 text-white">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-12 md:flex-row">
          <div className="flex-1">
            <span className="mb-4 inline-block rounded-full border border-amber-500/30 bg-amber-500/10 px-4 py-1 text-sm font-semibold text-amber-300">
              117 testers ready now
            </span>
            <h1 className="mb-4 text-4xl font-extrabold leading-tight md:text-5xl">
              Get Your 12 Google Play Testers in 24 Hours
            </h1>
            <p className="mb-8 max-w-xl text-lg text-slate-300">
              If you are trying to hit Google Play’s 12-tester, 14-day requirement, this is the fastest way to get verified Android testers without the churn. Jobs fill in under 24 hours.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/signup?user_type=developer"
                className="inline-flex items-center rounded-lg bg-violet-600 px-8 py-3 font-semibold text-white transition hover:bg-violet-500"
              >
                Post a Job Now
              </Link>
              <Link
                href="/guides/how-to-get-12-testers-google-play"
                className="inline-flex items-center rounded-lg border border-white/20 bg-white/5 px-8 py-3 font-semibold text-white transition hover:bg-white/10"
              >
                See the guide
              </Link>
            </div>
            <p className="mt-4 text-sm text-slate-300">
              Need the exact playbook?{' '}
              <Link href="/guides/how-to-get-12-testers-google-play" className="font-medium text-white underline">
                How to get 12 testers for Google Play closed testing
              </Link>
            </p>
          </div>

          <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-slate-900/60 p-5 shadow-2xl">
            <div className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
              Play Console preview
            </div>
            {[
              'tester1@email.com — opted in',
              'tester2@email.com — opted in',
              'tester3@email.com — opted in',
            ].map((tester, index) => (
              <div
                key={index}
                className="mb-2 flex items-center gap-2 rounded-md border border-emerald-500/25 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300"
              >
                <span>✓</span>
                {tester}
              </div>
            ))}
            <div className="mb-3 rounded-md border border-dashed border-slate-600 px-3 py-2 text-center text-sm text-slate-400">
              + 9 more testers ready
            </div>
            <div className="rounded-md border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs leading-5 text-amber-200">
              Includes screenshot proof, daily activity checks, and automatic replacement if a tester drops out.
            </div>
          </div>
        </div>
      </section>

      <LiveStats />

      <section className="px-6 py-12">
        <div className="mx-auto grid max-w-5xl gap-0 overflow-hidden rounded-2xl border border-slate-200 md:grid-cols-2">
          <div className="bg-red-50 p-8">
            <div className="mb-4 text-xs font-bold uppercase tracking-[0.2em] text-red-700">
              Without TestForPay
            </div>
            <ul className="space-y-3 text-sm text-red-900">
              <li>• hunting on Reddit, forums, and friends</li>
              <li>• testers dropping out on day 3</li>
              <li>• the 14-day timer resets</li>
              <li>• launch gets delayed and revenue slips</li>
            </ul>
          </div>
          <div className="bg-emerald-50 p-8">
            <div className="mb-4 text-xs font-bold uppercase tracking-[0.2em] text-emerald-700">
              With TestForPay
            </div>
            <ul className="space-y-3 text-sm text-emerald-900">
              <li>• 12 testers in under 24 hours</li>
              <li>• higher retention with paid testers</li>
              <li>• closed testing requirement covered</li>
              <li>• publish on time without the chaos</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="bg-slate-50 px-6 py-12">
        <div className="mx-auto max-w-5xl">
          <h2 className="mb-10 text-center text-3xl font-bold text-slate-900">From post to publish in 4 steps</h2>
          <div className="grid gap-4 md:grid-cols-4">
            {[
              { step: '1', title: 'Post your job', desc: 'Add app details and select a plan' },
              { step: '2', title: 'Approve testers', desc: 'Review candidates and accepted testers' },
              { step: '3', title: 'Copy into Play Console', desc: 'Paste emails and share the opt-in link' },
              { step: '4', title: 'Track the 14-day run', desc: 'Watch retention and replace dropouts fast' },
            ].map((item) => (
              <div key={item.step} className="rounded-2xl border border-slate-200 bg-white p-5 text-center shadow-sm">
                <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-violet-600 text-sm font-bold text-white">
                  {item.step}
                </div>
                <div className="mb-1 font-semibold text-slate-900">{item.title}</div>
                <div className="text-sm text-slate-500">{item.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 py-12">
        <div className="mx-auto grid max-w-5xl gap-6 md:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
            <Testimonials limit={100} />
          </div>

          <div className="space-y-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Starter</div>
              <div className="text-3xl font-extrabold text-slate-900">
                €28
                <span className="ml-2 text-sm font-medium text-slate-400 line-through">€38</span>
              </div>
              <p className="mt-2 text-sm text-slate-600">Launch prep for the 12-tester requirement</p>
              <ul className="mt-4 space-y-2 text-sm text-slate-700">
                <li>✓ 12 verified testers</li>
                <li>✓ 14-day coverage</li>
                <li>✓ dropout replacement support</li>
                <li>✓ Play Console email flow</li>
              </ul>
              <Link
                href="/signup?user_type=developer&plan=starter"
                className="mt-6 inline-flex w-full items-center justify-center rounded-lg bg-violet-600 px-4 py-2.5 font-semibold text-white hover:bg-violet-500"
              >
                Get Started
              </Link>
            </div>

            <div className="rounded-2xl border-2 border-violet-600 bg-white p-6 shadow-sm">
              <div className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-violet-700">Growth</div>
              <div className="text-3xl font-extrabold text-slate-900">
                €48
                <span className="ml-2 text-sm font-medium text-slate-400 line-through">€58</span>
              </div>
              <p className="mt-2 text-sm text-slate-600">Best value for apps needing a faster launch</p>
              <ul className="mt-4 space-y-2 text-sm text-slate-700">
                <li>✓ 15 verified testers</li>
                <li>✓ 14-day retention tracking</li>
                <li>✓ priority support</li>
                <li>✓ detailed feedback reports</li>
              </ul>
              <Link
                href="/signup?user_type=developer&plan=growth"
                className="mt-6 inline-flex w-full items-center justify-center rounded-lg bg-violet-600 px-4 py-2.5 font-semibold text-white hover:bg-violet-500"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-slate-900 px-6 py-10 text-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4">
          <div>
            <div className="text-xl font-bold">Approval or full refund</div>
            <p className="mt-1 text-sm text-slate-300">
              If Google rejects the app because of tester issues, we refund 100%.
            </p>
          </div>
          <div className="text-5xl opacity-20">🛡️</div>
        </div>
      </section>

      <div className="fixed bottom-6 right-6 z-50 hidden lg:block">
        <Link
          href="/signup?user_type=developer"
          className="inline-flex items-center rounded-full bg-violet-600 px-6 py-3 font-semibold text-white shadow-2xl transition hover:bg-violet-500"
        >
          Post a Job Now →
        </Link>
      </div>
    </main>
  )
}
