import {
  DigestSubscriptionStatus,
  FacultyEnrollmentRequestStatus,
  Prisma
} from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { appUrl } from "@/lib/app-url";
import { sendTransactionalEmail } from "@/lib/email/provider";
import { generateOpaqueToken } from "@/lib/security";
import { recordAuditLog } from "@/lib/audit";

type EnrollmentRequestInput = {
  firstName: string;
  lastName: string;
  primaryEmail: string;
  secondaryEmail?: string;
  notes?: string;
};

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function emailMatchConditions(emails: string[]) {
  return emails.flatMap((email) => [{ primaryEmail: email }, { secondaryEmail: email }]);
}

async function generateUniquePublicTokenTx(tx: Prisma.TransactionClient): Promise<string> {
  for (let attempts = 0; attempts < 12; attempts += 1) {
    const candidate = generateOpaqueToken(8).slice(0, 8).toUpperCase();
    const existing = await tx.faculty.findUnique({
      where: { publicToken: candidate },
      select: { id: true }
    });

    if (!existing) {
      return candidate;
    }
  }

  throw new Error("Could not allocate unique public token");
}

export async function createFacultyEnrollmentRequest(input: EnrollmentRequestInput) {
  const primaryEmail = normalizeEmail(input.primaryEmail);
  const secondaryEmail = input.secondaryEmail?.trim() ? normalizeEmail(input.secondaryEmail) : undefined;
  const emails = [primaryEmail, secondaryEmail].filter((entry): entry is string => Boolean(entry));

  const existingFaculty = await prisma.faculty.findFirst({
    where: { OR: emailMatchConditions(emails) },
    select: { id: true }
  });

  if (existingFaculty) {
    return {
      requested: false as const,
      alreadyEnrolled: true as const,
      request: null
    };
  }

  const existingPending = await prisma.facultyEnrollmentRequest.findFirst({
    where: {
      status: FacultyEnrollmentRequestStatus.PENDING,
      OR: [
        { primaryEmail },
        ...(secondaryEmail ? [{ secondaryEmail }] : []),
        ...(secondaryEmail ? [{ primaryEmail: secondaryEmail }] : []),
        { secondaryEmail: primaryEmail }
      ]
    },
    orderBy: { requestedAt: "desc" }
  });

  if (existingPending) {
    return {
      requested: false as const,
      alreadyEnrolled: false as const,
      request: existingPending
    };
  }

  const request = await prisma.facultyEnrollmentRequest.create({
    data: {
      firstName: input.firstName.trim(),
      lastName: input.lastName.trim(),
      primaryEmail,
      secondaryEmail: secondaryEmail ?? null,
      notes: input.notes?.trim() || null,
      status: FacultyEnrollmentRequestStatus.PENDING
    }
  });

  return {
    requested: true as const,
    alreadyEnrolled: false as const,
    request
  };
}

export async function sendFacultyEnrollmentInviteEmail(primaryEmailInput: string) {
  const primaryEmail = normalizeEmail(primaryEmailInput);
  const enrollUrl = appUrl(`/enroll?primaryEmail=${encodeURIComponent(primaryEmail)}`);

  const subject = "Please enroll in Faculty Teaching Feedback";
  const text = [
    "Hello,",
    "",
    "A student was unable to find you in the Uniformed Services University of the Health Sciences Department of Medicine Faculty Teaching Feedback system.",
    "",
    "If you would like to be added, please use the enrollment form below and provide:",
    "- First Name",
    "- Last Name",
    "- Primary Email",
    "- Secondary Email (optional)",
    "",
    `Enrollment form: ${enrollUrl}`,
    "",
    "Thank you."
  ].join("\n");

  const html = `<div style="font-family: Arial, sans-serif; color: #111; max-width: 640px;">
    <p>Hello,</p>
    <p>A student was unable to find you in the Uniformed Services University of the Health Sciences Department of Medicine Faculty Teaching Feedback system.</p>
    <p>If you would like to be added, please use the enrollment form below and provide:</p>
    <ul>
      <li>First Name</li>
      <li>Last Name</li>
      <li>Primary Email</li>
      <li>Secondary Email (optional)</li>
    </ul>
    <p><a href="${enrollUrl}">Complete the faculty enrollment form</a></p>
    <p>Thank you.</p>
  </div>`;

  const providerMessageId = await sendTransactionalEmail({
    to: primaryEmail,
    subject,
    html,
    text
  });

  return {
    primaryEmail,
    providerMessageId
  };
}

export async function listFacultyEnrollmentRequests(
  status?: FacultyEnrollmentRequestStatus
) {
  return prisma.facultyEnrollmentRequest.findMany({
    where: status ? { status } : undefined,
    include: {
      reviewedByAdmin: {
        select: {
          id: true,
          email: true,
          name: true
        }
      },
      createdFaculty: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          primaryEmail: true
        }
      }
    },
    orderBy: [{ status: "asc" }, { requestedAt: "desc" }]
  });
}

export async function countPendingFacultyEnrollmentRequests() {
  return prisma.facultyEnrollmentRequest.count({
    where: { status: FacultyEnrollmentRequestStatus.PENDING }
  });
}

export async function approveFacultyEnrollmentRequest(
  requestId: string,
  adminUserId: string,
  decisionNotes?: string
) {
  const result = await prisma.$transaction(async (tx) => {
    const request = await tx.facultyEnrollmentRequest.findUnique({
      where: { id: requestId }
    });

    if (!request) {
      throw new Error("Enrollment request not found");
    }

    if (request.status !== FacultyEnrollmentRequestStatus.PENDING) {
      throw new Error("Enrollment request is already reviewed");
    }

    const emails = [request.primaryEmail, request.secondaryEmail].filter((entry): entry is string => Boolean(entry));
    const existingFaculty = await tx.faculty.findFirst({
      where: { OR: emailMatchConditions(emails) }
    });

    const reviewedAt = new Date();
    if (existingFaculty) {
      const updatedRequest = await tx.facultyEnrollmentRequest.update({
        where: { id: requestId },
        data: {
          status: FacultyEnrollmentRequestStatus.APPROVED,
          reviewedAt,
          reviewedByAdminId: adminUserId,
          createdFacultyId: existingFaculty.id,
          decisionNotes: decisionNotes?.trim() || "Faculty already existed in directory."
        },
        include: {
          reviewedByAdmin: {
            select: { id: true, email: true, name: true }
          },
          createdFaculty: {
            select: { id: true, firstName: true, lastName: true, primaryEmail: true }
          }
        }
      });

      return { created: false as const, request: updatedRequest, faculty: existingFaculty };
    }

    const token = await generateUniquePublicTokenTx(tx);
    const faculty = await tx.faculty.create({
      data: {
        firstName: request.firstName,
        lastName: request.lastName,
        primaryEmail: request.primaryEmail,
        secondaryEmail: request.secondaryEmail,
        activeStatus: true,
        digestSubscriptionStatus: DigestSubscriptionStatus.SUBSCRIBED,
        publicToken: token,
        department: "Department of Medicine"
      }
    });

    const updatedRequest = await tx.facultyEnrollmentRequest.update({
      where: { id: requestId },
      data: {
        status: FacultyEnrollmentRequestStatus.APPROVED,
        reviewedAt,
        reviewedByAdminId: adminUserId,
        createdFacultyId: faculty.id,
        decisionNotes: decisionNotes?.trim() || null
      },
      include: {
        reviewedByAdmin: {
          select: { id: true, email: true, name: true }
        },
        createdFaculty: {
          select: { id: true, firstName: true, lastName: true, primaryEmail: true }
        }
      }
    });

    return { created: true as const, request: updatedRequest, faculty };
  });

  await recordAuditLog({
    adminUserId,
    action: "faculty_enrollment_request.approve",
    entityType: "faculty_enrollment_request",
    entityId: requestId,
    metadata: {
      createdFaculty: result.created,
      facultyId: result.faculty.id
    }
  });

  return result;
}

export async function denyFacultyEnrollmentRequest(
  requestId: string,
  adminUserId: string,
  decisionNotes?: string
) {
  const request = await prisma.facultyEnrollmentRequest.findUnique({
    where: { id: requestId }
  });

  if (!request) {
    throw new Error("Enrollment request not found");
  }

  if (request.status !== FacultyEnrollmentRequestStatus.PENDING) {
    throw new Error("Enrollment request is already reviewed");
  }

  const denied = await prisma.facultyEnrollmentRequest.update({
    where: { id: requestId },
    data: {
      status: FacultyEnrollmentRequestStatus.DENIED,
      reviewedAt: new Date(),
      reviewedByAdminId: adminUserId,
      decisionNotes: decisionNotes?.trim() || null
    },
    include: {
      reviewedByAdmin: {
        select: { id: true, email: true, name: true }
      },
      createdFaculty: {
        select: { id: true, firstName: true, lastName: true, primaryEmail: true }
      }
    }
  });

  await recordAuditLog({
    adminUserId,
    action: "faculty_enrollment_request.deny",
    entityType: "faculty_enrollment_request",
    entityId: requestId,
    metadata: {
      decisionNotes: decisionNotes?.trim() || null
    }
  });

  return denied;
}
