# Feedback & Testimonials System Setup

## Overview
Complete feedback collection and approval system for TestForPay where developers and testers can submit feedback, and you (as admin) can approve testimonials to display on the landing page.

---

## DATABASE SCHEMA

### Feedback Model (in prisma/schema.prisma)

```prisma
model Feedback {
  id              String    @id @default(cuid())
  userId          String
  user            User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  // Feedback details
  type            String    // 'developer' or 'tester'
  rating          Int       // 1-5 stars
  title           String
  message         String    @db.Text
  
  // Approval workflow
  approved        Boolean   @default(false)
  approvedAt      DateTime?
  approvedBy      String?   // Admin user id
  
  // Display settings
  displayName     String?   // Optional name to display (privacy)
  companyName     String?   // Optional company name
  
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  
  @@index([userId])
  @@index([approved])
  @@index([type])
  @@index([rating])
}
```

Also added `feedbacks Feedback[]` relation to the User model.

---

## API ENDPOINTS

### 1. **POST /api/feedback** - Submit Feedback
**Access:** Authenticated users (developers & testers)

**Request:**
```json
{
  "type": "developer|tester",
  "rating": 1-5,
  "title": "string (5-100 chars)",
  "message": "string (10-1000 chars)",
  "displayName": "optional - how to credit them",
  "companyName": "optional - company/app name"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Thank you for your feedback! We appreciate it.",
  "feedback": { ...feedback object }
}
```

### 2. **GET /api/feedback** - Get Approved Testimonials
**Access:** Public (anyone can see approved feedback)

**Query Parameters:**
- `type` (optional): 'developer' or 'tester' - filter by user type
- `limit` (optional): number of results (default 6)

**Response:**
```json
{
  "success": true,
  "feedback": [
    {
      "id": "...",
      "rating": 5,
      "title": "Great service",
      "message": "TestForPay...",
      "displayName": "John D.",
      "companyName": "Acme Corp",
      "type": "developer",
      "createdAt": "2026-01-26T...",
      "user": {
        "name": "John Developer",
        "role": "DEVELOPER"
      }
    }
  ],
  "count": 6
}
```

### 3. **GET /api/admin/feedback** - Get All Feedback (Unapproved & Approved)
**Access:** Admin only

**Query Parameters:**
- `approved` (optional): 'true', 'false', or null for all
- `type` (optional): 'developer' or 'tester'

**Response:** All feedback with user details for review

### 4. **PATCH /api/admin/feedback/[id]** - Approve/Reject Feedback
**Access:** Admin only

**Request:**
```json
{
  "approved": true|false
}
```

**Response:** Updated feedback with approval status

### 5. **DELETE /api/admin/feedback/[id]** - Delete Feedback
**Access:** Admin only

**Response:** Confirmation of deletion

---

## COMPONENTS

### 1. **FeedbackForm** (`components/feedback/feedback-form.tsx`)
User-facing form where developers and testers submit feedback.

**Features:**
- User type selection (Developer / Tester)
- 5-star rating system
- Title and message fields (with character limits)
- Optional display name and company name
- Success/error messages
- Validation

**Usage:**
```tsx
import { FeedbackForm } from '@/components/feedback/feedback-form'

<FeedbackForm onSuccess={() => refetchTestimonials()} />
```

### 2. **Testimonials** (`components/feedback/testimonials.tsx`)
Display component for approved testimonials on landing page.

**Features:**
- Fetches approved feedback automatically
- Displays ratings as stars
- Filters by type (developer/tester)
- Customizable limit
- Loading state with skeleton
- Empty state message
- Responsive grid (1 col mobile, 2 cols tablet, 3 cols desktop)

**Usage:**
```tsx
import { Testimonials } from '@/components/feedback/testimonials'

// All approved testimonials
<Testimonials limit={6} />

// Only developer testimonials
<Testimonials limit={6} type="developer" />

// Only tester testimonials
<Testimonials limit={6} type="tester" />
```

---

## WORKFLOW

### For Users (Developers & Testers)
1. Navigate to feedback form
2. Select user type (Developer or Tester)
3. Rate the experience (1-5 stars)
4. Write title and detailed message
5. Optionally add display name and company name
6. Submit feedback
7. See success confirmation

### For You (Admin)
1. Go to `/dashboard/admin/feedback` (you'll need to create this page)
2. View all submitted feedback (approved and unapproved)
3. Read each feedback entry
4. Click "Approve" to make it public on landing page
5. Click "Reject" to hide it
6. Click "Delete" to remove permanently
7. Filter by approval status or user type

---

## SETUP CHECKLIST

✅ Added Feedback model to Prisma schema
✅ Created migration (pending database connection)
✅ Created API endpoints:
   ✅ POST /api/feedback (submit)
   ✅ GET /api/feedback (public approved testimonials)
   ✅ GET /api/admin/feedback (admin view all)
   ✅ PATCH /api/admin/feedback/[id] (approve/reject)
   ✅ DELETE /api/admin/feedback/[id] (delete)
✅ Created FeedbackForm component
✅ Created Testimonials component

❌ TODO - Create admin dashboard page `/dashboard/admin/feedback` to manage feedback
❌ TODO - Add Testimonials component to landing page
❌ TODO - Run database migration when connection is available
❌ TODO - Add feedback link to footer/settings

---

## DATABASE MIGRATION

When database connection is restored, run:

```bash
npm run prisma:migrate -- --name "add feedback model"
```

---

## ADDING TO YOUR APP

### 1. Add Feedback Form (e.g., on dashboard settings page)

```tsx
// app/(dashboard)/dashboard/settings/page.tsx
import { FeedbackForm } from '@/components/feedback/feedback-form'

export default function SettingsPage() {
  return (
    <div>
      <h1>Settings</h1>
      <FeedbackForm />
    </div>
  )
}
```

### 2. Add Testimonials to Landing Page

```tsx
// app/page.tsx
import { Testimonials } from '@/components/feedback/testimonials'

export default function LandingPage() {
  return (
    <div>
      {/* ... other sections ... */}
      
      {/* Testimonials Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-4xl font-bold text-center mb-4">
            What Our Users Say
          </h2>
          <p className="text-center text-gray-600 mb-12">
            Real feedback from developers and testers using TestForPay
          </p>
          <Testimonials limit={6} />
        </div>
      </section>
    </div>
  )
}
```

### 3. Create Admin Feedback Management Page (example)

```tsx
// app/(dashboard)/dashboard/admin/feedback/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/use-auth'

export default function AdminFeedbackPage() {
  const { user, loading } = useAuth()
  const [feedback, setFeedback] = useState([])
  const [filter, setFilter] = useState('all') // 'all', 'approved', 'pending'

  useEffect(() => {
    if (user?.role !== 'ADMIN') return
    
    const approved = filter === 'approved' ? 'true' : filter === 'pending' ? 'false' : null
    fetch(`/api/admin/feedback?approved=${approved}`)
      .then(r => r.json())
      .then(data => setFeedback(data.feedback))
  }, [user, filter])

  if (loading || !user || user.role !== 'ADMIN') {
    return <div>Loading...</div>
  }

  return (
    <div className="space-y-6">
      <h1 className="text-4xl font-bold">Manage Feedback</h1>

      {/* Filter Buttons */}
      <div className="flex gap-2">
        {['all', 'pending', 'approved'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded ${
              filter === f ? 'bg-blue-600 text-white' : 'bg-gray-200'
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Feedback List */}
      <div className="grid gap-4">
        {feedback.map(fb => (
          <div key={fb.id} className="bg-white p-6 rounded-lg shadow border-l-4 border-blue-500">
            <div className="flex justify-between items-start mb-3">
              <div>
                <h3 className="font-bold text-lg">{fb.title}</h3>
                <p className="text-sm text-gray-500">
                  {fb.user.name} ({fb.type}) • {new Date(fb.createdAt).toLocaleDateString()}
                </p>
              </div>
              <div className="flex gap-2">
                {!fb.approved && (
                  <button
                    onClick={() => {
                      fetch(`/api/admin/feedback/${fb.id}`, {
                        method: 'PATCH',
                        body: JSON.stringify({ approved: true })
                      }).then(() => setFilter(filter))
                    }}
                    className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                  >
                    Approve
                  </button>
                )}
                <button
                  onClick={() => {
                    fetch(`/api/admin/feedback/${fb.id}`, { method: 'DELETE' })
                      .then(() => setFilter(filter))
                  }}
                  className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                >
                  Delete
                </button>
              </div>
            </div>
            <p className="text-gray-700">{fb.message}</p>
            {fb.approved && (
              <p className="text-sm text-green-600 mt-3">✓ Approved and displayed on landing page</p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
```

---

## KEY FEATURES

✓ **Two-way feedback** - Both developers and testers can submit
✓ **Quality control** - You approve what gets displayed
✓ **Privacy options** - Users can choose display name
✓ **Company branding** - Option to show company/app name
✓ **Star ratings** - Visual feedback quality indicator
✓ **Validation** - Character limits and required fields
✓ **Admin dashboard** - Easy management interface
✓ **Public testimonials** - Approved feedback shows on landing page
✓ **Filtering** - View by user type or approval status

---

## NOTES

- Feedback is only visible on landing page after admin approval
- Unapproved feedback is only visible in admin dashboard
- Users can't edit their feedback after submission (admin must delete and ask them to resubmit)
- Display name is optional - if empty, their account name is used
- Company name is optional and helps provide context (e.g., "Used by Acme Corp")
- Approved feedback is shown in reverse chronological order (newest first)

---

**Status:** Ready to use once database migration completes ✓
