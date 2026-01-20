'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { 
  LayoutDashboard, 
  Briefcase, 
  FileText, 
  CreditCard, 
  Settings,
  Search,
  DollarSign,
  Shield,
  X
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface SidebarProps {
  userRole: 'DEVELOPER' | 'TESTER' | 'ADMIN'
  isOpen?: boolean
  onClose?: () => void
}

export function Sidebar({ userRole, isOpen = true, onClose }: SidebarProps) {
  const pathname = usePathname()

  const developerLinks = [
    {
      href: '/dashboard',
      label: 'Overview',
      icon: LayoutDashboard,
    },
    {
      href: '/dashboard/jobs',
      label: 'My Jobs',
      icon: Briefcase,
    },
    {
      href: '/dashboard/payments',
      label: 'Payments',
      icon: CreditCard,
    },
    {
      href: '/dashboard/settings',
      label: 'Settings',
      icon: Settings,
    },
  ]

  const testerLinks = [
    {
      href: '/dashboard/browse',
      label: 'Browse Jobs',
      icon: Search,
    },
    {
      href: '/dashboard/applications',
      label: 'My Applications',
      icon: FileText,
    },
    {
      href: '/dashboard/payments',
      label: 'Earnings',
      icon: DollarSign,
    },
    {
      href: '/dashboard/settings',
      label: 'Settings',
      icon: Settings,
    },
  ]

  const adminLinks = [
    {
      href: '/dashboard/admin',
      label: 'Admin Panel',
      icon: Shield,
    },
    {
      href: '/dashboard/settings',
      label: 'Settings',
      icon: Settings,
    },
  ]

  const links = userRole === 'ADMIN' 
    ? adminLinks 
    : userRole === 'DEVELOPER' 
    ? developerLinks 
    : testerLinks

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}
      
      {/* Sidebar */}
      <aside 
        className={cn(
          "fixed lg:static inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 flex flex-col transform transition-transform duration-300 ease-in-out lg:transform-none",
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Header */}
        <div className="p-4 sm:p-6 flex items-center justify-between">
          <Link href="/" className="flex items-center">
            <Image 
              src="/images/logo.svg" 
              alt="TestForPay" 
              width={140} 
              height={32}
              className="h-8 w-auto"
            />
          </Link>
          <button 
            onClick={onClose}
            className="lg:hidden p-2 rounded-md hover:bg-gray-100"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 sm:px-4 space-y-1 overflow-y-auto">
          {links.map((link) => {
            const Icon = link.icon
            const isActive = pathname === link.href

            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={onClose}
                className={cn(
                  'flex items-center gap-3 px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-blue-50 text-blue-600'
                    : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                )}
              >
                <Icon className="h-5 w-5 flex-shrink-0" />
                <span className="truncate">{link.label}</span>
              </Link>
            )
          })}
        </nav>

        {/* Promo card - positioned at bottom */}
        {userRole !== 'ADMIN' && (
          <div className="p-3 sm:p-4 border-t border-gray-200 mt-auto">
            <div className="bg-blue-50 rounded-lg p-3 sm:p-4">
              <p className="text-sm font-semibold text-blue-900 mb-1">
                {userRole === 'DEVELOPER' ? 'Need Testers?' : 'Want to Earn More?'}
              </p>
              <p className="text-xs text-blue-700 mb-3">
                {userRole === 'DEVELOPER' 
                  ? 'Post a new testing job today' 
                  : 'Check out available jobs'}
              </p>
              <Link
                href={userRole === 'DEVELOPER' ? '/dashboard/jobs/new' : '/dashboard/browse'}
                onClick={onClose}
                className="block text-center bg-blue-600 text-white text-sm font-medium py-2 rounded-md hover:bg-blue-700 transition-colors"
              >
                {userRole === 'DEVELOPER' ? 'Create Job' : 'Browse Jobs'}
              </Link>
            </div>
          </div>
        )}
      </aside>
    </>
  )
}