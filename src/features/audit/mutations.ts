import { prisma } from "@/lib/prisma";

export interface AuditLogPayload {
  actorUserId: string;
  action: string;
  entityType: string;
  entityId: string;
  details?: string;
}

export async function createAuditLog(payload: AuditLogPayload): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        actor_user_id: payload.actorUserId,
        action: payload.action,
        entity_type: payload.entityType,
        entity_id: payload.entityId,
        details: payload.details ?? null,
      },
    });
  } catch (err) {
    console.error("Failed to write audit log:", err);
    throw err;
  }
}
