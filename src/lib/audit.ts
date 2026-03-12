import { AuditActorType, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";

type AuditEntry = {
  actorType?: AuditActorType;
  adminUserId?: string;
  action: string;
  entityType: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
};

export async function recordAuditLog(entry: AuditEntry): Promise<void> {
  await prisma.auditLog.create({
    data: {
      actorType: entry.actorType ?? AuditActorType.ADMIN,
      adminUserId: entry.adminUserId,
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId,
      metadata: entry.metadata as Prisma.InputJsonValue | undefined
    }
  });
}
