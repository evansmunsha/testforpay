import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function POST(request, { params }) {
  const currentUser = await getCurrentUser();
  if (!currentUser || currentUser.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const paymentId = params.id;
  try {
    const payment = await prisma.payment.update({
      where: { id: paymentId },
      data: { status: 'PROCESSING' }
    });
    return NextResponse.json({ success: true, payment });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to retry payment' }, { status: 500 });
  }
}
