'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Sidebar } from '@/components/dashboard/sidebar'
import { DashboardNav } from '@/components/dashboard/nav'
import { useAuth } from '@/hooks/use-auth'
import { NotificationPrompt } from '@/components/shared/notification-prompt'
import { Menu } from 'lucide-react'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, loading } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (!loading && !user) {
      const redirectPath =
        pathname && pathname !== '/dashboard'
          ? `${pathname}${window.location.search}`
          : '/dashboard'

      router.replace(`/login?redirect=${encodeURIComponent(redirectPath)}`)
    }
  }, [loading, pathname, router, user])

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
          <p className="mt-4 text-sm text-gray-600">
            {loading ? 'Checking your session...' : 'Redirecting to sign in...'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Mobile menu button */}
      <button
        onClick={() => setSidebarOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-30 p-2 bg-white rounded-lg shadow-md border border-gray-200"
      >
        <Menu className="h-5 w-5 text-gray-600" />
      </button>

      <Sidebar 
        userRole={user.role as 'DEVELOPER' | 'TESTER' | 'ADMIN'} 
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      
      <div className="flex-1 flex flex-col min-w-0">
        <DashboardNav />
        
        <main className="flex-1 ms:px-0 py-4 sm:py-6 pt-16 lg:pt-6">
          {children}
        </main>
      </div>
      <NotificationPrompt />
    </div>
  )
}