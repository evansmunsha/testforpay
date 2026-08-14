export const metadata = {
  title: "Google Play Closed Testing: 12 Testers in 14 Days (Full Guide)",
  description: "Everything you need to know about Google's closed testing requirement — and how to meet it without the headache.",
};

export default function GuidePage() {
  return (
    <article className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-gray-200 pb-8 pt-16 px-6">
        <div className="max-w-3xl mx-auto">
          <div className="flex gap-2 mb-4">
            <span className="bg-violet-100 text-violet-700 px-3 py-1 rounded-full text-xs font-semibold">Google Play</span>
            <span className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-xs font-semibold">Guide</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 leading-tight mb-4">
            Google Play Closed Testing: 12 Testers in 14 Days (Full Guide)
          </h1>
          <p className="text-lg text-gray-500 mb-6">
            Everything you need to know about Google's closed testing requirement — and how to meet it without the headache.
          </p>
          <div className="flex items-center gap-3 text-sm text-gray-500">
            <div className="w-9 h-9 bg-violet-600 text-white rounded-full flex items-center justify-center font-bold text-sm">T</div>
            <div>
              <div className="font-semibold text-gray-700">TestForPay Team</div>
              <div>Updated 12 Aug 2026 · 8 min read</div>
            </div>
          </div>
        </div>
      </header>

      {/* Body */}
      <div className="max-w-3xl mx-auto px-6 py-10">
        {/* TOC */}
        <div className="bg-gray-50 rounded-lg p-6 mb-10">
          <div className="text-sm font-bold text-gray-700 mb-3">📋 In This Guide</div>
          <div className="space-y-2">
            {[
              "What is Google Play closed testing?",
              "Why 12 testers for 14 days?",
              "How to set up your closed test",
              "Where to find real testers",
              "Common mistakes that cause rejection",
            ].map((item, i) => (
              <a key={i} href={`#section-${i + 1}`} className="block text-sm text-violet-700 font-medium hover:underline">
                {i + 1}. {item}
              </a>
            ))}
          </div>
        </div>

        <h2 id="section-1" className="text-2xl font-bold text-gray-900 mt-10 mb-4">What Is Google Play Closed Testing?</h2>
        <p className="text-gray-700 leading-8 mb-5">
          Before you can publish an app to production on Google Play, Google requires you to run a <strong>closed test</strong> with at least 12 real users who stay opted in for 14 continuous days. This isn't optional — it's a hard gate.
        </p>
        <p className="text-gray-700 leading-8 mb-5">
          The goal is simple: Google wants proof that real people can install, open, and use your app without crashes or critical bugs.
        </p>

        <div className="bg-blue-50 border-l-4 border-blue-500 rounded-r-lg p-5 my-6">
          <div className="font-semibold text-blue-900 mb-1">💡 Key Difference: Internal vs Closed</div>
          <div className="text-sm text-blue-800 leading-relaxed">
            <strong>Internal testing</strong> is for your team (up to 100 people) and has no 14-day rule. <strong>Closed testing</strong> is for external users and is mandatory before production access.
          </div>
        </div>

        <h2 id="section-2" className="text-2xl font-bold text-gray-900 mt-10 mb-4">Why 12 Testers for 14 Days?</h2>
        <p className="text-gray-700 leading-8 mb-5">
          Google's logic is statistical. 12 users across different devices and locations gives them confidence that your app works in the real world.
        </p>

        <div className="overflow-x-auto my-6">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-gray-100">
                <th className="text-left p-3 border-b-2 border-gray-200 font-semibold text-gray-700">Requirement</th>
                <th className="text-left p-3 border-b-2 border-gray-200 font-semibold text-gray-700">What Google Wants</th>
                <th className="text-left p-3 border-b-2 border-gray-200 font-semibold text-gray-700">What Goes Wrong</th>
              </tr>
            </thead>
            <tbody>
              {[
                ["12 testers", "Real people, real devices", "Fake accounts, same device"],
                ["14 days", "Continuous opt-in", "Testers leave on day 3"],
                ["Diverse locations", "Multiple countries", "All from same city"],
              ].map((row, i) => (
                <tr key={i} className="border-b border-gray-100">
                  <td className="p-3 font-medium text-gray-900">{row[0]}</td>
                  <td className="p-3 text-gray-600">{row[1]}</td>
                  <td className="p-3 text-red-600">{row[2]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <h2 id="section-4" className="text-2xl font-bold text-gray-900 mt-10 mb-4">Where to Find Real Testers</h2>
        <p className="text-gray-700 leading-8 mb-5">You have three options. Two will waste your time.</p>

        <div className="space-y-4 my-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-5">
            <div className="font-bold text-red-800 mb-1">❌ Reddit / Facebook Groups</div>
            <div className="text-sm text-red-700">Free, but testers ghost you after day 2. You'll spend more time chasing people than building your app.</div>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-lg p-5">
            <div className="font-bold text-red-800 mb-1">❌ Cheap Tester Marketplaces</div>
            <div className="text-sm text-red-700">Pay €5 for 12 testers. They use emulators or disappear before day 14. Google detects this and rejects your app.</div>
          </div>
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-5">
            <div className="font-bold text-emerald-800 mb-1">✅ TestForPay</div>
            <div className="text-sm text-emerald-700">
              Verified real users on real Android devices. Fair pay keeps them engaged. 95% complete the full 14 days. <a href="/hire-testers" className="font-semibold text-emerald-800 underline">Hire testers from €28 →</a>
            </div>
          </div>
        </div>

        {/* Inline CTA */}
        <div className="bg-gradient-to-br from-violet-600 to-violet-700 rounded-xl p-8 my-10 text-center text-white">
          <div className="text-xl font-bold mb-2">Skip the Headache — Hire Verified Testers</div>
          <div className="text-violet-200 mb-6">12 testers, 14 days, approval guarantee. Starting at €28.</div>
          <a href="/hire-testers" className="inline-block bg-white text-violet-700 px-8 py-3 rounded-lg font-bold hover:bg-violet-50 transition">
            Start My Closed Test
          </a>
        </div>

        <h2 id="section-5" className="text-2xl font-bold text-gray-900 mt-10 mb-4">Common Mistakes That Cause Rejection</h2>
        <ul className="list-disc pl-6 space-y-3 text-gray-700 leading-8 mb-6">
          <li><strong>Testers using emulators</strong> — Google checks device fingerprints. Emulators = instant red flag.</li>
          <li><strong>Same IP address</strong> — 12 testers from one Wi-Fi network looks suspicious.</li>
          <li><strong>No app activity</strong> — Testers must actually open and use the app, not just install it.</li>
          <li><strong>Dropouts before day 14</strong> — If you drop below 12 active testers, the timer may reset.</li>
        </ul>

        <h2 className="text-2xl font-bold text-gray-900 mt-10 mb-4">Ready to Publish?</h2>
        <p className="text-gray-700 leading-8 mb-6">
          Google Play closed testing doesn't have to be the bottleneck that delays your launch. With the right testers, you can meet requirements in exactly 14 days and move to production with confidence.
        </p>

        {/* Bottom CTA */}
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-8 text-center">
          <div className="text-lg font-bold text-gray-900 mb-2">Need Testers Fast?</div>
          <p className="text-gray-500 mb-5">Get 12 verified Android testers in under 6 hours. Approval guaranteed.</p>
          <a href="/hire-testers" className="inline-block bg-violet-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-violet-700 transition">
            Hire Testers from €28 →
          </a>
        </div>

        {/* Author */}
        <div className="flex gap-4 items-center bg-gray-50 rounded-lg p-5 mt-10">
          <div className="w-12 h-12 bg-violet-600 text-white rounded-full flex items-center justify-center font-bold text-lg shrink-0">T</div>
          <div>
            <div className="font-bold text-gray-900">TestForPay Team</div>
            <div className="text-sm text-gray-500">
              We help Android developers meet Google Play's closed testing requirements. Questions? <a href="/contact" className="text-violet-700 font-medium">Contact us</a>.
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}
