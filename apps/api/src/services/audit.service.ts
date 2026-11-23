import { randomUUID } from 'node:crypto'
import type { Prisma } from '@prisma/client'

type AdminAuditEvent = {
  communityId: string
  actorId: string
  action: string
  targetType: string
  targetId?: string | null
  metadata?: Prisma.InputJsonValue
}

export function recordAdminAction(tx: Prisma.TransactionClient, event: AdminAuditEvent) {
  const metadata = event.metadata === undefined ? null : JSON.stringify(event.metadata)
  return tx.$executeRaw`INSERT INTO audit_logs (id, community_id, actor_id, action, target_type, target_id, metadata) VALUES (${randomUUID()}::uuid, ${event.communityId}::uuid, ${event.actorId}::uuid, ${event.action}, ${event.targetType}, ${event.targetId ?? null}, ${metadata}::jsonb)`
}
