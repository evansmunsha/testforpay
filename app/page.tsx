
"use client"

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Mail, CheckCircle, DollarSign, Users, Clock, Shield, ArrowRight, Menu, X, LayoutDashboard, RefreshCw, Globe, Smartphone } from 'lucide-react';
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
    <div className="min-h-screen bg-linear-to-br from-blue-50 via-white to-purple-50">
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
                  Get Paid to Test
                  <span className="text-blue-600"> Android Apps</span>
                  <br /> From Your Phone
                </>
              )}
            </h1>
            <p className="text-xl text-gray-600 mb-8">
              {userType === 'developer'
                ? 'Connect with verified real Android users for Google Play closed testing. Genuine opt-ins, diverse devices, and full compliance — so you can publish faster.'
                : 'Developers pay you to try their apps before they go live. Install the app, use it for 14 days, get paid. No experience needed — just an Android phone.'}
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
                I\\'m a Developer
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
                {userType === 'developer' ? 'Start from $19' : 'Start Earning'} <ArrowRight className="h-5 w-5" />
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
                ? '12 testers • 14-day testing • Pay only when testing completes • Approval guarantee'
                : 'Earn $5–$15 per app • Paid via PayPal or bank transfer • No experience needed'}
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
                    <h4 className="font-semibold mb-1">Testers Apply & Opt-In</h4>
                    <p className="text-gray-600">Real users opt-in to your closed test on Google Play within hours</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="shrink-0 w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold">3</div>
                  <div>
                    <h4 className="font-semibold mb-1">Track Progress in Real Time</h4>
                    <p className="text-gray-600">Monitor tester opt-in status, engagement, and dropout alerts on your dashboard</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="shrink-0 w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold">4</div>
                  <div>
                    <h4 className="font-semibold mb-1">Publish to Production</h4>
                    <p className="text-gray-600">After 14 days, meet Google\\'s requirements and go live. Not approved? We refund you.</p>
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
                    <p className="text-gray-600">Receive payment via PayPal or bank transfer after the testing period</p>
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
            
            <div className="bg-white p-6 rounded-xl shadow-sm">
              <Smartphone className="h-12 w-12 text-blue-600 mb-4" />
              <h3 className="text-xl font-semibold mb-2">Live Dashboard</h3>
              <p className="text-gray-600">Track opt-in status, device diversity, and tester engagement in real time from one place.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl font-bold text-center mb-4">Simple, Transparent Pricing</h2>
          <p className="text-center text-gray-600 mb-16">Pay only for completed tests. No hidden fees. Approval guaranteed or your money back.</p>
          
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <div className="bg-white rounded-xl shadow-lg p-8 border-2 border-gray-200">
              <h3 className="text-2xl font-bold mb-2">Starter</h3>
              <div className="text-4xl font-bold mb-4">$19</div>
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
              <div className="text-4xl font-bold mb-4 text-white">$39</div>
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
            we\\'ll refund 100% of your payment. No questions asked. We\\'ve never had to use it — 
            but it\\'s there so you can buy with confidence.
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
      <section className="py-20 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl font-bold text-center mb-4">Real Users. Real Opt-ins. Real Compliance.</h2>
          <p className="text-center text-gray-600 mb-12 max-w-2xl mx-auto">
            Google Play wants genuine users testing your app — not developers swapping favors. Here\\'s how we deliver that.
          </p>
          <div className="grid md:grid-cols-2 gap-6">
            {/* Free swap platforms */}
            <div className="rounded-2xl border-2 border-gray-200 p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 font-bold text-lg">≠</div>
                <h3 className="text-xl font-bold text-gray-700">Developer Swap Groups</h3>
              </div>
              <ul className="space-y-3">
                {[
                  'Testers are other developers, not real end users',
                  'Accounts share similar IPs and device patterns',
                  'No financial motivation — testers drop off early',
                  'No tracking or replacement if someone leaves',
                  'Risk of account association by Google',
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm text-gray-600">
                    <span className="text-red-400 mt-0.5 shrink-0">✗</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            {/* TestForPay */}
            <div className="rounded-2xl border-2 border-blue-500 p-8 relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-xs font-semibold px-3 py-1 rounded-full">TestForPay</div>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-lg">✓</div>
                <h3 className="text-xl font-bold text-blue-700">Verified Real Users</h3>
              </div>
              <ul className="space-y-3">
                {[
                  'Real Android users from 40+ countries',
                  'Diverse devices, IPs, and locations',
                  'Paid testers stay opted in for the full 14 days',
                  'Live dashboard + automatic dropout replacement',
                  'Google-compliant: genuine users, genuine opt-ins',
                  'Escrow payments — pay only when testing completes',
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm text-gray-700">
                    <span className="text-green-500 mt-0.5 shrink-0">✓</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="bg-gray-50 py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl font-bold text-center mb-16">Frequently Asked Questions</h2>
          
          <div className="space-y-6">
            <details className="bg-white p-6 rounded-lg shadow-sm">
              <summary className="font-semibold cursor-pointer">How does TestForPay ensure testers are real?</summary>
              <p className="mt-3 text-gray-600">All testers must verify their email and Google Play account. We track opt-in status and activity throughout the 14-day period to ensure genuine participation. Testers are paid only after completing the full period, so they have real motivation to stay engaged.</p>
            </details>
            
            <details className="bg-white p-6 rounded-lg shadow-sm">
              <summary className="font-semibold cursor-pointer">Is this compliant with Google Play policies?</summary>
              <p className="mt-3 text-gray-600">Yes. We connect you with real users who genuinely opt-in to test your app. This fully complies with Google Play\\'s closed testing requirements. We do not incentivize public reviews or ratings.</p>
            </details>
            
            <details className="bg-white p-6 rounded-lg shadow-sm">
              <summary className="font-semibold cursor-pointer">When do I pay?</summary>
              <p className="mt-3 text-gray-600">Payment is held in escrow when you post your job and only released when testers complete the full 14-day testing period. You only pay for verified, completed tests. If testing fails due to our fault, you get a full refund.</p>
            </details>
            
            <details className="bg-white p-6 rounded-lg shadow-sm">
              <summary className="font-semibold cursor-pointer">How long until I get my 12 testers?</summary>
              <p className="mt-3 text-gray-600">Most testing jobs are fully filled within 6 hours. Our large pool of active testers across 40+ countries ensures fast matching, even for niche apps.</p>
            </details>

            <details className="bg-white p-6 rounded-lg shadow-sm">
              <summary className="font-semibold cursor-pointer">What if a tester drops out before day 14?</summary>
              <p className="mt-3 text-gray-600">On our Growth and Pro plans, we automatically replace dropouts at no extra cost. On the Starter plan, you can purchase replacements individually. We monitor opt-in status daily and alert you immediately if someone leaves.</p>
            </details>

            <details className="bg-white p-6 rounded-lg shadow-sm">
              <summary className="font-semibold cursor-pointer">What is the approval guarantee?</summary>
              <p className="mt-3 text-gray-600">If Google Play rejects your app specifically due to tester compliance issues (e.g., not enough genuine testers, suspicious account patterns) after you used TestForPay correctly, we refund 100% of your payment. This does not cover rejections due to app quality, policy violations, or incorrect setup on your end.</p>
            </details>

            <details className="bg-white p-6 rounded-lg shadow-sm">
              <summary className="font-semibold cursor-pointer">Can testers write public reviews?</summary>
              <p className="mt-3 text-gray-600">Testers provide feedback to you directly through our platform. We do not incentivize public reviews to maintain Google Play policy compliance.</p>
            </details>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-blue-600 py-20">
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
            Start from $19 <ArrowRight className="h-5 w-5" />
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