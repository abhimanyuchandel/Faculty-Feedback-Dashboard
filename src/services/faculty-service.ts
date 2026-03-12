import { DigestSubscriptionStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { generateOpaqueToken } from "@/lib/security";

export type FacultyInput = {
  firstName: string;
  lastName: string;
  primaryEmail: string;
  secondaryEmail?: string | null;
  activeStatus?: boolean;
  digestSubscriptionStatus?: DigestSubscriptionStatus;
};

async function generateUniquePublicToken(): Promise<string> {
  for (let attempts = 0; attempts < 10; attempts += 1) {
    const candidate = generateOpaqueToken(8).slice(0, 8).toUpperCase();
    const existing = await prisma.faculty.findUnique({ where: { publicToken: candidate } });
    if (!existing) {
      return candidate;
    }
  }

  throw new Error("Could not allocate unique public token");
}

export async function createFaculty(input: FacultyInput) {
  const token = await generateUniquePublicToken();

  return prisma.faculty.create({
    data: {
      firstName: input.firstName,
      lastName: input.lastName,
      primaryEmail: input.primaryEmail.toLowerCase(),
      secondaryEmail: input.secondaryEmail ? input.secondaryEmail.toLowerCase() : null,
      activeStatus: input.activeStatus ?? true,
      digestSubscriptionStatus: input.digestSubscriptionStatus ?? DigestSubscriptionStatus.SUBSCRIBED,
      publicToken: token,
      department: "Department of Medicine"
    }
  });
}

export async function updateFaculty(facultyId: string, input: Partial<FacultyInput>) {
  return prisma.faculty.update({
    where: { id: facultyId },
    data: {
      ...(input.firstName ? { firstName: input.firstName } : {}),
      ...(input.lastName ? { lastName: input.lastName } : {}),
      ...(input.primaryEmail ? { primaryEmail: input.primaryEmail.toLowerCase() } : {}),
      ...(input.secondaryEmail !== undefined ? { secondaryEmail: input.secondaryEmail?.toLowerCase() ?? null } : {}),
      ...(input.activeStatus !== undefined ? { activeStatus: input.activeStatus, deactivatedAt: input.activeStatus ? null : new Date() } : {}),
      ...(input.digestSubscriptionStatus ? { digestSubscriptionStatus: input.digestSubscriptionStatus } : {})
    }
  });
}

export async function deactivateFaculty(facultyId: string) {
  return prisma.faculty.update({
    where: { id: facultyId },
    data: {
      activeStatus: false,
      deactivatedAt: new Date()
    }
  });
}

export async function reactivateFaculty(facultyId: string) {
  return prisma.faculty.update({
    where: { id: facultyId },
    data: {
      activeStatus: true,
      deactivatedAt: null
    }
  });
}

export async function regenerateFacultyToken(facultyId: string) {
  const token = await generateUniquePublicToken();
  return prisma.faculty.update({
    where: { id: facultyId },
    data: { publicToken: token }
  });
}

export async function searchFacultyPublic(query: string, limit = 20) {
  const q = query.trim();
  if (!q) {
    return [];
  }

  const wildcard = `%${q}%`;

  return prisma.$queryRaw<
    {
      id: string;
      first_name: string;
      last_name: string;
      primary_email: string;
      secondary_email: string | null;
      public_token: string;
      rank: number;
    }[]
  >(Prisma.sql`
    SELECT
      f.id,
      f.first_name,
      f.last_name,
      f.primary_email,
      f.secondary_email,
      f.public_token,
      GREATEST(
        similarity(f.first_name, ${q}),
        similarity(f.last_name, ${q}),
        similarity(f.primary_email, ${q}),
        similarity(COALESCE(f.secondary_email, ''), ${q})
      ) AS rank
    FROM faculty f
    WHERE f.active_status = true
      AND (
        f.first_name ILIKE ${wildcard}
        OR f.last_name ILIKE ${wildcard}
        OR f.primary_email ILIKE ${wildcard}
        OR COALESCE(f.secondary_email, '') ILIKE ${wildcard}
        OR similarity(f.first_name, ${q}) > 0.2
        OR similarity(f.last_name, ${q}) > 0.2
        OR similarity(f.primary_email, ${q}) > 0.2
        OR similarity(COALESCE(f.secondary_email, ''), ${q}) > 0.2
      )
    ORDER BY rank DESC, f.last_name ASC
    LIMIT ${limit};
  `);
}

export async function listFaculty(params?: { activeOnly?: boolean; take?: number; skip?: number }) {
  return prisma.faculty.findMany({
    where: params?.activeOnly ? { activeStatus: true } : undefined,
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    take: params?.take ?? 100,
    skip: params?.skip ?? 0
  });
}

export async function getFacultyByPublicToken(publicToken: string) {
  return prisma.faculty.findUnique({
    where: { publicToken },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      activeStatus: true,
      publicToken: true
    }
  });
}
