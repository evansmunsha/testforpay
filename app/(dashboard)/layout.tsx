'use client'

import { Sidebar } from '@/components/dashboard/sidebar'
import { DashboardNav } from '@/components/dashboard/nav'
import { useAuth } from '@/hooks/use-auth'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    )
  }

  if (!user) {
    return null // Middleware will redirect
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar userRole={user.role as 'DEVELOPER' | 'TESTER' | 'ADMIN'} />
      
      <div className="flex-1 flex flex-col">
        <DashboardNav />
        
        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  )
}