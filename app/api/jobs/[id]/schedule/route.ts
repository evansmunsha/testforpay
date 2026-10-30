import { NextResponse } from 'next/server'

// Retired endpoint. Starting a job, now or on a chosen future date, is handled by
// POST /api/jobs/[id]/start (optional `startDate`).
export async function POST() {
  return NextResponse.json(
    { error: 'This endpoint has moved. Use POST /api/jobs/[id]/start and pass a startDate to pick a start day.' },
    { status: 410 }
  )
}
