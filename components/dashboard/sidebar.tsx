'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  LayoutDashboard, 
  Briefcase, 
  FileText, 
  CreditCard, 
  Settings,
  Search,
  DollarSign,
  Shield
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface SidebarProps {
  userRole: 'DEVELOPER' | 'TESTER' | 'ADMIN'
}

export function Sidebar({ userRole }: SidebarProps) {
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
      href: '/dashboard',
      label: 'Overview',
      icon: LayoutDashboard,
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
    <aside className="w-64 bg-white border-r border-gray-200 min-h-screen">
      <div className="p-6">
        <Link href="/" className="flex items-center gap-2">
          <DollarSign className="h-8 w-8 text-blue-600" />
          <span className="text-2xl font-bold text-gray-900">TestForPay</span>
        </Link>
      </div>

      <nav className="px-4 space-y-1">
        {links.map((link) => {
          const Icon = link.icon
          const isActive = pathname === link.href

          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                'flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-blue-50 text-blue-600'
                  : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
              )}
            >
              <Icon className="h-5 w-5" />
              {link.label}
            </Link>
          )
        })}
      </nav>

      {userRole !== 'ADMIN' && (
        <div className="absolute bottom-0 w-64 p-4 border-t border-gray-200">
          <div className="bg-blue-50 rounded-lg p-4">
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
              className="block text-center bg-blue-600 text-white text-sm font-medium py-2 rounded-md hover:bg-blue-700"
            >
              {userRole === 'DEVELOPER' ? 'Create Job' : 'Browse Jobs'}
            </Link>
          </div>
        </div>
      )}
    </aside>
  )
}