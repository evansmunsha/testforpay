import { NextResponse } from 'next/server'

// Future-dated scheduling was replaced by POST /api/jobs/[id]/start (manual "Start testing now").
export async function POST() {
  return NextResponse.json(
    { error: 'Scheduling a future start is no longer used. Use Start testing now when the verified group is ready.' },
    { status: 410 }
  )
}
