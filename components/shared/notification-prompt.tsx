'use client'

import { useState, useEffect } from 'react'
import { Bell, X, BellOff } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function NotificationPrompt() {
  const [show, setShow] = useState(false)
  const [loading, setLoading] = useState(false)
  const [state, setState] = useState<'idle' | 'success' | 'denied'>('idle')

  useEffect(() => {
    // Don't show if:
    // - Browser doesn't support notifications
    // - Already granted or denied
    // - User dismissed this prompt before
    if (typeof window === 'undefined') return
    if (!('Notification' in window) || !('serviceWorker' in navigator)) return
    if (Notification.permission === 'granted') return
    if (Notification.permission === 'denied') return
    if (localStorage.getItem('notif-prompt-dismissed') === 'true') return

    // Small delay so it doesn't fire the instant the page loads
    const t = setTimeout(() => setShow(true), 2500)
    return () => clearTimeout(t)
  }, [])

  const handleEnable = async () => {
    setLoading(true)
    try {
      const permission = await Notification.requestPermission()

      if (permission !== 'granted') {
        setState('denied')
        setLoading(false)
        return
      }

      // Get service worker registration
      const registration = await navigator.serviceWorker.ready

      // Subscribe to push
      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
      if (!vapidKey) {
        console.error('VAPID public key not set')
        setLoading(false)
        return
      }

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToArrayBuffer(vapidKey),
      })

      // Save to server
      await fetch('/api/notifications/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription }),
      })

      setState('success')
      setTimeout(() => setShow(false), 2000)
    } catch (err) {
      console.error('Failed to enable notifications:', err)
      setState('denied')
    } finally {
      setLoading(false)
    }
  }

  const handleDismiss = () => {
    localStorage.setItem('notif-prompt-dismissed', 'true')
    setShow(false)
  }

  if (!show) return null

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:max-w-sm z-50 animate-in slide-in-from-bottom-4 fade-in duration-300">
      <div className="bg-white rounded-xl shadow-xl border border-gray-200 p-4">
        <button
          onClick={handleDismiss}
          className="absolute top-3 right-3 text-gray-400 hover:text-gray-600"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>

        {state === 'success' ? (
          <div className="flex items-center gap-3 pr-4">
            <div className="bg-green-100 p-2 rounded-lg shrink-0">
              <Bell className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="font-semibold text-gray-900 text-sm">Notifications enabled ✓</p>
              <p className="text-xs text-gray-500">You'll be notified when new jobs go live.</p>
            </div>
          </div>
        ) : state === 'denied' ? (
          <div className="flex items-center gap-3 pr-4">
            <div className="bg-gray-100 p-2 rounded-lg shrink-0">
              <BellOff className="h-5 w-5 text-gray-500" />
            </div>
            <div>
              <p className="font-semibold text-gray-900 text-sm">Notifications blocked</p>
              <p className="text-xs text-gray-500">
                To enable later, click the lock icon in your browser address bar and allow notifications.
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-start gap-3 pr-4">
              <div className="bg-blue-100 p-2 rounded-lg shrink-0 mt-0.5">
                <Bell className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="font-semibold text-gray-900 text-sm">Get notified when jobs go live</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  New testing jobs fill fast. Enable notifications so you don't miss out.
                </p>
              </div>
            </div>
            <div className="flex gap-2 mt-3">
              <Button
                size="sm"
                className="flex-1"
                onClick={handleEnable}
                disabled={loading}
              >
                <Bell className="h-3.5 w-3.5 mr-1.5" />
                {loading ? 'Enabling...' : 'Enable Notifications'}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleDismiss}
                className="text-gray-400"
              >
                Not now
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// Convert VAPID key from base64url to an ArrayBuffer suitable for Web Push
function urlBase64ToArrayBuffer(base64String: string): ArrayBuffer {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  const bytes = Uint8Array.from([...rawData].map(char => char.charCodeAt(0)))

  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)
}
