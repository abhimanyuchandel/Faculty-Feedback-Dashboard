import { QuestionType } from "@prisma/client";
import { z } from "zod";

export const facultyCreateSchema = z.object({
  firstName: z.string().trim().min(1).max(100),
  lastName: z.string().trim().min(1).max(100),
  primaryEmail: z.string().trim().email().toLowerCase(),
  secondaryEmail: z.string().trim().email().toLowerCase().optional().or(z.literal("")),
  activeStatus: z.boolean().default(true),
  digestSubscriptionStatus: z.enum(["SUBSCRIBED", "UNSUBSCRIBED"]).default("SUBSCRIBED")
});

export const facultySearchSchema = z.object({
  q: z.string().trim().min(1).max(120)
});

export const facultyEnrollmentInviteSchema = z.object({
  primaryEmail: z.string().trim().email().toLowerCase()
});

export const feedbackAnswerSchema = z.object({
  questionId: z.string().cuid(),
  questionType: z.nativeEnum(QuestionType),
  value: z.union([z.number(), z.string(), z.array(z.string()), z.null()])
});

export const feedbackSubmissionSchema = z.object({
  facultyToken: z.string().min(6).max(64),
  curriculumPhaseId: z.string().cuid(),
  surveyVersionId: z.string().cuid(),
  teachingSessionId: z.string().cuid().optional(),
  teachingSessionDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "teachingSessionDate must be YYYY-MM-DD").optional(),
  captchaToken: z.string().min(1),
  answers: z.array(feedbackAnswerSchema).min(1)
});

export const surveyQuestionDraftSchema = z.object({
  prompt: z.string().trim().min(1).max(1500),
  helpText: z.string().trim().max(1000).optional(),
  type: z.nativeEnum(QuestionType),
  required: z.boolean(),
  includeInDigest: z.boolean().default(true),
  activeStatus: z.boolean().default(true),
  options: z.array(z.object({
    label: z.string().trim().min(1),
    value: z.string().trim().min(1)
  })).optional(),
  config: z.record(z.string(), z.any()).optional()
});

export const sessionCreateSchema = z.object({
  title: z.string().trim().min(1).max(200),
  curriculumPhaseId: z.string().cuid(),
  sessionDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "sessionDate must be YYYY-MM-DD"),
  startAt: z.string().datetime().optional(),
  endAt: z.string().datetime().optional(),
  location: z.string().trim().min(1).max(200),
  notes: z.string().trim().max(2000).optional(),
  facultyIds: z.array(z.string().cuid()).default([])
});

export const facultyEnrollmentRequestSchema = z.object({
  firstName: z.string().trim().min(1).max(100),
  lastName: z.string().trim().min(1).max(100),
  primaryEmail: z.string().trim().email().toLowerCase(),
  secondaryEmail: z.string().trim().email().toLowerCase().optional().or(z.literal("")),
  notes: z.string().trim().max(2000).optional().or(z.literal(""))
});

export const adminUserCreateSchema = z.object({
  email: z.string().trim().email().toLowerCase(),
  name: z.string().trim().max(120).optional().or(z.literal("")),
  password: z.string().min(10).max(128),
  roles: z.array(z.enum(["admin", "reporting"])).min(1)
});
