import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { recordAdminAction } from '@/lib/admin-audit'

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const currentUser = await getCurrentUser();
  if (!currentUser || currentUser.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await context.params;
  try {
    let body: { reason?: unknown }
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'A reason is required to retry a payout' }, { status: 400 })
    }
    const reason = typeof body.reason === 'string' ? body.reason.trim() : ''
    if (reason.length < 10) {
      return NextResponse.json({ error: 'Provide a reason of at least 10 characters' }, { status: 400 })
    }

    const payment = await prisma.payment.update({
      where: { id },
      data: { status: 'PROCESSING' }
    });
    await recordAdminAction({ actorId: currentUser.userId, actorEmail: currentUser.email, action: 'retry_payout', targetType: 'payment', targetId: id, reason })
    return NextResponse.json({ success: true, payment });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to retry payment' }, { status: 500 });
  }
}
