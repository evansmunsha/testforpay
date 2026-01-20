'use client'

import { LogOut, Settings, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { NotificationBell } from '@/components/shared/notification-bell'
import { useAuth } from '@/hooks/use-auth'
import { useRouter } from 'next/navigation'

export function DashboardNav() {
  const { user, logout } = useAuth()
  const router = useRouter()

  const handleLogout = async () => {
    await logout()
  }

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-20">
      <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4">
        <div className="flex-1 pl-12 lg:pl-0 min-w-0">
          <h1 className="text-base sm:text-xl lg:text-2xl font-bold text-gray-900 truncate">
            <span className="sm:hidden">
              {user?.role === 'DEVELOPER' ? 'Developer' : 
               user?.role === 'ADMIN' ? 'Admin' : 'Tester'}
            </span>
            <span className="hidden sm:inline">
              {user?.role === 'DEVELOPER' ? 'Developer Dashboard' : 
               user?.role === 'ADMIN' ? 'Admin Dashboard' : 'Tester Dashboard'}
            </span>
          </h1>
          <p className="text-xs sm:text-sm text-gray-600 mt-0.5 truncate hidden sm:block">
            Welcome back, {user?.name || user?.email}
          </p>
        </div>

        <div className="flex items-center gap-2 sm:gap-4">
          {/* Notifications */}
          <NotificationBell />

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-2 px-2 sm:px-3">
                <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <User className="h-4 w-4 text-blue-600" />
                </div>
                <span className="hidden md:block truncate max-w-[100px]">{user?.name || 'User'}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium">{user?.name || 'User'}</p>
                  <p className="text-xs text-gray-500">{user?.email}</p>
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 w-fit">
                    {user?.role}
                  </span>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => router.push('/dashboard/settings')}>
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="text-red-600">
                <LogOut className="mr-2 h-4 w-4" />
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}