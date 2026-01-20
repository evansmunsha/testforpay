import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { getFraudStats, getFraudLogs, resolveFraudLog, clearUserFraudFlags } from '@/lib/fraud-detection';

// GET - Get fraud detection data
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const view = searchParams.get('view') || 'stats';

    if (view === 'stats') {
      const stats = await getFraudStats();
      return NextResponse.json(stats);
    }

    if (view === 'logs') {
      const resolved = searchParams.get('resolved');
      const severity = searchParams.get('severity') as 'low' | 'medium' | 'high' | 'critical' | undefined;
      
      const logs = await getFraudLogs({
        resolved: resolved === 'true' ? true : resolved === 'false' ? false : undefined,
        severity,
        limit: 100,
      });
      
      return NextResponse.json({ logs });
    }

    if (view === 'flagged-users') {
      const flaggedUsers = await prisma.user.findMany({
        where: { flagged: true },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          fraudScore: true,
          createdAt: true,
          lastIpAddress: true,
          signupIp: true,
          suspended: true,
          _count: {
            select: {
              applications: true,
              fraudLogs: true,
            },
          },
        },
        orderBy: { fraudScore: 'desc' },
      });
      
      return NextResponse.json({ users: flaggedUsers });
    }

    return NextResponse.json({ error: 'Invalid view parameter' }, { status: 400 });
  } catch (error) {
    console.error('Fraud API error:', error);
    return NextResponse.json({ error: 'Failed to fetch fraud data' }, { status: 500 });
  }
}

// PATCH - Resolve fraud log or clear user flags
export async function PATCH(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { action, logId, userId } = body;

    if (action === 'resolve-log' && logId) {
      const resolved = await resolveFraudLog(logId, user.userId);
      return NextResponse.json({ success: true, log: resolved });
    }

    if (action === 'clear-flags' && userId) {
      const updated = await clearUserFraudFlags(userId);
      return NextResponse.json({ success: true, user: updated });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Fraud action error:', error);
    return NextResponse.json({ error: 'Action failed' }, { status: 500 });
  }
}
