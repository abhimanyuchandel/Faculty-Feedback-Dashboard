import { prisma } from "@/lib/db/prisma";
import { recordAuditLog } from "@/lib/audit";

export async function createTeachingSession(
  input: {
    title: string;
    curriculumPhaseId: string;
    sessionDate: Date;
    startAt: Date;
    endAt: Date;
    location: string;
    notes?: string;
    facultyIds: string[];
  },
  adminUserId?: string
) {
  const session = await prisma.teachingSession.create({
    data: {
      title: input.title,
      curriculumPhaseId: input.curriculumPhaseId,
      sessionDate: input.sessionDate,
      startAt: input.startAt,
      endAt: input.endAt,
      location: input.location,
      notes: input.notes,
      facultyAssignments: {
        create: input.facultyIds.map((facultyId) => ({ facultyId }))
      }
    },
    include: {
      facultyAssignments: {
        include: {
          faculty: true
        }
      },
      curriculumPhase: true
    }
  });

  if (adminUserId) {
    await recordAuditLog({
      adminUserId,
      action: "session.create",
      entityType: "teaching_session",
      entityId: session.id,
      metadata: { facultyCount: input.facultyIds.length }
    });
  }

  return session;
}

export async function updateSessionFaculty(sessionId: string, facultyIds: string[], adminUserId?: string) {
  const result = await prisma.$transaction(async (tx) => {
    await tx.teachingSessionFaculty.deleteMany({ where: { teachingSessionId: sessionId } });

    await tx.teachingSessionFaculty.createMany({
      data: facultyIds.map((facultyId) => ({
        teachingSessionId: sessionId,
        facultyId
      }))
    });

    return tx.teachingSession.findUnique({
      where: { id: sessionId },
      include: {
        facultyAssignments: { include: { faculty: true } },
        curriculumPhase: true
      }
    });
  });

  if (adminUserId) {
    await recordAuditLog({
      adminUserId,
      action: "session.update_faculty_assignments",
      entityType: "teaching_session",
      entityId: sessionId,
      metadata: { facultyCount: facultyIds.length }
    });
  }

  return result;
}

export async function archiveTeachingSession(sessionId: string, adminUserId?: string) {
  const session = await prisma.teachingSession.update({
    where: { id: sessionId },
    data: {
      activeStatus: false,
      archivedAt: new Date()
    }
  });

  if (adminUserId) {
    await recordAuditLog({
      adminUserId,
      action: "session.archive",
      entityType: "teaching_session",
      entityId: sessionId
    });
  }

  return session;
}

export async function restoreTeachingSession(sessionId: string, adminUserId?: string) {
  const session = await prisma.teachingSession.update({
    where: { id: sessionId },
    data: {
      activeStatus: true,
      archivedAt: null
    }
  });

  if (adminUserId) {
    await recordAuditLog({
      adminUserId,
      action: "session.restore",
      entityType: "teaching_session",
      entityId: sessionId
    });
  }

  return session;
}

export async function deleteTeachingSession(sessionId: string, adminUserId?: string) {
  const session = await prisma.teachingSession.delete({
    where: { id: sessionId }
  });

  if (adminUserId) {
    await recordAuditLog({
      adminUserId,
      action: "session.delete",
      entityType: "teaching_session",
      entityId: sessionId
    });
  }

  return session;
}

export async function listSessions(includeArchived = false) {
  return prisma.teachingSession.findMany({
    where: includeArchived ? undefined : { activeStatus: true },
    orderBy: includeArchived
      ? [{ activeStatus: "desc" }, { sessionDate: "desc" }, { startAt: "desc" }]
      : [{ sessionDate: "desc" }, { startAt: "desc" }],
    include: {
      curriculumPhase: true,
      facultyAssignments: {
        include: {
          faculty: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              publicToken: true,
              activeStatus: true
            }
          }
        }
      }
    }
  });
}
