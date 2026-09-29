import { randomUUID } from 'node:crypto'
import prisma from '@/lib/prisma'

export async function recordAdminAction(input: {
  actorId: string
  actorEmail: string
  action: string
  targetType: string
  targetId: string
  reason: string
}) {
  await prisma.$executeRaw`
    INSERT INTO "AdminAuditLog" ("id", "actorId", "actorEmail", "action", "targetType", "targetId", "reason")
    VALUES (${randomUUID()}, ${input.actorId}, ${input.actorEmail}, ${input.action}, ${input.targetType}, ${input.targetId}, ${input.reason})
  `
}