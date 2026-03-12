import { Prisma, QuestionType, SurveyVersionStatus } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { recordAuditLog } from "@/lib/audit";
import {
  normalizeQuestionOrderScope,
  setQuestionOrderForScope
} from "@/lib/survey/question-config";

export async function getActiveSurveyVersion() {
  return prisma.surveyVersion.findFirst({
    where: { status: SurveyVersionStatus.PUBLISHED },
    include: {
      questions: {
        where: { activeStatus: true },
        include: { options: { where: { activeStatus: true }, orderBy: { orderIndex: "asc" } } },
        orderBy: { orderIndex: "asc" }
      }
    }
  });
}

export async function getSurveyVersionById(versionId: string) {
  return prisma.surveyVersion.findUnique({
    where: { id: versionId },
    include: {
      questions: {
        include: { options: { orderBy: { orderIndex: "asc" } } },
        orderBy: { orderIndex: "asc" }
      }
    }
  });
}

export async function createDraftSurveyVersion(label: string, createdById?: string) {
  const currentMax = await prisma.surveyVersion.aggregate({ _max: { versionNumber: true } });
  const versionNumber = (currentMax._max.versionNumber ?? 0) + 1;

  const created = await prisma.surveyVersion.create({
    data: {
      label,
      versionNumber,
      status: SurveyVersionStatus.DRAFT,
      createdById
    }
  });

  if (createdById) {
    await recordAuditLog({
      adminUserId: createdById,
      action: "survey.create_draft",
      entityType: "survey_version",
      entityId: created.id,
      metadata: { versionNumber, label }
    });
  }

  return created;
}

export async function updateQuestionOrder(
  versionId: string,
  orderedQuestionIds: string[],
  adminUserId?: string,
  scope?: string | null
) {
  if (orderedQuestionIds.length === 0) {
    throw new Error("questionIds cannot be empty");
  }

  const uniqueIds = [...new Set(orderedQuestionIds)];
  if (uniqueIds.length !== orderedQuestionIds.length) {
    throw new Error("questionIds must be unique");
  }

  const questions = await prisma.surveyQuestion.findMany({
    where: {
      surveyVersionId: versionId,
      id: { in: uniqueIds }
    },
    select: {
      id: true,
      config: true
    }
  });

  if (questions.length !== uniqueIds.length) {
    throw new Error("One or more questions were not found in this survey version");
  }

  const questionById = new Map(questions.map((question) => [question.id, question]));
  const normalizedScope = normalizeQuestionOrderScope(scope);

  await prisma.$transaction(
    uniqueIds.map((questionId, index) => {
      if (!normalizedScope) {
        return prisma.surveyQuestion.update({
          where: { id: questionId },
          data: { orderIndex: index + 1 }
        });
      }

      const existing = questionById.get(questionId);
      if (!existing) {
        throw new Error("Question not found while reordering");
      }

      return prisma.surveyQuestion.update({
        where: { id: questionId },
        data: {
          config: setQuestionOrderForScope(existing.config, normalizedScope, index + 1)
        }
      });
    })
  );

  if (adminUserId) {
    await recordAuditLog({
      adminUserId,
      action: "survey.reorder_questions",
      entityType: "survey_version",
      entityId: versionId,
      metadata: {
        questionCount: orderedQuestionIds.length,
        scope: normalizedScope ?? "ALL"
      }
    });
  }
}

export async function upsertQuestion(
  versionId: string,
  input: {
    id?: string;
    prompt: string;
    helpText?: string;
    type: QuestionType;
    required: boolean;
    includeInDigest?: boolean;
    activeStatus?: boolean;
    config?: Prisma.InputJsonValue | null;
    options?: { label: string; value: string }[];
  },
  adminUserId?: string
) {
  const version = await prisma.surveyVersion.findUnique({ where: { id: versionId } });
  if (!version) {
    throw new Error("Survey version not found");
  }

  const maxOrder = await prisma.surveyQuestion.aggregate({
    where: { surveyVersionId: versionId },
    _max: { orderIndex: true }
  });

  const normalizedConfig =
    input.config === undefined ? undefined : input.config === null ? Prisma.JsonNull : input.config;

  let question;
  if (version.status === SurveyVersionStatus.PUBLISHED) {
    if (input.id) {
      const existing = await prisma.surveyQuestion.findUnique({
        where: { id: input.id },
        select: { id: true, surveyVersionId: true }
      });

      if (!existing || existing.surveyVersionId !== versionId) {
        throw new Error("Question not found for this survey version");
      }

      question = await prisma.surveyQuestion.update({
        where: { id: input.id },
        data: {
          // Allow editing published questions; historical submissions keep snapshots.
          prompt: input.prompt,
          type: input.type,
          config: normalizedConfig,
          required: input.required,
          includeInDigest: input.includeInDigest ?? true,
          activeStatus: input.activeStatus ?? true,
          helpText: input.helpText
        }
      });

      await prisma.surveyQuestionOption.deleteMany({ where: { questionId: input.id } });

      if (input.options?.length) {
        await prisma.surveyQuestionOption.createMany({
          data: input.options.map((option, idx) => ({
            questionId: question.id,
            label: option.label,
            value: option.value,
            orderIndex: idx + 1
          }))
        });
      }
    } else {
      question = await prisma.surveyQuestion.create({
        data: {
          surveyVersionId: versionId,
          prompt: input.prompt,
          helpText: input.helpText,
          type: input.type,
          required: input.required,
          includeInDigest: input.includeInDigest ?? true,
          activeStatus: input.activeStatus ?? true,
          config: normalizedConfig,
          orderIndex: (maxOrder._max.orderIndex ?? 0) + 1
        }
      });

      if (input.options?.length) {
        await prisma.surveyQuestionOption.createMany({
          data: input.options.map((option, idx) => ({
            questionId: question.id,
            label: option.label,
            value: option.value,
            orderIndex: idx + 1
          }))
        });
      }
    }
  } else if (input.id) {
    question = await prisma.surveyQuestion.update({
      where: { id: input.id },
      data: {
        prompt: input.prompt,
        helpText: input.helpText,
        type: input.type,
        required: input.required,
        includeInDigest: input.includeInDigest ?? true,
        activeStatus: input.activeStatus ?? true,
        config: normalizedConfig
      }
    });

    await prisma.surveyQuestionOption.deleteMany({ where: { questionId: input.id } });
  } else {
    question = await prisma.surveyQuestion.create({
      data: {
        surveyVersionId: versionId,
        prompt: input.prompt,
        helpText: input.helpText,
        type: input.type,
        required: input.required,
        includeInDigest: input.includeInDigest ?? true,
        activeStatus: input.activeStatus ?? true,
        config: normalizedConfig,
        orderIndex: (maxOrder._max.orderIndex ?? 0) + 1
      }
    });
  }

  if (version.status === SurveyVersionStatus.PUBLISHED) {
    if (adminUserId) {
      await recordAuditLog({
        adminUserId,
        action: input.id ? "survey.update_published_question_settings" : "survey.add_question_to_published",
        entityType: "survey_question",
        entityId: question.id,
        metadata: { surveyVersionId: versionId }
      });
    }

    return question;
  }

  if (input.options?.length) {
    await prisma.surveyQuestionOption.createMany({
      data: input.options.map((option, idx) => ({
        questionId: question.id,
        label: option.label,
        value: option.value,
        orderIndex: idx + 1
      }))
    });
  }

  if (adminUserId) {
    await recordAuditLog({
      adminUserId,
      action: "survey.upsert_question",
      entityType: "survey_question",
      entityId: question.id,
      metadata: { surveyVersionId: versionId }
    });
  }

  return question;
}

export async function publishSurveyVersion(versionId: string, adminUserId?: string) {
  const version = await prisma.surveyVersion.findUnique({ where: { id: versionId } });
  if (!version) {
    throw new Error("Survey version not found");
  }

  const published = await prisma.$transaction(async (tx) => {
    await tx.surveyVersion.updateMany({
      where: { status: SurveyVersionStatus.PUBLISHED },
      data: { status: SurveyVersionStatus.ARCHIVED }
    });

    return tx.surveyVersion.update({
      where: { id: versionId },
      data: {
        status: SurveyVersionStatus.PUBLISHED,
        publishedAt: new Date()
      }
    });
  });

  if (adminUserId) {
    await recordAuditLog({
      adminUserId,
      action: "survey.publish_version",
      entityType: "survey_version",
      entityId: versionId,
      metadata: { versionNumber: version.versionNumber }
    });
  }

  return published;
}

export async function deleteQuestion(questionId: string, adminUserId?: string) {
  const deleted = await prisma.surveyQuestion.delete({ where: { id: questionId } });

  if (adminUserId) {
    await recordAuditLog({
      adminUserId,
      action: "survey.delete_question",
      entityType: "survey_question",
      entityId: questionId
    });
  }

  return deleted;
}

export async function deleteSurveyVersion(versionId: string, adminUserId?: string) {
  const version = await prisma.surveyVersion.findUnique({
    where: { id: versionId },
    include: {
      _count: {
        select: { feedbackSubmissions: true }
      }
    }
  });

  if (!version) {
    throw new Error("Survey version not found");
  }

  if (version._count.feedbackSubmissions > 0) {
    throw new Error("Survey version cannot be deleted because it has recorded submissions");
  }

  const deleted = await prisma.surveyVersion.delete({
    where: { id: versionId }
  });

  if (adminUserId) {
    await recordAuditLog({
      adminUserId,
      action: "survey.delete_version",
      entityType: "survey_version",
      entityId: versionId,
      metadata: {
        versionNumber: version.versionNumber,
        label: version.label
      }
    });
  }

  return deleted;
}
