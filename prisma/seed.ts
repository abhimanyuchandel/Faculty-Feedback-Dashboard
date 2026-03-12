import "dotenv/config";
import { Prisma, PrismaClient, QuestionType, SurveyVersionStatus } from "@prisma/client";
import { randomBytes } from "crypto";
import { getAllFoundationsLectures } from "../src/lib/survey/foundations-lectures";

const prisma = new PrismaClient();

const phases = [
  "Foundations - Cardio/Pulmonary/Renal Module",
  "Introduction to Clinical Skills (ICS)",
  "Introduction to Clinical Reasoning (ICR)",
  "Clerkship",
  "Advanced Clerkship Rotation"
];

const legacyPhases = [
  "Phase 1",
  "Phase 2",
  "Phase 3",
  "Sub-internship",
  "Elective"
];

function token(length = 8): string {
  return randomBytes(length).toString("base64url").slice(0, length).toUpperCase();
}

async function main() {
  for (let i = 0; i < phases.length; i += 1) {
    await prisma.curriculumPhase.upsert({
      where: { name: phases[i] },
      update: { sortOrder: i, activeStatus: true },
      create: { name: phases[i], sortOrder: i, activeStatus: true }
    });
  }

  await prisma.curriculumPhase.updateMany({
    where: { name: { in: legacyPhases } },
    data: { activeStatus: false }
  });

  const adminRole = await prisma.adminRole.upsert({
    where: { name: "admin" },
    update: {},
    create: {
      name: "admin",
      description: "Full dashboard access"
    }
  });

  const reportingRole = await prisma.adminRole.upsert({
    where: { name: "reporting" },
    update: {},
    create: {
      name: "reporting",
      description: "Read-only analytics and exports"
    }
  });

  const bootstrapAdminEmail = process.env.BOOTSTRAP_ADMIN_EMAIL;
  if (bootstrapAdminEmail) {
    const admin = await prisma.user.upsert({
      where: { email: bootstrapAdminEmail },
      update: { activeStatus: true },
      create: { email: bootstrapAdminEmail, activeStatus: true }
    });

    await prisma.adminUserRole.upsert({
      where: {
        userId_roleId: {
          userId: admin.id,
          roleId: adminRole.id
        }
      },
      update: {},
      create: {
        userId: admin.id,
        roleId: adminRole.id
      }
    });

    await prisma.adminUserRole.upsert({
      where: {
        userId_roleId: {
          userId: admin.id,
          roleId: reportingRole.id
        }
      },
      update: {},
      create: {
        userId: admin.id,
        roleId: reportingRole.id
      }
    });
  }

  const surveyV1 = await prisma.surveyVersion.upsert({
    where: { versionNumber: 1 },
    update: {
      label: "Default v1",
      status: SurveyVersionStatus.PUBLISHED,
      publishedAt: new Date()
    },
    create: {
      versionNumber: 1,
      label: "Default v1",
      status: SurveyVersionStatus.PUBLISHED,
      publishedAt: new Date()
    }
  });

  const existingQuestions = await prisma.surveyQuestion.count({
    where: { surveyVersionId: surveyV1.id }
  });

  if (existingQuestions === 0) {
    const q1 = await prisma.surveyQuestion.create({
      data: {
        surveyVersionId: surveyV1.id,
        prompt: "The faculty member created a respectful learning environment.",
        type: QuestionType.LIKERT,
        required: true,
        orderIndex: 1,
        config: {
          min: 1,
          max: 5,
          labels: ["Strongly Disagree", "Disagree", "Neutral", "Agree", "Strongly Agree"]
        }
      }
    });

    await prisma.surveyQuestionOption.createMany({
      data: [
        { questionId: q1.id, label: "1", value: "1", orderIndex: 1 },
        { questionId: q1.id, label: "2", value: "2", orderIndex: 2 },
        { questionId: q1.id, label: "3", value: "3", orderIndex: 3 },
        { questionId: q1.id, label: "4", value: "4", orderIndex: 4 },
        { questionId: q1.id, label: "5", value: "5", orderIndex: 5 }
      ]
    });

    await prisma.surveyQuestion.create({
      data: {
        surveyVersionId: surveyV1.id,
        prompt: "What did this faculty member do well?",
        type: QuestionType.FREE_TEXT,
        required: false,
        orderIndex: 2
      }
    });

    await prisma.surveyQuestion.create({
      data: {
        surveyVersionId: surveyV1.id,
        prompt: "What is one thing this faculty member could improve?",
        type: QuestionType.FREE_TEXT,
        required: false,
        orderIndex: 3
      }
    });
  }

  const clerkshipPhase = await prisma.curriculumPhase.findFirst({
    where: {
      activeStatus: true,
      name: { contains: "Clerkship", mode: "insensitive" }
    },
    orderBy: { sortOrder: "asc" }
  });

  if (clerkshipPhase) {
    let nextOrder =
      (
        await prisma.surveyQuestion.aggregate({
          where: { surveyVersionId: surveyV1.id },
          _max: { orderIndex: true }
        })
      )._max.orderIndex ?? 0;

    const clerkshipConfig: Prisma.InputJsonObject = { phaseIds: [clerkshipPhase.id] };

    async function upsertClerkshipQuestion(input: {
      prompt: string;
      type: QuestionType;
      required: boolean;
      helpText?: string;
      options?: Array<{ label: string; value: string }>;
      config?: Prisma.InputJsonObject;
    }) {
      const existing = await prisma.surveyQuestion.findFirst({
        where: {
          surveyVersionId: surveyV1.id,
          prompt: input.prompt
        }
      });

      const question = existing
        ? await prisma.surveyQuestion.update({
            where: { id: existing.id },
            data: {
              type: input.type,
              required: input.required,
              helpText: input.helpText,
              activeStatus: true,
              config: input.config ?? clerkshipConfig
            }
          })
        : await prisma.surveyQuestion.create({
            data: {
              surveyVersionId: surveyV1.id,
              prompt: input.prompt,
              type: input.type,
              required: input.required,
              helpText: input.helpText,
              activeStatus: true,
              config: input.config ?? clerkshipConfig,
              orderIndex: (nextOrder += 1)
            }
          });

      await prisma.surveyQuestionOption.deleteMany({
        where: { questionId: question.id }
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

    const teachingSites = [
      "DC VA",
      "Fort Belvoir",
      "Madigan",
      "Keesler",
      "Portsmouth",
      "San Diego",
      "San Antonio",
      "Tripler",
      "Walter Reed",
      "Wright-Patterson",
      "Other"
    ];

    await upsertClerkshipQuestion({
      prompt: "When did you work with this faculty?",
      type: QuestionType.MULTIPLE_CHOICE,
      required: true,
      options: [
        { label: "Clinically", value: "Clinically" },
        { label: "Preceptor", value: "Preceptor" },
        {
          label: "Interactive Small group teaching session",
          value: "Interactive Small group teaching session"
        }
      ]
    });

    await upsertClerkshipQuestion({
      prompt: "Teaching Site",
      type: QuestionType.MULTIPLE_CHOICE,
      required: true,
      options: teachingSites.map((site) => ({ label: site, value: site }))
    });

    const clerkshipLikertOptions = [
      { label: "Not done / needs improvement", value: "1" },
      { label: "Done sometimes / done OK", value: "2" },
      { label: "Done often / done well", value: "3" },
      { label: "Done always / excellent", value: "4" }
    ];

    const clerkshipLikertPrompts = [
      "My attending gave me feedback about my presentations and progress.",
      "My attending created a positive learning climate for students.",
      "Attending rounds started and ended on time.",
      "My attending reviewed important physical findings at the bedside.",
      "My attending allowed me to present my patients during rounds.",
      "My attending encouraged me to learn on my own.",
      "My attending set learning goals for students.",
      "My attending explained things clearly.",
      "My attending was available for discussions on patients.",
      "My attending was a positive role model.",
      "My attending was an effective teacher."
    ];

    for (const prompt of clerkshipLikertPrompts) {
      await upsertClerkshipQuestion({
        prompt,
        type: QuestionType.LIKERT,
        required: true,
        options: clerkshipLikertOptions,
        config: {
          phaseIds: [clerkshipPhase.id],
          min: 1,
          max: 4,
          labels: clerkshipLikertOptions.map((entry) => entry.label)
        }
      });
    }

    await upsertClerkshipQuestion({
      prompt:
        "Approximately how many times, if at all, did your attending observe you performing at least a portion of a history and/or physical exam?",
      type: QuestionType.NUMERIC,
      required: false,
      helpText: "Enter a number (0 or greater)."
    });

    await upsertClerkshipQuestion({
      prompt:
        "What did this attending do well (must sustain)? Any pearl(s) or technique(s) taught especially well?",
      type: QuestionType.FREE_TEXT,
      required: false
    });

    await upsertClerkshipQuestion({
      prompt: "How could this teacher and/or this wards experience improve?",
      type: QuestionType.FREE_TEXT,
      required: false
    });

    await upsertClerkshipQuestion({
      prompt:
        "If you want to add any comments to the site/clerkship director that will NOT go directly to the faculty member, add them here.",
      type: QuestionType.FREE_TEXT,
      required: false
    });

    const advancedClerkshipPhase = await prisma.curriculumPhase.findFirst({
      where: {
        activeStatus: true,
        name: { contains: "Advanced Clerkship", mode: "insensitive" }
      },
      orderBy: { sortOrder: "asc" }
    });

    if (advancedClerkshipPhase) {
      const clerkshipQuestions = await prisma.surveyQuestion.findMany({
        where: {
          surveyVersionId: surveyV1.id
        },
        select: {
          id: true,
          prompt: true,
          config: true
        }
      });

      for (const question of clerkshipQuestions) {
        const prompt = question.prompt.trim().toLowerCase();
        if (prompt === "when did you work with this faculty?") {
          continue;
        }

        const config =
          question.config && typeof question.config === "object" && !Array.isArray(question.config)
            ? ({ ...(question.config as Record<string, unknown>) } as Record<string, unknown>)
            : null;

        if (!config) {
          continue;
        }

        const phaseIdsValue = config.phaseIds;
        if (!Array.isArray(phaseIdsValue)) {
          continue;
        }

        const phaseIds = phaseIdsValue.filter((entry): entry is string => typeof entry === "string");
        if (!phaseIds.includes(clerkshipPhase.id) || phaseIds.includes(advancedClerkshipPhase.id)) {
          continue;
        }

        const nextPhaseIds = [...phaseIds, advancedClerkshipPhase.id];
        await prisma.surveyQuestion.update({
          where: { id: question.id },
          data: {
            config: {
              ...config,
              phaseIds: nextPhaseIds
            }
          }
        });
      }
    }
  }

  const foundationsPhase = await prisma.curriculumPhase.findFirst({
    where: {
      activeStatus: true,
      name: { contains: "Foundations", mode: "insensitive" }
    },
    orderBy: { sortOrder: "asc" }
  });

  if (foundationsPhase) {
    let nextOrder =
      (
        await prisma.surveyQuestion.aggregate({
          where: { surveyVersionId: surveyV1.id },
          _max: { orderIndex: true }
        })
      )._max.orderIndex ?? 0;

    const foundationsConfig: Prisma.InputJsonObject = { phaseIds: [foundationsPhase.id] };

    async function upsertFoundationsQuestion(input: {
      prompt: string;
      type: QuestionType;
      required: boolean;
      helpText?: string;
      options?: Array<{ label: string; value: string }>;
      config?: Prisma.InputJsonObject;
    }) {
      const existing = await prisma.surveyQuestion.findFirst({
        where: {
          surveyVersionId: surveyV1.id,
          prompt: input.prompt
        }
      });

      const question = existing
        ? await prisma.surveyQuestion.update({
            where: { id: existing.id },
            data: {
              type: input.type,
              required: input.required,
              helpText: input.helpText,
              activeStatus: true,
              config: input.config ?? foundationsConfig
            }
          })
        : await prisma.surveyQuestion.create({
            data: {
              surveyVersionId: surveyV1.id,
              prompt: input.prompt,
              type: input.type,
              required: input.required,
              helpText: input.helpText,
              activeStatus: true,
              config: input.config ?? foundationsConfig,
              orderIndex: (nextOrder += 1)
            }
          });

      await prisma.surveyQuestionOption.deleteMany({
        where: { questionId: question.id }
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

    await upsertFoundationsQuestion({
      prompt: "Which lecture are you providing feedback on?",
      type: QuestionType.MULTIPLE_CHOICE,
      required: true,
      helpText: "Search by keyword, then choose the exact lecture from the list.",
      options: getAllFoundationsLectures().map((lecture) => ({ label: lecture, value: lecture })),
      config: {
        phaseIds: [foundationsPhase.id],
        searchable: true,
        optionSource: "foundations_faculty_lecture_map"
      }
    });

    await upsertFoundationsQuestion({
      prompt: "Please rate the overall quality of this lecture (or lecture series):",
      type: QuestionType.MULTIPLE_CHOICE,
      required: true,
      options: [
        { label: "Excellent", value: "Excellent" },
        { label: "Very good", value: "Very good" },
        { label: "Good", value: "Good" },
        { label: "Fair", value: "Fair" },
        { label: "Poor", value: "Poor" }
      ]
    });

    await upsertFoundationsQuestion({
      prompt: "Did this lecture (or lecture series) meet its stated objectives?",
      type: QuestionType.MULTIPLE_CHOICE,
      required: true,
      options: [
        { label: "Yes", value: "Yes" },
        { label: "No", value: "No" }
      ]
    });

    await upsertFoundationsQuestion({
      prompt: "What are 1-3 things to improve about this lecture (or lecture series)?",
      type: QuestionType.FREE_TEXT,
      required: false
    });

    await upsertFoundationsQuestion({
      prompt: "What are 1-3 things to sustain about this lecture (or lecture series)?",
      type: QuestionType.FREE_TEXT,
      required: false
    });
  }

  const sampleFaculty = [
    ["Alice", "Bennett", "alice.bennett@medicine.example.org"],
    ["Michael", "Chen", "michael.chen@medicine.example.org"],
    ["Priya", "Nair", "priya.nair@medicine.example.org"],
    ["Samuel", "Rivera", "samuel.rivera@medicine.example.org"]
  ];

  for (const [firstName, lastName, primaryEmail] of sampleFaculty) {
    await prisma.faculty.upsert({
      where: { primaryEmail },
      update: { activeStatus: true },
      create: {
        firstName,
        lastName,
        primaryEmail,
        publicToken: token(8),
        department: "Department of Medicine"
      }
    });
  }

  console.log("Seed complete");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
