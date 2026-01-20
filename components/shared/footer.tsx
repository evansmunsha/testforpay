import Link from 'next/link'
import { Mail, Phone } from 'lucide-react'

export function Footer() {
  return (
    <footer className="bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="md:col-span-1">
            <Link href="/" className="flex items-center gap-2 mb-4">
              <img src="/icons/icon.svg" alt="TestForPay" className="h-10 w-10" />
              <span className="text-xl font-bold">TestForPay</span>
            </Link>
            <p className="text-gray-400 text-sm">
              Connect with app developers who need verified Google Play testers. 
              Earn money by testing apps.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-semibold mb-4">Quick Links</h3>
            <ul className="space-y-2 text-gray-400">
              <li>
                <Link href="/login" className="hover:text-white transition">
                  Log In
                </Link>
              </li>
              <li>
                <Link href="/signup" className="hover:text-white transition">
                  Sign Up
                </Link>
              </li>
              <li>
                <Link href="/dashboard/browse" className="hover:text-white transition">
                  Browse Jobs
                </Link>
              </li>
              <li>
                <Link href="/dashboard/jobs/new" className="hover:text-white transition">
                  Post a Job
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="font-semibold mb-4">Legal</h3>
            <ul className="space-y-2 text-gray-400">
              <li>
                <Link href="/privacy" className="hover:text-white transition">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="hover:text-white transition">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link href="/contact" className="hover:text-white transition">
                  Contact Us
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="font-semibold mb-4">Contact</h3>
            <ul className="space-y-3 text-gray-400">
              <li className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                <a href="mailto:evansensteen@gmail.com" className="hover:text-white transition">
                  evansensteen@gmail.com
                </a>
              </li>
              <li className="flex items-center gap-2">
                <Phone className="h-4 w-4" />
                <a href="tel:+260963266937" className="hover:text-white transition">
                  +260 963 266 937
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-8 pt-8 flex flex-col md:flex-row justify-between items-center text-gray-400 text-sm">
          <p>&copy; {new Date().getFullYear()} TestForPay. All rights reserved.</p>
          <p className="mt-2 md:mt-0">Made with ❤️ in Zambia by Evans Munsha</p>
        </div>
      </div>
    </footer>
  )
}
