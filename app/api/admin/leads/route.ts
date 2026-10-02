import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

const statusMap = {
  'Not contacted': 'NOT_CONTACTED',
  Contacted: 'CONTACTED',
  'Reply received': 'REPLY_RECEIVED',
  'Booked demo': 'BOOKED_DEMO',
  Quoted: 'QUOTED',
  Paid: 'PAID',
} as const

const priorityMap = {
  High: 'HIGH',
  Medium: 'MEDIUM',
  Low: 'LOW',
} as const

const reverseStatusMap = {
  NOT_CONTACTED: 'Not contacted',
  CONTACTED: 'Contacted',
  REPLY_RECEIVED: 'Reply received',
  BOOKED_DEMO: 'Booked demo',
  QUOTED: 'Quoted',
  PAID: 'Paid',
} as const

const reversePriorityMap = {
  HIGH: 'High',
  MEDIUM: 'Medium',
  LOW: 'Low',
} as const

const serializeLead = (lead: {
  id: string
  name: string
  email: string
  appName: string
  source: string | null
  status: keyof typeof reverseStatusMap
  priority: keyof typeof reversePriorityMap
  lastContacted: Date | null
  nextAction: string | null
  notes: string | null
  createdAt: Date
  updatedAt: Date
}) => ({
  id: lead.id,
  name: lead.name,
  email: lead.email,
  appName: lead.appName,
  source: lead.source || 'Manual entry',
  status: reverseStatusMap[lead.status],
  priority: reversePriorityMap[lead.priority],
  lastContacted: lead.lastContacted ? lead.lastContacted.toISOString().slice(0, 10) : '—',
  nextAction: lead.nextAction || 'Continue outreach and ask for the app link or launch date.',
  notes: lead.notes || '',
  createdAt: lead.createdAt.toISOString(),
  updatedAt: lead.updatedAt.toISOString(),
})

export async function GET() {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser || currentUser.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
    }

    const leads = await prisma.developerLead.findMany({
      orderBy: [{ createdAt: 'desc' }, { updatedAt: 'desc' }],
    })

    return NextResponse.json({ leads: leads.map(serializeLead) })
  } catch (error) {
    console.error('Admin leads fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch acquisition leads' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser || currentUser.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
    }

    const body = await request.json()
    const name = typeof body.name === 'string' ? body.name.trim() : ''
    const email = typeof body.email === 'string' ? body.email.trim() : ''
    const appName = typeof body.appName === 'string' ? body.appName.trim() : ''

    if (!name || !email || !appName) {
      return NextResponse.json({ error: 'Name, email, and app name are required.' }, { status: 400 })
    }

    const validatedStatus = typeof body.status === 'string' ? statusMap[body.status as keyof typeof statusMap] ?? 'NOT_CONTACTED' : 'NOT_CONTACTED'
    const validatedPriority = typeof body.priority === 'string' ? priorityMap[body.priority as keyof typeof priorityMap] ?? 'MEDIUM' : 'MEDIUM'

    const lead = await prisma.developerLead.create({
      data: {
        name,
        email,
        appName,
        source: typeof body.source === 'string' && body.source.trim() ? body.source.trim() : 'Manual entry',
        status: validatedStatus,
        priority: validatedPriority,
        lastContacted: new Date(),
        nextAction: typeof body.nextAction === 'string' && body.nextAction.trim() ? body.nextAction.trim() : 'Send the intro email and ask for the app link.',
        notes: typeof body.notes === 'string' && body.notes.trim() ? body.notes.trim() : 'New lead added to the acquisition pipeline.',
      },
    })

    return NextResponse.json({ lead: serializeLead(lead) }, { status: 201 })
  } catch (error) {
    console.error('Admin lead create error:', error)
    return NextResponse.json({ error: 'Failed to add acquisition lead' }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser || currentUser.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
    }

    const body = await request.json()
    const id = typeof body.id === 'string' ? body.id : ''

    if (!id) {
      return NextResponse.json({ error: 'Lead ID is required.' }, { status: 400 })
    }

    const existingLead = await prisma.developerLead.findUnique({ where: { id } })
    if (!existingLead) {
      return NextResponse.json({ error: 'Lead not found.' }, { status: 404 })
    }

    const nextStatus = typeof body.status === 'string' ? statusMap[body.status as keyof typeof statusMap] ?? existingLead.status : existingLead.status
    const updateData: {
      status?: keyof typeof reverseStatusMap
      nextAction?: string
      lastContacted?: Date
    } = {
      status: nextStatus,
    }

    if (typeof body.nextAction === 'string' && body.nextAction.trim()) {
      updateData.nextAction = body.nextAction.trim()
    }

    if (typeof body.lastContacted === 'string' && body.lastContacted) {
      updateData.lastContacted = new Date(body.lastContacted)
    } else {
      updateData.lastContacted = new Date()
    }

    const updated = await prisma.developerLead.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json({ lead: serializeLead(updated) })
  } catch (error) {
    console.error('Admin lead update error:', error)
    return NextResponse.json({ error: 'Failed to update acquisition lead' }, { status: 500 })
  }
}
