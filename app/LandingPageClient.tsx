"use client"

import Image from 'next/image'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, Briefcase, CheckCircle2, ShieldCheck, Sparkles, Users, Menu } from 'lucide-react'
import { Testimonials } from '@/components/feedback/testimonials'

const features = [
  {
    title: 'Real engagement, not warm bodies',
    description:
      'Vetted Android testers stay active for the full 14-day cycle, with daily check-ins and usage proof.',
    icon: Users,
  },
  {
    title: 'Proof + screenshots included',
    description:
      'Get structured reports, screenshots, and feedback that show the tester actually used the app — not just a click-through.',
    icon: CheckCircle2,
  },
  {
    title: 'Built for Play Store apps',
    description:
      'Support for closed testing workflows, compliance checks, and Google Play beta release best practices.',
    icon: ShieldCheck,
  },
]

const steps = [
  {
    title: 'Post your app listing',
    description:
      'Tell us what you need: devices, target audience, Play Store testing goals, and reward per tester.',
    icon: Briefcase,
  },
  {
    title: 'Approve testers',
    description:
      'Review tester profiles, device coverage, and past feedback before selecting the best candidates.',
    icon: Sparkles,
  },
  {
    title: 'Receive verified reports',
    description:
      'Get structured bug reports, feature insights, and completion confirmation before payment.',
    icon: CheckCircle2,
  },
]

const pricingPlans = [
  {
    name: 'Starter',
    foundingPrice: '€28',
    regularPrice: '€38',
    description: '12 verified testers, 14-day guarantee, and automatic dropout replacement.',
  },
  {
    name: 'Growth',
    foundingPrice: '€48',
    regularPrice: '€58',
    description: '15 verified testers, screenshot proof, and stronger device coverage for faster validation.',
  },
  {
    name: 'Pro',
    foundingPrice: '€78',
    regularPrice: '€88',
    description: '25 testers, deeper feedback, higher priority support, and priority replacement coverage.',
  },
]

const faqs = [
  {
    q: 'How fast can I get testers?',
    a: 'Most jobs fill in under 6 hours once your Play Console list is ready and your app is approved for closed testing.',
  },
  {
    q: 'Do testers stay opted in for 14 days?',
    a: 'Yes — we pay testers to remain in the closed test for the full 14-day period, and we replace dropouts automatically.',
  },
  {
    q: 'Can I just recruit 12 friends or people from a group?',
    a: 'You can, but most developers who come to us have already tried that and hit the same issue: friend groups drop out on day 3 and the 14-day timer resets. We replace dropouts automatically and keep the testing window on track with paid, accountable testers.',
  },
  {
    q: 'Do you provide screenshots and proof of activity?',
    a: 'Yes. We structure the workflow around real engagement: daily check-ins, screenshots, and feedback, so you are not left with only a warm body and a hope.',
  },
  {
    q: 'What payment options do testers use?',
    a: 'Testers can receive payments via PayPal or bank transfer depending on their country and preferences.',
  },
  {
    q: 'Can I use this for any Android app?',
    a: 'Yes. TestForPay works with most Google Play closed testing workflows for apps that meet Play Store policies.',
  },
]

export default function HomePage() {
  interface User {
    id: string
    email: string
    name?: string
    role: 'DEVELOPER' | 'TESTER' | 'ADMIN'
  }

  const router = useRouter()

  const [active, setActive] = useState<'developer' | 'tester'>('developer')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  const [checkingAuth, setCheckingAuth] = useState(true)

  useEffect(() => {
    fetch('/api/auth/session')
      .then(res => (res.ok ? res.json() : null))
      .then(data => {
        if (data?.user) setUser(data.user)
      })
      .catch(() => {})
      .finally(() => setCheckingAuth(false))
  }, [])

  const handleGetStarted = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('user_type', active)
      router.push('/signup')
    }
  }

  const handleLogin = () => {
    if (typeof window !== 'undefined') {
      router.push('/login')
    }
  }

  const handleDashboard = () => {
    if (typeof window !== 'undefined') {
      if (user?.role === 'TESTER') {
        router.push('/dashboard/browse')
      } else {
        router.push('/dashboard')
      }
    }
  }

  const handleAdminPanel = () => {
    if (typeof window !== 'undefined') {
      router.push('/dashboard/admin')
    }
  }

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId)
    if (element) element.scrollIntoView({ behavior: 'smooth', block: 'start' })
    setMobileMenuOpen(false)
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8 flex items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <Link href="/" className="inline-flex items-center">
              <Image src="/images/logo.svg" alt="TestForPay" width={180} height={40} className="h-8 w-auto" />
            </Link>
          </div>

          <div className="md:hidden flex items-center gap-2">
            <button
              aria-label="Open menu"
              onClick={() => setMobileMenuOpen(prev => !prev)}
              className="p-2 rounded-md text-slate-700 hover:bg-slate-100"
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>

          <div className="hidden md:flex items-center space-x-6">
            <Link href="/testers" className="text-gray-700 hover:text-blue-600">Earn Money Testing</Link>
            <Link href="/hire-testers" className="text-gray-700 hover:text-blue-600">Hire Testers</Link>
            <button onClick={() => scrollToSection('features')} className="text-gray-700 hover:text-blue-600">Features</button>
            <button onClick={() => scrollToSection('pricing')} className="text-gray-700 hover:text-blue-600">Pricing</button>
            <button onClick={() => scrollToSection('faq')} className="text-gray-700 hover:text-blue-600">FAQ</button>
            {!checkingAuth && (
              <div className="flex items-center gap-3">
                {user ? (
                  <>
                    <button onClick={handleDashboard} className="px-4 py-2 rounded-md border border-slate-200">Dashboard</button>
                    {user.role === 'ADMIN' && (
                      <button onClick={handleAdminPanel} className="px-4 py-2 rounded-md bg-amber-500 text-white">Admin</button>
                    )}
                  </>
                ) : (
                  <>
                    <button onClick={handleLogin} className="px-4 py-2 rounded-md">Login</button>
                    <button onClick={handleGetStarted} className="px-4 py-2 rounded-full bg-slate-900 text-white">Get started</button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden border-t border-slate-100 bg-white">
            <div className="px-4 py-4 space-y-3">
              <Link href="/testers" onClick={() => setMobileMenuOpen(false)} className="block">Earn Money Testing</Link>
              <Link href="/hire-testers" onClick={() => setMobileMenuOpen(false)} className="block">Hire Testers</Link>
              <button onClick={() => scrollToSection('features')} className="block text-left w-full">Features</button>
              <button onClick={() => scrollToSection('pricing')} className="block text-left w-full">Pricing</button>
              <button onClick={() => scrollToSection('faq')} className="block text-left w-full">FAQ</button>
              {!checkingAuth && (
                <div className="pt-2 border-t border-slate-100">
                  {user ? (
                    <>
                      <button onClick={() => { setMobileMenuOpen(false); handleDashboard() }} className="w-full text-left">Dashboard</button>
                      {user.role === 'ADMIN' && <button onClick={() => { setMobileMenuOpen(false); handleAdminPanel() }} className="w-full text-left">Admin</button>}
                    </>
                  ) : (
                    <>
                      <button onClick={() => { setMobileMenuOpen(false); handleLogin() }} className="w-full text-left">Login</button>
                      <button onClick={() => { setMobileMenuOpen(false); handleGetStarted() }} className="w-full text-left">Get started</button>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </nav>
      {/* Founding Developer Banner */}
      <div className="bg-amber-400 text-gray-900 py-3 text-center font-semibold text-sm md:text-base">
        🚀 Founding Developer Pricing — First 20 customers only.
        <span className="hidden md:inline"> Regular price resumes after slots are filled.</span>
        <button onClick={() => scrollToSection('pricing')} className="underline ml-1 hover:text-blue-800">See prices →</button>
      </div>

      {/* Tester redirect banner */}
      <div className="bg-emerald-50 border-b border-emerald-200 py-3 px-4 text-center">
        <span className="text-sm text-emerald-800">
          👋 Looking to earn money testing apps?{' '}
          <Link href="/testers" className="font-semibold text-emerald-700 underline hover:text-emerald-900">
            Become a paid tester →
          </Link>
        </span>
      </div>

      <section className="bg-white border-b border-slate-200">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-16">
          <div className="grid gap-12 lg:grid-cols-[1.25fr_0.95fr] lg:items-center">
            <div>
              <p className="inline-flex rounded-full bg-blue-100 px-4 py-1 text-sm font-medium text-blue-700">
                Built for Google Play closed testing
              </p>
              <h1 className="mt-6 text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
                Stop losing your 14-day Play Console timer to dropouts.
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-700">
                Get 12 verified Android testers who stay opted in for the full 14 days — with automatic replacement if someone disappears. No more last-minute resets, no more fake “helpful” friends.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => setActive('developer')}
                  className={`rounded-full px-5 py-3 text-sm font-semibold transition ${active === 'developer' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
                >
                  For developers
                </button>
                <button
                  type="button"
                  onClick={() => setActive('tester')}
                  className={`rounded-full px-5 py-3 text-sm font-semibold transition ${active === 'tester' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
                >
                  For testers
                </button>
              </div>
              <div className="mt-8 grid gap-4 sm:grid-cols-2">
                <div className="rounded-3xl bg-slate-50 p-6">
                  <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">Fast results</p>
                  <p className="mt-3 text-3xl font-bold text-slate-900">12 testers</p>
                  <p className="mt-2 text-sm text-slate-600">Delivered in under 6 hours for developers.</p>
                </div>
                <div className="rounded-3xl bg-slate-50 p-6">
                  <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">Earn more</p>
                  <p className="mt-3 text-3xl font-bold text-slate-900">€2.30+</p>
                  <p className="mt-2 text-sm text-slate-600">Per completed 14-day app test for testers.</p>
                </div>
              </div>
              <div className="mt-8 rounded-3xl border border-slate-200 bg-slate-50 p-6">
                <p className="text-sm font-semibold text-slate-500">{active === 'developer' ? 'For developers' : 'For testers'}</p>
                <p className="mt-3 text-lg font-semibold text-slate-900">
                  {active === 'developer'
                    ? 'Get testers who actually stay in the closed test long enough to unlock production.'
                    : 'Earn money testing apps from your phone with real assignments, clear instructions, and reliable payouts.'}
                </p>
                <p className="mt-3 text-sm leading-6 text-slate-600">
                  {active === 'developer'
                    ? 'Post your app, paste the emails into Play Console, and keep the 14-day clock moving without scrambling to replace dropouts.'
                    : 'Install Android apps, follow simple daily missions, and submit honest feedback for every test.'}
                </p>
                <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
                  <Link
                    href={active === 'developer' ? '/hire-testers' : '/testers'}
                    className="inline-flex items-center justify-center rounded-full bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                  >
                    {active === 'developer' ? 'Hire testers' : 'Become a tester'}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                  <button
                    type="button"
                    onClick={() => scrollToSection('video')}
                    className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-900 transition hover:border-slate-400"
                  >
                    Watch explainer
                  </button>
                </div>
              </div>
            </div>
            <div className="relative isolate overflow-hidden rounded-[2rem] bg-slate-900 px-8 py-10 text-white shadow-2xl sm:px-10 sm:py-12">
              <div className="absolute inset-0 opacity-40 blur-2xl" style={{ background: 'radial-gradient(circle at top, rgba(56,189,248,0.35), transparent 35%), radial-gradient(circle at 100% 100%, rgba(99,102,241,0.2), transparent 25%)' }} />
              <div className="relative">
                <p className="text-sm font-medium uppercase tracking-[0.24em] text-cyan-200">Trusted by launch teams</p>
                <h2 className="mt-6 text-3xl font-bold tracking-tight">Developer-ready beta testing</h2>
                <p className="mt-4 text-base leading-7 text-slate-200">
                  Keep your Play Store beta on schedule with testers who understand Android app quality and device diversity.
                </p>
                <div className="mt-8 grid gap-4 sm:grid-cols-2">
                  <div className="rounded-3xl bg-white/10 p-5">
                    <p className="text-sm font-semibold text-cyan-100">Real device coverage</p>
                    <p className="mt-2 text-sm text-slate-200">Match apps with testers across Android versions, OEMs, and screen sizes.</p>
                  </div>
                  <div className="rounded-3xl bg-white/10 p-5">
                    <p className="text-sm font-semibold text-cyan-100">Synchronized feedback</p>
                    <p className="mt-2 text-sm text-slate-200">Review status updates, bug reports, and completion notes in one place.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="bg-slate-50 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-blue-700">How it works</p>
              <h2 className="mt-4 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                Beta testing built for the real risk: tester dropouts.
              </h2>
              <p className="mt-6 text-lg leading-8 text-slate-700">
                Get clear milestones, device coverage, and verified reports without losing the 14-day clock to people who vanish after day 3.
              </p>
              <div className="mt-10 grid gap-6">
                {steps.map((step) => (
                  <div key={step.title} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
                      <step.icon className="h-6 w-6" />
                    </div>
                    <h3 className="mt-5 text-xl font-semibold text-slate-900">{step.title}</h3>
                    <p className="mt-3 text-sm leading-6 text-slate-600">{step.description}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-[2rem] bg-white p-8 shadow-xl sm:p-10">
              <div className="mb-8 rounded-3xl bg-blue-50 p-6">
                <div className="flex items-center gap-3 text-blue-700">
                  <Sparkles className="h-5 w-5" />
                  <p className="text-sm font-semibold">Ready for launch day</p>
                </div>
                <p className="mt-4 text-base leading-7 text-slate-700">
                  We match your app to testers with Android device coverage, Play Store experience, and beta testing discipline.
                </p>
              </div>
              <div className="space-y-5">
                {features.map((feature) => (
                  <div key={feature.title} className="rounded-3xl border border-slate-200 p-5">
                    <div className="flex items-center gap-3 text-slate-900">
                      <feature.icon className="h-5 w-5 text-blue-600" />
                      <h3 className="text-base font-semibold">{feature.title}</h3>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-slate-600">{feature.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="video" className="bg-white py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-blue-700">See it in action</p>
              <h2 className="mt-4 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                Watch a quick walkthrough of the hiring and testing flow.
              </h2>
              <p className="mt-6 text-lg leading-8 text-slate-700">
                Learn how TestForPay helps developers publish faster and testers earn with simple Android assignments.
              </p>
            </div>
            <div className="mb-16 rounded-xl overflow-hidden shadow-2xl bg-black">
              <div className="relative w-full aspect-video">
                <iframe
                  width="100%"
                  height="100%"
                  src="https://www.youtube.com/embed/INxrn8tyxa0?rel=0&modestbranding=1"
                  title="TestForPay How It Works"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="w-full h-full"
                ></iframe>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">Why developers choose TestForPay</p>
              <h2 className="mt-4 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                Verified results, lower launch risk.
              </h2>
              <p className="mt-6 max-w-xl text-lg leading-8 text-slate-700">
                Maintain quality while scaling Play Store beta coverage with testers who are screened, monitored, and paid only for verified work.
              </p>
            </div>
            <div className="space-y-6">
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">Verified feedback</p>
                <p className="mt-3 text-lg font-semibold text-slate-900">Bug reports you can trust</p>
                <p className="mt-3 text-sm leading-6 text-slate-600">Each tester submission is reviewed for completeness and accuracy before payment.</p>
              </div>
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">Fewer revisions</p>
                <p className="mt-3 text-lg font-semibold text-slate-900">Reduce rework after launch</p>
                <p className="mt-3 text-sm leading-6 text-slate-600">Focus on issues that matter: crashes, Play Store policy risks, and usability gaps.</p>
              </div>
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">Payment control</p>
                <p className="mt-3 text-lg font-semibold text-slate-900">Only pay for approved tests</p>
                <p className="mt-3 text-sm leading-6 text-slate-600">Escrow-style workflow ensures you fund testing, not guesswork.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="pricing" className="bg-slate-50 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-blue-700">Pricing</p>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">Simple plans for developers and testers</h2>
            <p className="mt-4 text-lg leading-8 text-slate-700 max-w-2xl mx-auto">
              Choose the plan that fits your launch timeline, app size, and required device coverage.
            </p>
            <p className="mt-4 text-sm leading-6 text-slate-600 max-w-3xl mx-auto">
              The €28 Starter is a reliability premium: a broken 14-day test can delay your launch by weeks. Every plan includes the guarantee, automatic replacement, and proof that testers actually used the app.
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {pricingPlans.map((plan) => (
              <div key={plan.name} className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">{plan.name}</p>
                <div className="mt-4 flex items-baseline gap-3">
                  <p className="text-4xl font-extrabold text-slate-900">{plan.foundingPrice}</p>
                  <p className="text-sm text-slate-400 line-through">{plan.regularPrice}</p>
                </div>
                <p className="mt-4 text-sm leading-6 text-slate-600">{plan.description}</p>
                <div className="mt-8">
                  <Link
                    href="/hire-testers"
                    className="inline-flex w-full items-center justify-center rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                  >
                    Select plan
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Testimonials
            limit={6}
            title="What Developers Say"
            intro="Real feedback from indie developers and small teams who passed Google Play closed testing with TestForPay"
          />
        </div>
      </section>

      {/*<section className="bg-white py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-2">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-blue-700">Testimonials</p>
              <h2 className="mt-4 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">Trusted by developers and testers</h2>
              <p className="mt-6 text-lg leading-8 text-slate-700">
                Real testers earn extra income. Real developers launch with confidence. Hear what users say.
              </p>
            </div>

            
              <Testimonials limit={4} title="What people are saying" intro="Feedback from testers and developers using TestForPay." />
            
          </div>
        </div>
      </section>*/}

      {/* FAQ */}
            <section id="faq" className="bg-gray-50 py-20">
              <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                <h2 className="text-4xl font-bold text-center mb-4">Questions & Answers</h2>
                <p className="text-center text-gray-600 mb-6">Can't find your question? <a href="mailto:hello@testforpay.com" className="text-blue-600 hover:underline font-medium">Email us</a> and a real person will reply fast.</p>

                <div className="space-y-4">
                  <details className="bg-white p-6 rounded-lg shadow-sm">
                    <summary className="font-semibold cursor-pointer text-lg">How do I get your testers into my Play Console?</summary>
                    <div className="mt-4 text-gray-700 space-y-3">
                      <p>We have a step-by-step guide that covers exactly this:</p>
                      <a href="/guides/play-console-setup" className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 font-medium">
                        Read: How to Add Testers to Google Play Console →
                      </a>
                      <p className="text-sm text-gray-500 mt-2">
                        Short version: Copy tester emails from your TestForPay dashboard → paste into Play Console → copy the opt-in link back to TestForPay → testers join automatically. Takes about 3 minutes.
                      </p>
                    </div>
                  </details>

                  <details className="bg-white p-6 rounded-lg shadow-sm">
                    <summary className="font-semibold cursor-pointer text-lg">How do I become a paid tester on TestForPay?</summary>
                    <div className="mt-4 text-gray-700 space-y-3">
                      <p>It's free to sign up and takes about 5 minutes:</p>
                      <ol className="list-decimal list-inside space-y-2 ml-2">
                        <li>Create a free account and select <strong>"Tester"</strong> as your role</li>
                        <li>Browse available testing jobs on your dashboard</li>
                        <li>Apply to jobs that interest you — each shows the payment amount upfront</li>
                        <li>Once approved, install the app via Google Play and complete daily missions for 14 days</li>
                        <li>Get paid after the test completes — typically €2.30–€2.75 per test</li>
                      </ol>
                      <p className="mt-3">
                        <a href="/guides/tester-guide" className="text-blue-600 hover:underline font-medium">Read the complete tester guide →</a>
                      </p>
                    </div>
                  </details>

                  <details className="bg-white p-6 rounded-lg shadow-sm">
                    <summary className="font-semibold cursor-pointer text-lg">Is this allowed by Google Play?</summary>
                    <p className="mt-4 text-gray-700">Yes. Google Play requires 12 real users to join your closed test and stay opted in for 14 days. We connect you with real Android users who genuinely install your app and remain in the test. No bots, no fake accounts, no review manipulation. This is exactly what Google asks for.</p>
                  </details>

                  <details className="bg-white p-6 rounded-lg shadow-sm">
                    <summary className="font-semibold cursor-pointer text-lg">What exactly is the 14-day closed testing rule?</summary>
                    <p className="mt-4 text-gray-700">
                      Before you can publish to production, Google requires at least 12 testers to stay in your closed test for 14 full days. If too many testers leave before day 14, your testing period may reset. That's why keeping testers engaged matters — and why we pay them fairly so they don't drop out. <Link href="/guides/closed-testing-101" className="text-blue-600 hover:underline">Read our complete guide →</Link>
                    </p>
                  </details>

                  <details className="bg-white p-6 rounded-lg shadow-sm">
                    <summary className="font-semibold cursor-pointer text-lg">Are your testers real people or fake accounts?</summary>
                    <p className="mt-4 text-gray-700">They are 100% real people. Every tester verifies their email and Google Play account before joining. They use real Android devices. We track their opt-in status for the full 14 days to confirm they are genuinely participating. They are not developers trading favors, and they are not bots.</p>
                  </details>

                  <details className="bg-white p-6 rounded-lg shadow-sm">
                    <summary className="font-semibold cursor-pointer text-lg">Do testers need to live in my target country?</summary>
                    <p className="mt-4 text-gray-700">No. Google Play does not require testers to be in specific countries for closed testing. What matters is that they are real users with real devices. Our testers are spread across 40+ countries, which actually shows Google that your app works for a diverse audience.</p>
                  </details>

                  <details className="bg-white p-6 rounded-lg shadow-sm">
                    <summary className="font-semibold cursor-pointer text-lg">How quickly can testing start?</summary>
                    <p className="mt-4 text-gray-700">Most jobs are fully filled within 6 hours. Once you paste the tester emails into Play Console and share the opt-in link with us, testers start joining right away. You'll see live updates in your dashboard as each one opts in.</p>
                  </details>

                  <details className="bg-white p-6 rounded-lg shadow-sm">
                    <summary className="font-semibold cursor-pointer text-lg">Do I need to manage testers during the 14 days?</summary>
                    <p className="mt-4 text-gray-700">Not really. Your only job is to keep your app available in the closed test track and check your dashboard now and then. If a tester drops out, we alert you and replace them automatically on Growth and Pro plans. You never have to chase testers or message them one by one.</p>
                  </details>

                  <details className="bg-white p-6 rounded-lg shadow-sm">
                    <summary className="font-semibold cursor-pointer text-lg">What happens when the 14 days are done?</summary>
                    <p className="mt-4 text-gray-700">Once 12 testers have stayed opted in for 14 full days, you have met Google's requirement. You can then request production access in Play Console. We only release payment to testers after the 14 days are successfully completed. If you update your app later and need to test again, just post a new job.</p>
                  </details>

                  <details className="bg-white p-6 rounded-lg shadow-sm">
                    <summary className="font-semibold cursor-pointer text-lg">What do I actually get for €28?</summary>
                    <p className="mt-4 text-gray-700">On the Starter plan, you get 12 verified testers who join your closed test and stay for 14 days. You get a live dashboard to track who has joined and who is active. You get email support. And you get our approval guarantee — if Google rejects your app because of tester issues, we refund your full payment.</p>
                  </details>


                  <details className="bg-white p-6 rounded-lg shadow-sm">
                    <summary className="font-semibold cursor-pointer text-lg">What if Google rejects my app?</summary>
                    <p className="mt-4 text-gray-700">If Google rejects your app specifically because of tester problems — not enough real testers, suspicious accounts, or dropouts we failed to replace — we refund 100% of what you paid. This does not cover rejections caused by bugs in your app, policy violations, or mistakes in your Play Console setup.</p>
                  </details>

                  <details className="bg-white p-6 rounded-lg shadow-sm">
                    <summary className="font-semibold cursor-pointer text-lg">My last closed test failed. Can you help?</summary>
                    <p className="mt-4 text-gray-700">Yes. A lot of developers come to us after free tester groups or cheap services let them down. We can run a fresh test with our verified pool. Because we pay testers properly, they actually stick around for the full 14 days instead of disappearing on day 3.</p>
                  </details>

                  <details className="bg-white p-6 rounded-lg shadow-sm">
                    <summary className="font-semibold cursor-pointer text-lg">Can I test multiple apps?</summary>
                    <p className="mt-4 text-gray-700">Yes. Each app needs its own testing job, and each job is billed separately. If you publish apps regularly or run an agency, email us and we can set up a custom plan.</p>
                  </details>

                  <details className="bg-white p-6 rounded-lg shadow-sm">
                    <summary className="font-semibold cursor-pointer text-lg">What is the difference between internal and closed testing?</summary>
                    <p className="mt-4 text-gray-700">Internal testing is for your own team — up to 100 people, no 14-day rule. Closed testing is for external users and requires at least 12 testers for 14 continuous days before you can go to production. Google uses closed testing to make sure real people can install and use your app without problems.</p>
                  </details>


                  <details className="bg-white p-6 rounded-lg shadow-sm">
                    <summary className="font-semibold cursor-pointer text-lg">What if a tester leaves before day 14?</summary>
                    <p className="mt-4 text-gray-700">On Growth and Pro plans, we replace dropouts automatically at no extra cost. On Starter, you can buy replacement testers if needed. We check opt-in status every day and notify you immediately if someone leaves, so you are never surprised.</p>
                  </details>
                </div>
              </div>
            </section>

      <section className="bg-slate-50 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-[2rem] bg-white p-10 shadow-xl lg:p-14">
            <div className="grid gap-10 lg:grid-cols-[0.7fr_1.3fr] lg:items-center">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-blue-700">Start with confidence</p>
                <h2 className="mt-4 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                  Start your next Play Store beta with the right tester team.
                </h2>
                <p className="mt-6 text-lg leading-8 text-slate-700">
                  Launch faster and keep quality high with structured testing designed for Android apps and Google Play release cycles.
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-3xl bg-slate-50 p-6">
                  <p className="text-sm font-semibold text-slate-500">Easy setup</p>
                  <p className="mt-3 text-base text-slate-700">Describe your testing goals and we’ll match the right testers.</p>
                </div>
                <div className="rounded-3xl bg-slate-50 p-6">
                  <p className="text-sm font-semibold text-slate-500">Quality filtering</p>
                  <p className="mt-3 text-base text-slate-700">Testers are selected based on device fit and beta experience.</p>
                </div>
              </div>
            </div>
            <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:items-center">
              <Link
                href="/hire-testers"
                className="inline-flex items-center justify-center rounded-full bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                Hire testers
                  <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
              <Link
                href="/testers"
                className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-900 transition hover:border-slate-400"
              >
                Join as a tester
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-300 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center mb-4">
                <Image 
                  src="/images/logo-white.svg" 
                  alt="TestForPay" 
                  width={140} 
                  height={32}
                  className="h-8 w-auto"
                />
              </div>
              <p className="text-sm">Making Google Play closed testing simple and accessible for indie developers worldwide.</p>
            </div>

            <div>
              <h4 className="font-semibold text-white mb-4">Product</h4>
              <ul className="space-y-2 text-sm">
                <li><button onClick={() => scrollToSection('how-it-works')} className="hover:text-white">Features</button></li>
                <li><button onClick={() => scrollToSection('pricing')} className="hover:text-white">Pricing</button></li>
                <li><button onClick={() => scrollToSection('faq')} className="hover:text-white">FAQ</button></li>
                <li>
                  <a href="/guides/tester-guide" className="hover:text-white">How to earn money testing apps</a>
                </li>
                <li>
                  <a href="/signup?role=TESTER" className="hover:text-white">Sign up as a tester</a>
                </li>
              </ul>
            </div>


            <div>
              <h4 className="font-semibold text-white mb-4">Company</h4>
              <ul className="space-y-2 text-sm">
                <li><button onClick={handleLogin} className="hover:text-white">Sign In</button></li>
                <li><button onClick={handleGetStarted} className="hover:text-white">Sign Up</button></li>
                <li><Link href="/contact" className="hover:text-white">Contact</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-white mb-4">Legal</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="/privacy" className="hover:text-white">Privacy Policy</Link></li>
                <li><Link href="/terms" className="hover:text-white">Terms of Service</Link></li>
                <li><Link href="/refund" className="hover:text-white">Refund Policy</Link></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-800 mt-8 pt-8 text-sm text-center">
            <p>© 2026 TestForPay. All rights reserved.</p>
            <p className="mt-2">Made with ❤️ in Zambia by Evans Munsha</p>
            <p className="mt-1 text-gray-500">Questions? testforpays@gmail.com</p>
          </div>
        </div>
      </footer>
    </main>
  )
}
