'use client'

import { useState, useEffect } from 'react'
import { Download, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function PWAInstallButton() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showButton, setShowButton] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)

  useEffect(() => {
    // Check if already installed or dismissed
    const dismissed = localStorage.getItem('pwa-install-dismissed')
    const installed = localStorage.getItem('pwa-installed')
    
    if (dismissed || installed) {
      setShowButton(false)
      return
    }

    // Check if running as installed PWA
    if (window.matchMedia('(display-mode: standalone)').matches) {
      localStorage.setItem('pwa-installed', 'true')
      setIsInstalled(true)
      setShowButton(false)
      return
    }

    // Listen for install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setShowButton(true)
    }

    // Listen for successful install
    const handleAppInstalled = () => {
      localStorage.setItem('pwa-installed', 'true')
      setIsInstalled(true)
      setShowButton(false)
      setDeferredPrompt(null)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  const handleInstall = async () => {
    if (!deferredPrompt) return

    try {
      await deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice

      if (outcome === 'accepted') {
        localStorage.setItem('pwa-installed', 'true')
        setIsInstalled(true)
      }
      
      setShowButton(false)
      setDeferredPrompt(null)
    } catch (error) {
      console.error('Install prompt error:', error)
    }
  }

  const handleDismiss = () => {
    localStorage.setItem('pwa-install-dismissed', 'true')
    setShowButton(false)
  }

  if (!showButton || isInstalled) return null

  return (
    <div className="fixed bottom-4 right-4 z-50 animate-in slide-in-from-bottom-4 fade-in duration-300">
      <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-4 max-w-xs">
        <button 
          onClick={handleDismiss}
          className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
        >
          <X className="h-4 w-4" />
        </button>
        
        <div className="flex items-start gap-3">
          <div className="bg-blue-100 p-2 rounded-lg">
            <Download className="h-6 w-6 text-blue-600" />
          </div>
          <div className="flex-1 pr-4">
            <p className="font-semibold text-gray-900 text-sm">Install TestForPay</p>
            <p className="text-xs text-gray-500 mt-1">
              Get quick access and notifications
            </p>
          </div>
        </div>
        
        <Button 
          onClick={handleInstall}
          size="sm"
          className="w-full mt-3"
        >
          <Download className="h-4 w-4 mr-2" />
          Install App
        </Button>
      </div>
    </div>
  )
}
