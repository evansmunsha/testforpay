'use client'

import { Moon, Sun } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'

const THEME_KEY = 'testforpay-theme'

type Theme = 'light' | 'dark'

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>('light')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const storedTheme = window.localStorage.getItem(THEME_KEY) as Theme | null
    const preferredTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    const nextTheme = storedTheme === 'dark' || storedTheme === 'light' ? storedTheme : preferredTheme
    document.documentElement.classList.toggle('dark', nextTheme === 'dark')
    setTheme(nextTheme)
    setMounted(true)
  }, [])

  const toggleTheme = () => {
    const nextTheme: Theme = theme === 'dark' ? 'light' : 'dark'
    document.documentElement.classList.toggle('dark', nextTheme === 'dark')
    window.localStorage.setItem(THEME_KEY, nextTheme)
    setTheme(nextTheme)
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      disabled={!mounted}
      aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      className="text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white"
    >
      {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </Button>
  )
}
