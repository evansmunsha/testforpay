# Real-Time Updates Implementation Guide

## Overview
This document explains how to implement real-time updates in your TestForPay app so users see changes instantly without refreshing.

## Architecture

### 1. Real-Time Hooks (`hooks/use-real-time.ts`)
Pre-built hooks that automatically poll API endpoints at configurable intervals:

- **`useRealTime(fetchFn, options)`** - Base hook for any data
- **`useRealtimeNotifications(interval)`** - Auto-refresh notifications
- **`useRealtimeJobs(developerId, interval)`** - Auto-refresh job listings
- **`useRealtimeApplications(jobId, interval)`** - Auto-refresh applications
- **`useRealtimePayments(interval)`** - Auto-refresh payments
- **`useRealtimeStats(interval)`** - Auto-refresh admin stats

### 2. Default Polling Intervals
- **Notifications**: 3 seconds (new messages are important!)
- **Jobs**: 5 seconds (moderate priority)
- **Applications**: 4 seconds (medium priority)
- **Payments**: 6 seconds (lower priority)
- **Stats**: 8 seconds (admin, lower priority)

## Usage Examples

### Example 1: Real-Time Job Browsing
```tsx
'use client'
import { useRealtimeJobs } from '@/hooks/use-real-time'

export default function BrowsePage() {
  // Auto-refreshes every 5 seconds
  const { data: jobs, loading, error, refresh } = useRealtimeJobs()

  if (loading) return <div>Loading...</div>
  if (error) return <div>Error: {error.message}</div>

  return (
    <div>
      <button onClick={refresh}>Refresh Now</button>
      {jobs?.map(job => (
        <JobCard key={job.id} job={job} />
      ))}
    </div>
  )
}
```

### Example 2: Real-Time Applications
```tsx
'use client'
import { useRealtimeApplications } from '@/hooks/use-real-time'

export default function JobDetailPage({ jobId }: { jobId: string }) {
  // Auto-refreshes applications every 4 seconds
  const { data: applications, loading } = useRealtimeApplications(jobId, 4000)

  return (
    <div>
      <h3>Applications ({applications?.length || 0})</h3>
      {applications?.map(app => (
        <ApplicationCard key={app.id} application={app} />
      ))}
    </div>
  )
}
```

### Example 3: Real-Time Notifications
```tsx
'use client'
import { useRealtimeNotifications } from '@/hooks/use-real-time'

export default function NotificationBell() {
  // Auto-refreshes every 3 seconds
  const { unreadCount, notifications, refresh } = useRealtimeNotifications(3000)

  return (
    <button onClick={refresh}>
      🔔 Notifications ({unreadCount})
    </button>
  )
}
```

### Example 4: Custom Data with useRealTime
```tsx
'use client'
import { useRealTime } from '@/hooks/use-real-time'

export default function MyComponent() {
  const fetchCustomData = async () => {
    const response = await fetch('/api/my-custom-endpoint')
    if (!response.ok) throw new Error('Failed to fetch')
    return response.json()
  }

  const { data, loading, error, refresh } = useRealTime(fetchCustomData, {
    interval: 2000, // 2 seconds
    enabled: true,
    onError: (err) => console.error('Fetch failed:', err),
  })

  return <div>{JSON.stringify(data)}</div>
}
```

## Key Features

### ✅ Automatic Polling
- Starts immediately on component mount
- Stops automatically on component unmount
- No manual setup needed

### ✅ Error Handling
- Graceful error handling with optional callback
- Errors won't break your app
- Retries automatically on next interval

### ✅ Performance Optimization
- Only updates state if data changed
- Cleans up intervals properly
- Avoids memory leaks with `mountedRef`

### ✅ Manual Refresh
- `refresh()` function for manual triggers
- Useful for "Refresh Now" buttons
- Works alongside auto-polling

### ✅ Interval Control
- Customize polling interval per hook
- Disable polling with `enabled: false`
- Save bandwidth with longer intervals

## Recommended Intervals by Use Case

| Component | Interval | Reason |
|-----------|----------|--------|
| Notifications | 3s | High priority, users expect instant alerts |
| Jobs Browse | 5s | New jobs posted regularly |
| Applications | 4s | Status changes are important |
| Payments | 6s | Less frequent changes |
| Admin Stats | 8s | Aggregated data, less critical |
| Custom Data | 5-10s | Balance between freshness and bandwidth |

## Optimization Tips

### 1. Disable When Not Needed
```tsx
const { data } = useRealtimeJobs(undefined, {
  enabled: user?.role === 'TESTER', // Only for testers
})
```

### 2. Longer Intervals for Large Data
```tsx
// Use 10s interval for admin dashboard with lots of data
const { data } = useRealtimeStats(10000)
```

### 3. Manual Refresh for Specific Events
```tsx
const { data, refresh } = useRealtimeApplications(jobId)

const handleApplyJob = async () => {
  await applyToJob()
  await refresh() // Update immediately after action
}
```

### 4. Reduce Background Polling
```tsx
// Use longer interval when app is in background
const isVisible = useDocumentVisibility()
const interval = isVisible ? 5000 : 30000 // 5s visible, 30s hidden
const { data } = useRealtimeJobs(undefined, interval)
```

## Migration Guide: Converting Existing Components

### Before (Manual fetch)
```tsx
useEffect(() => {
  const fetchJobs = async () => {
    const res = await fetch('/api/jobs?status=ACTIVE')
    const data = await res.json()
    setJobs(data.jobs)
  }
  fetchJobs()
}, [])
```

### After (Real-time polling)
```tsx
const { data: jobs, loading } = useRealtimeJobs()
```

That's it! The hook handles everything.

## Troubleshooting

### Data Not Updating?
1. Check network tab - requests should appear every 5s
2. Verify hook interval is set correctly
3. Ensure component is still mounted
4. Check `enabled` prop is `true`

### Too Much Network Traffic?
1. Increase interval: `useRealtimeJobs(undefined, 10000)`
2. Disable when not needed: `enabled: false`
3. Use manual refresh instead of auto-polling

### Memory Leaks?
1. Hooks handle cleanup automatically
2. Check React DevTools for unmounted components
3. Verify intervals are cleared (check for multiple timers)

## Future Enhancement: WebSockets

For even more real-time performance, consider upgrading to:
- **Socket.io** - Bidirectional real-time communication
- **Server-Sent Events (SSE)** - Server pushes updates to client
- **Supabase Realtime** - Managed real-time service

The hooks are designed to be easily swappable with WebSocket implementations.

## API Endpoints Required

For real-time features to work, ensure these endpoints exist:

✅ `/api/notifications` - GET with `?unreadOnly=true&limit=10`
✅ `/api/jobs` - GET with `?status=ACTIVE`
✅ `/api/applications` - GET all or GET with `?jobId=xxx`
✅ `/api/user/transactions` - GET payments
✅ `/api/admin/stats` - GET admin stats
✅ `/api/jobs/:id/applications` - GET applications for specific job

All these endpoints already exist in your app!
