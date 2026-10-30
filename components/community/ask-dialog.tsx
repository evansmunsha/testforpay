'use client'

import { useCallback, useRef, useState, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'

export interface AskOptions {
  title: string
  description?: string
  confirmLabel?: string
  // Without a field the dialog is a plain confirm and resolves to '' when accepted.
  field?: { label: string; minLength?: number; optional?: boolean; numeric?: boolean; placeholder?: string }
}

/** Replaces window.prompt/confirm. ask() resolves to the typed text, '' for a confirm, or null if cancelled. */
export function useAskDialog(): { ask: (options: AskOptions) => Promise<string | null>; dialog: ReactNode } {
  const [options, setOptions] = useState<AskOptions | null>(null)
  const [value, setValue] = useState('')
  const [error, setError] = useState('')
  const resolver = useRef<((result: string | null) => void) | null>(null)

  const ask = useCallback((next: AskOptions) => {
    setValue('')
    setError('')
    setOptions(next)
    return new Promise<string | null>((resolve) => {
      resolver.current = resolve
    })
  }, [])

  const finish = (result: string | null) => {
    resolver.current?.(result)
    resolver.current = null
    setOptions(null)
  }

  const submit = () => {
    const field = options?.field
    if (field) {
      const text = value.trim()
      if (!text && field.optional) return finish('')
      if (field.numeric && !/^\d+$/.test(text)) return setError('Please enter a whole number.')
      if (field.minLength && text.length < field.minLength) {
        return setError(`Please write at least ${field.minLength} characters.`)
      }
      if (!text) return setError('This is required.')
      return finish(text)
    }
    finish('')
  }

  const dialog = (
    <Dialog open={!!options} onOpenChange={(open) => { if (!open) finish(null) }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{options?.title}</DialogTitle>
          {options?.description && <DialogDescription>{options.description}</DialogDescription>}
        </DialogHeader>
        {options?.field && (
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="ask-dialog-field">{options.field.label}</label>
            <Textarea
              id="ask-dialog-field"
              value={value}
              rows={options.field.numeric ? 1 : 3}
              placeholder={options.field.placeholder}
              onChange={(event) => { setValue(event.target.value); setError('') }}
              autoFocus
            />
            {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" className="min-h-11" onClick={() => finish(null)}>Cancel</Button>
          <Button className="min-h-11" onClick={submit}>{options?.confirmLabel ?? 'Confirm'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )

  return { ask, dialog }
}
