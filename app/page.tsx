"use client"

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Mail, CheckCircle, DollarSign, Users, Clock, Shield, ArrowRight, Menu, X, LayoutDashboard, RefreshCw, Globe, Smartphone, Heart, TrendingUp } from 'lucide-react';
import { Testimonials } from '@/components/feedback/testimonials';

interface User {
  id: string;
  email: string;
  name?: string;
  role: 'DEVELOPER' | 'TESTER' | 'ADMIN';
}

export default function LandingPage() {
  const [userType, setUserType] = useState('developer');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetch('/api/auth/session')
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data?.user) {
          setUser(data.user);
        }
      })
      .catch(() => {})
      .finally(() => setCheckingAuth(false));
  }, []);

  const handleGetStarted = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('user_type', userType);
      router.push('/signup');
    }
  };

  const handleLogin = () => {
    if (typeof window !== 'undefined') {
      router.push('/login');
    }
  };

  const handleDashboard = () => {
    if (typeof window !== 'undefined') {
      if (user?.role === 'TESTER') {
        router.push('/dashboard/browse');
      } else {
        router.push('/dashboard');
      }
    }
  };

  const handleAdminPanel = () => {
    if (typeof window !== 'undefined') {
      router.push('/dashboard/admin');
    }
  };

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
    setMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Navigation */}
      <nav className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Image 
                src="/images/logo.svg" 
                alt="TestForPay" 
                width={180} 
                height={40}
                className="h-10 w-auto"
              />
            </div>

            {/* Desktop Menu */}
            <div className="hidden md:flex items-center space-x-8">
              <button onClick={() => scrollToSection('how-it-works')} className="text-gray-700 hover:text-blue-600">How It Works</button>
              <button onClick={() => scrollToSection('pricing')} className="text-gray-700 hover:text-blue-600">Pricing</button>
              <button onClick={() => scrollToSection('faq')} className="text-gray-700 hover:text-blue-600">FAQ</button>

              {checkingAuth ? (
                <div className="w-20 h-8 bg-gray-100 rounded animate-pulse" />
              ) : user ? (
                <>
                  {user.role === 'ADMIN' && (
                    <button 
                      onClick={handleAdminPanel}
                      className="text-purple-600 hover:text-purple-700 font-medium"
                    >
                      Admin Panel
                    </button>
                  )}
                  <button 
                    onClick={handleDashboard}
                    className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
                  >
                    <LayoutDashboard className="h-4 w-4" />
                    Dashboard
                  </button>
                </>
              ) : (
                <>
                  <button 
                    onClick={handleLogin}
                    className="text-gray-700 hover:text-blue-600"
                  >
                    Log In
                  </button>
                  <button 
                    onClick={handleGetStarted}
                    className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
                  >
                    Get Started
                  </button>
                </>
              )}
            </div>

            {/* Mobile Menu Button */}
            <button 
              className="md:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X /> : <Menu />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-t">
            <div className="px-4 py-4 space-y-3">
              <button onClick={() => scrollToSection('how-it-works')} className="block w-full text-left text-gray-700">How It Works</button>
              <button onClick={() => scrollToSection('pricing')} className="block w-full text-left text-gray-700">Pricing</button>
              <button onClick={() => scrollToSection('faq')} className="block w-full text-left text-gray-700">FAQ</button>

              {user ? (
                <>
                  {user.role === 'ADMIN' && (
                    <button 
                      onClick={handleAdminPanel}
                      className="block w-full text-left text-purple-600 font-medium"
                    >
                      Admin Panel
                    </button>
                  )}
                  <button 
                    onClick={handleDashboard}
                    className="w-full bg-blue-600 text-white px-6 py-2 rounded-lg flex items-center justify-center gap-2"
                  >
                    <LayoutDashboard className="h-4 w-4" />
                    Dashboard
                  </button>
                </>
              ) : (
                <>
                  <button 
                    onClick={handleLogin}
                    className="block w-full text-left text-gray-700"
                  >
                    Log In
                  </button>
                  <button 
                    onClick={handleGetStarted}
                    className="w-full bg-blue-600 text-white px-6 py-2 rounded-lg"
                  >
                    Get Started
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="text-center lg:text-left">
            <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
              {userType === 'developer' ? (
                <>
                  Get 12 Real Testers
                  <span className="text-blue-600"> in 24 Hours</span>
                  <br /> — Publish in 14 Days
                </>
              ) : (
                <>
                  Get Paid Fairly to Test
                  <span className="text-blue-600"> Android Apps</span>
                  <br /> From Your Phone
                </>
              )}
            </h1>
            <p className="text-xl text-gray-600 mb-8">
              {userType === 'developer'
                ? 'Connect with verified real Android users for Google Play closed testing. Fair pay keeps testers engaged for the full 14 days, so you meet requirements and publish on schedule.'
                : 'Developers pay you to try their apps before they go live. Install the app, use it for 14 days, get paid $2.50–$3.00 per test. No experience needed — just an Android phone.'}
            </p>

            {/* User Type Selection */}
            <div className="flex justify-center lg:justify-start gap-4 mb-8">
              <button
                onClick={() => setUserType('developer')}
                className={`px-8 py-3 rounded-lg font-semibold transition ${
                  userType === 'developer'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                I\'m a Developer
              </button>
              <button
                onClick={() => setUserType('tester')}
                className={`px-8 py-3 rounded-lg font-semibold transition ${
                  userType === 'tester'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                I Want to Test Apps
              </button>
            </div>

            {/* CTA Buttons */}
            <div className="flex justify-center lg:justify-start gap-4 mb-4">
              <button
                onClick={handleGetStarted}
                className="bg-blue-600 text-white px-8 py-4 rounded-lg hover:bg-blue-700 font-semibold text-lg flex items-center gap-2"
              >
                {userType === 'developer' ? 'Start from $35' : 'Start Earning'} <ArrowRight className="h-5 w-5" />
              </button>
              <button
                onClick={handleLogin}
                className="bg-white text-blue-600 border-2 border-blue-600 px-8 py-4 rounded-lg hover:bg-blue-50 font-semibold text-lg"
              >
                Sign In
              </button>
            </div>

            <p className="text-sm text-gray-500">
              {userType === 'developer' 
                ? '12 testers • 14-day testing • Approval guarantee • Pay only on success'
                : 'Earn $2.50–$3.00 per app • Paid via PayPal or bank transfer • No experience needed'}
            </p>
          </div>

          {/* Hero Image */}
          <div className="hidden lg:block">
            <Image 
              src="/images/hero-main.svg" 
              alt="TestForPay connects developers with real Android testers" 
              width={600} 
              height={500}
              className="w-full h-auto"
              priority
            />
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="bg-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold text-blue-600">12+</div>
              <div className="text-gray-600 mt-2">Testers per Job</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-blue-600">14</div>
              <div className="text-gray-600 mt-2">Days Testing</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-blue-600">&lt;6h</div>
              <div className="text-gray-600 mt-2">Avg. Fill Time</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-blue-600">100%</div>
              <div className="text-gray-600 mt-2">Google Compliant</div>
            </div>
          </div>
        </div>
      </section>

      {/* Fair Pay Banner */}
      

      {/* How It Works */}
      <section id="how-it-works" className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl font-bold text-center mb-16">How It Works</h2>

          {/* Video Section */}
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

          {/* Text Summary Below Video */}
          <div className="text-center mb-16 max-w-3xl mx-auto">
            <p className="text-lg text-gray-700 leading-relaxed">
              Watch how TestForPay makes Google Play compliance simple. Post your app, connect with verified testers, 
              meet requirements fast, and publish with confidence.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-12">
            {/* For Developers */}
            <div className="bg-white rounded-xl shadow-lg p-8">
              <div className="flex items-center gap-4 mb-6">
                <Image 
                  src="/images/hero-developer.svg" 
                  alt="Developer" 
                  width={60} 
                  height={60}
                  className="rounded-lg"
                />
                <h3 className="text-2xl font-bold text-blue-600">For Developers</h3>
              </div>
              <div className="space-y-6">
                <div className="flex gap-4">
                  <div className="shrink-0 w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold">1</div>
                  <div>
                    <h4 className="font-semibold mb-1">Post Your Testing Job</h4>
                    <p className="text-gray-600">Add your app details, Google Play closed test link, and pick your plan</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="shrink-0 w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold">2</div>
                  <div>
                    <h4 className="font-semibold mb-1">Add Testers to Play Console</h4>
                    <p className="text-gray-600">We send you a list of verified tester emails. You paste them into your Play Console closed testing track — takes about 3 minutes.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="shrink-0 w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold">3</div>
                  <div>
                    <h4 className="font-semibold mb-1">Testers Opt-In & You Track Progress</h4>
                    <p className="text-gray-600">Testers click your opt-in link and join your closed test. You monitor who has joined, who is active, and who has dropped out — all in one dashboard.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="shrink-0 w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold">4</div>
                  <div>
                    <h4 className="font-semibold mb-1">Publish to Production</h4>
                    <p className="text-gray-600">After 14 days, meet Google\'s requirements and go live. Not approved? We refund you.</p>
                  </div>
                </div>
              </div>
              <button
                onClick={handleGetStarted}
                className="w-full mt-6 bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 font-semibold"
              >
                Start as Developer
              </button>
            </div>

            {/* For Testers */}
            <div className="bg-white rounded-xl shadow-lg p-8">
              <div className="flex items-center gap-4 mb-6">
                <Image 
                  src="/images/hero-tester.svg" 
                  alt="Tester" 
                  width={60} 
                  height={60}
                  className="rounded-lg"
                />
                <h3 className="text-2xl font-bold text-purple-600">For Testers</h3>
              </div>
              <div className="space-y-6">
                <div className="flex gap-4">
                  <div className="shrink-0 w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center text-purple-600 font-bold">1</div>
                  <div>
                    <h4 className="font-semibold mb-1">Browse Testing Jobs</h4>
                    <p className="text-gray-600">Find apps that match your interests and device</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="shrink-0 w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center text-purple-600 font-bold">2</div>
                  <div>
                    <h4 className="font-semibold mb-1">Apply & Opt-In</h4>
                    <p className="text-gray-600">Join the closed test on Google Play and verify your opt-in</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="shrink-0 w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center text-purple-600 font-bold">3</div>
                  <div>
                    <h4 className="font-semibold mb-1">Test for 14 Days</h4>
                    <p className="text-gray-600">Use the app naturally and provide honest feedback</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="shrink-0 w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center text-purple-600 font-bold">4</div>
                  <div>
                    <h4 className="font-semibold mb-1">Get Paid</h4>
                    <p className="text-gray-600">Receive $2.50–$3.00 per completed test via PayPal or bank transfer</p>
                  </div>
                </div>
              </div>
              <button
                onClick={handleGetStarted}
                className="w-full mt-6 bg-purple-600 text-white py-3 rounded-lg hover:bg-purple-700 font-semibold"
              >
                Start as Tester
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="bg-gray-50 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl font-bold text-center mb-16">Why Developers Choose TestForPay</h2>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white p-6 rounded-xl shadow-sm">
              <Heart className="h-12 w-12 text-rose-500 mb-4" />
              <h3 className="text-xl font-semibold mb-2">Fair Pay = Real Retention</h3>
              <p className="text-gray-600">We pay testers $2.50–$3.00 per test — 2× what competitors pay. That\'s why our testers stay opted in for the full 14 days.</p>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm">
              <Clock className="h-12 w-12 text-blue-600 mb-4" />
              <h3 className="text-xl font-semibold mb-2">Filled in Under 6 Hours</h3>
              <p className="text-gray-600">Our active tester pool means most jobs hit 12 opt-ins in under 6 hours — not days.</p>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm">
              <Globe className="h-12 w-12 text-blue-600 mb-4" />
              <h3 className="text-xl font-semibold mb-2">Testers from 40+ Countries</h3>
              <p className="text-gray-600">Real users on real devices across diverse locations — exactly what Google wants to see.</p>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm">
              <RefreshCw className="h-12 w-12 text-blue-600 mb-4" />
              <h3 className="text-xl font-semibold mb-2">Dropout Replacement Guarantee</h3>
              <p className="text-gray-600">If a tester drops out before day 14, we replace them at no extra cost. You always finish with 12.</p>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm">
              <CheckCircle className="h-12 w-12 text-blue-600 mb-4" />
              <h3 className="text-xl font-semibold mb-2">Approval or Full Refund</h3>
              <p className="text-gray-600">If Google rejects your app due to tester issues after using our service, we refund 100% of your payment.</p>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm">
              <DollarSign className="h-12 w-12 text-blue-600 mb-4" />
              <h3 className="text-xl font-semibold mb-2">Pay Only on Success</h3>
              <p className="text-gray-600">Your payment is held in escrow and only released after testers complete the full 14-day period.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl font-bold text-center mb-4">Simple, Transparent Pricing</h2>
          <p className="text-center text-gray-600 mb-16">
            Fair pay for testers. Fair price for you. Approval guaranteed or your money back.
          </p>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <div className="bg-white rounded-xl shadow-lg p-8 border-2 border-gray-200">
              <h3 className="text-2xl font-bold mb-2">Starter</h3>
              <div className="text-4xl font-bold mb-4">$35</div>
              <p className="text-gray-600 mb-6">Perfect for first-time publishers</p>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span>12 verified testers</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span>14-day testing period</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span>Basic dashboard tracking</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span>Email support</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span>Approval guarantee</span>
                </li>
              </ul>
              <div className="bg-amber-50 rounded-lg p-3 mb-6 text-sm text-amber-800">
                <TrendingUp className="h-4 w-4 inline mr-1" />
                Testers earn <strong>$2.50 each</strong> for 14 days of testing
              </div>
              <button 
                onClick={handleGetStarted}
                className="w-full bg-gray-900 text-white py-3 rounded-lg hover:bg-gray-800"
              >
                Get Started
              </button>
            </div>

            <div className="bg-blue-600 rounded-xl shadow-lg p-8 border-2 border-blue-700 transform scale-105 relative">
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 bg-yellow-400 text-gray-900 px-4 py-1 rounded-full text-sm font-semibold">
                Most Popular
              </div>
              <h3 className="text-2xl font-bold mb-2 text-white">Growth</h3>
              <div className="text-4xl font-bold mb-4 text-white">$49</div>
              <p className="text-blue-100 mb-6">For developers shipping regularly</p>
              <ul className="space-y-3 mb-8 text-white">
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5" />
                  <span>15 verified testers</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5" />
                  <span>14-day testing period</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5" />
                  <span>Detailed feedback reports</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5" />
                  <span>Priority support</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5" />
                  <span>Dropout replacement</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5" />
                  <span>Approval guarantee</span>
                </li>
              </ul>
              <div className="bg-blue-500 rounded-lg p-3 mb-6 text-sm text-white">
                <TrendingUp className="h-4 w-4 inline mr-1" />
                Testers earn <strong>$3.00 each</strong> for 14 days of testing
              </div>
              <button 
                onClick={handleGetStarted}
                className="w-full bg-white text-blue-600 py-3 rounded-lg hover:bg-gray-100 font-semibold"
              >
                Get Started
              </button>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-8 border-2 border-gray-200">
              <h3 className="text-2xl font-bold mb-2">Pro</h3>
              <div className="text-4xl font-bold mb-4">$79</div>
              <p className="text-gray-600 mb-6">Maximum safety & insights</p>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span>25 verified testers</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span>14-day testing period</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span>Advanced analytics</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span>Dedicated support</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span>Dropout replacement</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span>Approval guarantee</span>
                </li>
              </ul>
              <div className="bg-amber-50 rounded-lg p-3 mb-6 text-sm text-amber-800">
                <TrendingUp className="h-4 w-4 inline mr-1" />
                Testers earn <strong>$3.00 each</strong> — 25 testers = $75 to the community
              </div>
              <button 
                onClick={handleGetStarted}
                className="w-full bg-gray-900 text-white py-3 rounded-lg hover:bg-gray-800"
              >
                Get Started
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Guarantee Banner */}
      <section className="bg-green-50 py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <Shield className="h-16 w-16 text-green-600 mx-auto mb-6" />
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Approval Guarantee</h2>
          <p className="text-lg text-gray-700 mb-6">
            If Google Play rejects your app due to tester compliance issues after using TestForPay, 
            we\'ll refund 100% of your payment. No questions asked. We\'ve never had to use it — 
            but it\'s there so you can buy with confidence.
          </p>
          <button
            onClick={() => scrollToSection('faq')}
            className="text-green-700 font-semibold hover:underline"
          >
            Read the full guarantee terms in our FAQ →
          </button>
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

      {/* Comparison Section */}
      

      {/* FAQ */}
      <section id="faq" className="bg-gray-50 py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl font-bold text-center mb-4">Questions & Answers</h2>
          <p className="text-center text-gray-600 mb-6">Can't find your question? <a href="mailto:hello@testforpay.com" className="text-blue-600 hover:underline font-medium">Email us</a> and a real person will reply fast.</p>

          <div className="space-y-4">
            <details className="bg-white p-6 rounded-lg shadow-sm">
              <summary className="font-semibold cursor-pointer text-lg">How do I get your testers into my Play Console?</summary>
              <div className="mt-4 text-gray-700 space-y-3">
                <p>It takes about 3 minutes:</p>
                <ol className="list-decimal list-inside space-y-2 ml-2">
                  <li>Go to <strong>Google Play Console → Testing → Closed testing</strong> and open your track.</li>
                  <li>In the <strong>Testers</strong> tab, create an email list.</li>
                  <li>In your TestForPay dashboard, click 'View tester emails' for your job. You'll see the list of verified testers who applied. Copy those emails and paste them into your Play Console list, then save.</li>
                  <li>Google will show you an <strong>opt-in link</strong> on the same page. Copy that link and paste it into your TestForPay dashboard.</li>
                  <li>Our testers use that link to join your closed test. That's it — you're done.</li>
                </ol>
                <p className="text-sm text-gray-500 mt-3">If the opt-in link doesn't show up or your console looks different, email us a screenshot and we'll walk you through it.</p>
              </div>
            </details>

            <details className="bg-white p-6 rounded-lg shadow-sm">
              <summary className="font-semibold cursor-pointer text-lg">Is this allowed by Google Play?</summary>
              <p className="mt-4 text-gray-700">Yes. Google Play requires 12 real users to join your closed test and stay opted in for 14 days. We connect you with real Android users who genuinely install your app and remain in the test. No bots, no fake accounts, no review manipulation. This is exactly what Google asks for.</p>
            </details>

            <details className="bg-white p-6 rounded-lg shadow-sm">
              <summary className="font-semibold cursor-pointer text-lg">What exactly is the 14-day closed testing rule?</summary>
              <p className="mt-4 text-gray-700">Before you can publish to production, Google requires at least 12 testers to stay in your closed test for 14 full days. If too many testers leave before day 14, your testing period may reset. That's why keeping testers engaged matters — and why we pay them fairly so they don't drop out.</p>
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
              <summary className="font-semibold cursor-pointer text-lg">What do I actually get for $35?</summary>
              <p className="mt-4 text-gray-700">On the Starter plan, you get 12 verified testers who join your closed test and stay for 14 days. You get a live dashboard to track who has joined and who is active. You get email support. And you get our approval guarantee — if Google rejects your app because of tester issues, we refund your full payment.</p>
            </details>

            <details className="bg-white p-6 rounded-lg shadow-sm">
              <summary className="font-semibold cursor-pointer text-lg">How do I pay? How do testers get paid?</summary>
              <p className="mt-4 text-gray-700">You pay by card through Stripe when you post your job. Your money sits in escrow and is only released after the 14-day testing period is complete. Testers are paid via PayPal or bank transfer, whichever works for them. If testing fails, you get your money back.</p>
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
              <summary className="font-semibold cursor-pointer text-lg">How much do testers earn?</summary>
              <p className="mt-4 text-gray-700">Testers earn $2.50 per completed test on Starter and $3.00 on Growth and Pro. They are only paid after finishing the full 14 days. Payments go straight to their PayPal or bank account.</p>
            </details>

            <details className="bg-white p-6 rounded-lg shadow-sm">
              <summary className="font-semibold cursor-pointer text-lg">What if a tester leaves before day 14?</summary>
              <p className="mt-4 text-gray-700">On Growth and Pro plans, we replace dropouts automatically at no extra cost. On Starter, you can buy replacement testers if needed. We check opt-in status every day and notify you immediately if someone leaves, so you are never surprised.</p>
            </details>
          </div>
        </div>
      </section><section className="bg-blue-600 py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-bold text-white mb-6">
            Ready to Publish Your App?
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            Join developers who use TestForPay to meet Google Play requirements quickly and safely.
          </p>
          <button
            onClick={handleGetStarted}
            className="bg-white text-blue-600 px-8 py-4 rounded-lg hover:bg-gray-100 font-semibold text-lg inline-flex items-center gap-2"
          >
            Start from $35 <ArrowRight className="h-5 w-5" />
          </button>
          <p className="text-blue-100 mt-4">Approval guaranteed or your money back</p>
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
            <p className="mt-1 text-gray-500">Questions? hello@testforpay.com</p>
          </div>
        </div>
      </footer>
    </div>
  );
}