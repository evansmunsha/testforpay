"use client"

import React, { useState } from 'react';
import Image from 'next/image';
import { Mail, CheckCircle, DollarSign, Users, Clock, Shield, ArrowRight, Menu, X } from 'lucide-react';

export default function LandingPage() {
  const [email, setEmail] = useState('');
  const [userType, setUserType] = useState('tester');
  const [submitted, setSubmitted] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleGetStarted = () => {
    // Store user type for signup page
    if (typeof window !== 'undefined') {
      localStorage.setItem('user_type', userType);
      window.location.href = '/signup';
    }
  };

  const handleLogin = () => {
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
  };

  const handleJoinWaitlist = (e: React.MouseEvent) => {
    e.preventDefault();
    if (email && typeof window !== 'undefined') {
      localStorage.setItem('waitlist_email', email);
      localStorage.setItem('user_type', userType);
      window.location.href = '/signup';
    }
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
              <a href="#how-it-works" className="text-gray-700 hover:text-blue-600">How It Works</a>
              <a href="#pricing" className="text-gray-700 hover:text-blue-600">Pricing</a>
              <a href="#faq" className="text-gray-700 hover:text-blue-600">FAQ</a>
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
              <a href="#how-it-works" className="block text-gray-700">How It Works</a>
              <a href="#pricing" className="block text-gray-700">Pricing</a>
              <a href="#faq" className="block text-gray-700">FAQ</a>
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
            </div>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="text-center lg:text-left">
            <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
              Meet Google Play's
              <span className="text-blue-600"> Testing Requirements</span>
              <br />in 24 Hours
            </h1>
            <p className="text-xl text-gray-600 mb-8">
              Connect with real testers instantly. Get your 20+ opted-in testers for 14-day closed testing and publish your app to production faster.
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
                I'm a Developer
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
                Get Started Free <ArrowRight className="h-5 w-5" />
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
                ? '🚀 Get 20+ testers in 24 hours • No upfront payment required'
                : '💰 Earn $5-$15 per app test • Get paid weekly'}
            </p>
          </div>

          {/* Hero Image */}
          <div className="hidden lg:block">
            <Image 
              src="/images/hero-main.svg" 
              alt="TestForPay - Connect Developers with Testers" 
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
              <div className="text-4xl font-bold text-blue-600">20+</div>
              <div className="text-gray-600 mt-2">Testers per Job</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-blue-600">14</div>
              <div className="text-gray-600 mt-2">Days Testing</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-blue-600">24h</div>
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
                  <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold">1</div>
                  <div>
                    <h4 className="font-semibold mb-1">Post Your Testing Job</h4>
                    <p className="text-gray-600">Add your app details, Google Play closed test link, and set your budget</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold">2</div>
                  <div>
                    <h4 className="font-semibold mb-1">Testers Apply & Opt-In</h4>
                    <p className="text-gray-600">Real users opt-in to your closed test on Google Play</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold">3</div>
                  <div>
                    <h4 className="font-semibold mb-1">Verify & Track Progress</h4>
                    <p className="text-gray-600">Monitor tester activity and opt-in status in real-time</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold">4</div>
                  <div>
                    <h4 className="font-semibold mb-1">Publish to Production</h4>
                    <p className="text-gray-600">After 14 days, meet Google's requirements and go live!</p>
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
                  <div className="flex-shrink-0 w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center text-purple-600 font-bold">1</div>
                  <div>
                    <h4 className="font-semibold mb-1">Browse Testing Jobs</h4>
                    <p className="text-gray-600">Find apps that match your interests and device</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center text-purple-600 font-bold">2</div>
                  <div>
                    <h4 className="font-semibold mb-1">Apply & Opt-In</h4>
                    <p className="text-gray-600">Join the closed test on Google Play and verify your opt-in</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center text-purple-600 font-bold">3</div>
                  <div>
                    <h4 className="font-semibold mb-1">Test for 14 Days</h4>
                    <p className="text-gray-600">Use the app naturally and provide honest feedback</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center text-purple-600 font-bold">4</div>
                  <div>
                    <h4 className="font-semibold mb-1">Get Paid</h4>
                    <p className="text-gray-600">Receive payment via PayPal or bank transfer</p>
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
          <h2 className="text-4xl font-bold text-center mb-16">Why Choose TestForPay?</h2>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white p-6 rounded-xl shadow-sm">
              <Clock className="h-12 w-12 text-blue-600 mb-4" />
              <h3 className="text-xl font-semibold mb-2">Fast Turnaround</h3>
              <p className="text-gray-600">Get your 20+ testers within 24 hours. No more waiting weeks to find testers.</p>
            </div>
            
            <div className="bg-white p-6 rounded-xl shadow-sm">
              <Shield className="h-12 w-12 text-blue-600 mb-4" />
              <h3 className="text-xl font-semibold mb-2">Verified Testers</h3>
              <p className="text-gray-600">All testers are verified real users who genuinely opt-in to your closed test.</p>
            </div>
            
            <div className="bg-white p-6 rounded-xl shadow-sm">
              <Users className="h-12 w-12 text-blue-600 mb-4" />
              <h3 className="text-xl font-semibold mb-2">Quality Feedback</h3>
              <p className="text-gray-600">Get valuable insights from real users testing your app for 14 days.</p>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm">
              <CheckCircle className="h-12 w-12 text-blue-600 mb-4" />
              <h3 className="text-xl font-semibold mb-2">Google Compliant</h3>
              <p className="text-gray-600">100% compliant with Google Play's closed testing requirements.</p>
            </div>
            
            <div className="bg-white p-6 rounded-xl shadow-sm">
              <DollarSign className="h-12 w-12 text-blue-600 mb-4" />
              <h3 className="text-xl font-semibold mb-2">Pay Per Success</h3>
              <p className="text-gray-600">Only pay for verified testers who complete the full 14-day period.</p>
            </div>
            
            <div className="bg-white p-6 rounded-xl shadow-sm">
              <Mail className="h-12 w-12 text-blue-600 mb-4" />
              <h3 className="text-xl font-semibold mb-2">Real-Time Updates</h3>
              <p className="text-gray-600">Track your testing progress with live notifications and dashboard updates.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl font-bold text-center mb-4">Simple, Transparent Pricing</h2>
          <p className="text-center text-gray-600 mb-16">Pay only for completed tests. No hidden fees.</p>
          
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <div className="bg-white rounded-xl shadow-lg p-8 border-2 border-gray-200">
              <h3 className="text-2xl font-bold mb-2">Starter</h3>
              <div className="text-4xl font-bold mb-4">$150</div>
              <p className="text-gray-600 mb-6">Perfect for indie developers</p>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span>20 verified testers</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span>14-day testing period</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span>Basic feedback reports</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span>Email support</span>
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
              <h3 className="text-2xl font-bold mb-2 text-white">Professional</h3>
              <div className="text-4xl font-bold mb-4 text-white">$250</div>
              <p className="text-blue-100 mb-6">For serious developers</p>
              <ul className="space-y-3 mb-8 text-white">
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5" />
                  <span>35 verified testers</span>
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
                  <span>Faster tester matching</span>
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
              <h3 className="text-2xl font-bold mb-2">Enterprise</h3>
              <div className="text-4xl font-bold mb-4">Custom</div>
              <p className="text-gray-600 mb-6">For agencies & teams coming soon</p>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span>50+ verified testers</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span>Custom testing duration</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span>Advanced analytics</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span>Dedicated account manager</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span>API access</span>
                </li>
              </ul>
              <button 
                onClick={handleGetStarted}
                className="w-full bg-gray-900 text-white py-3 rounded-lg hover:bg-gray-800"
              >
                Contact Sales
              </button>
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
              <p className="mt-3 text-gray-600">All testers must verify their email and Google Play account. We track opt-in status and activity throughout the 14-day period to ensure genuine participation.</p>
            </details>
            
            <details className="bg-white p-6 rounded-lg shadow-sm">
              <summary className="font-semibold cursor-pointer">Is this compliant with Google Play policies?</summary>
              <p className="mt-3 text-gray-600">Yes! We connect you with real users who genuinely opt-in to test your app. This fully complies with Google Play's closed testing requirements.</p>
            </details>
            
            <details className="bg-white p-6 rounded-lg shadow-sm">
              <summary className="font-semibold cursor-pointer">When do I pay?</summary>
              <p className="mt-3 text-gray-600">Payment is held in escrow and only released when testers complete the full 14-day testing period. You only pay for verified, completed tests.</p>
            </details>
            
            <details className="bg-white p-6 rounded-lg shadow-sm">
              <summary className="font-semibold cursor-pointer">How long until I get my 20 testers?</summary>
              <p className="mt-3 text-gray-600">Most testing jobs are fully filled within 24 hours. Our large pool of active testers ensures fast matching.</p>
            </details>

            <details className="bg-white p-6 rounded-lg shadow-sm">
              <summary className="font-semibold cursor-pointer">Can testers write reviews?</summary>
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
            Join thousands of developers who trust TestForPay to meet Google Play requirements.
          </p>
          <button
            onClick={handleGetStarted}
            className="bg-white text-blue-600 px-8 py-4 rounded-lg hover:bg-gray-100 font-semibold text-lg inline-flex items-center gap-2"
          >
            Get Started Free <ArrowRight className="h-5 w-5" />
          </button>
          <p className="text-blue-100 mt-4">No credit card required • Start in minutes</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-300 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center mb-4">
                <DollarSign className="h-6 w-6 text-blue-400" />
                <span className="ml-2 text-xl font-bold text-white">TestForPay</span>
              </div>
              <p className="text-sm">Making app testing simple and accessible for everyone.</p>
            </div>
            
            <div>
              <h4 className="font-semibold text-white mb-4">Product</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#how-it-works" className="hover:text-white">Features</a></li>
                <li><a href="#pricing" className="hover:text-white">Pricing</a></li>
                <li><a href="#faq" className="hover:text-white">FAQ</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold text-white mb-4">Company</h4>
              <ul className="space-y-2 text-sm">
                <li><button onClick={handleLogin} className="hover:text-white">Sign In</button></li>
                <li><button onClick={handleGetStarted} className="hover:text-white">Sign Up</button></li>
                <li><a href="/contact" className="hover:text-white">Contact</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold text-white mb-4">Legal</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="/privacy" className="hover:text-white">Privacy Policy</a></li>
                <li><a href="/terms" className="hover:text-white">Terms of Service</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-800 mt-8 pt-8 text-sm text-center">
            <p>© 2026 TestForPay. All rights reserved.</p>
            <p className="mt-2">Made with ❤️ in Zambia by Evans Munsha</p>
          </div>
        </div>
      </footer>
    </div>
  );
}