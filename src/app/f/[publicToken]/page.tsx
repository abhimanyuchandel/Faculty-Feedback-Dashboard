import { notFound } from "next/navigation";
import Link from "next/link";
import { getFacultyByPublicToken } from "@/services/faculty-service";
import { getActiveSurveyVersion } from "@/services/survey-service";
import { prisma } from "@/lib/db/prisma";
import { SurveyForm } from "@/components/public/survey-form";
import { extractTargetPhaseIds } from "@/lib/survey/question-config";
import { getFoundationsLecturesForFaculty } from "@/lib/survey/foundations-lectures";

type Props = {
  params: Promise<{ publicToken: string }>;
};

export default async function FacultyFeedbackPage({ params }: Props) {
  const { publicToken } = await params;

  const faculty = await getFacultyByPublicToken(publicToken);
  if (!faculty || !faculty.activeStatus) {
    notFound();
  }

  const surveyVersion = await getActiveSurveyVersion();
  const allCurriculumPhases = await prisma.curriculumPhase.findMany({
    where: { activeStatus: true },
    orderBy: { sortOrder: "asc" },
    select: { id: true, name: true, sortOrder: true }
  });

  if (!surveyVersion) {
    return (
      <main className="page">
        <section className="container" style={{ maxWidth: "900px" }}>
          <div className="alert warn">No active survey is currently published.</div>
        </section>
      </main>
    );
  }

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(todayStart);
  todayEnd.setDate(todayEnd.getDate() + 1);

  const todaysSessions = await prisma.teachingSession.findMany({
    where: {
      activeStatus: true,
      sessionDate: {
        gte: todayStart,
        lt: todayEnd
      },
      facultyAssignments: {
        some: { facultyId: faculty.id }
      }
    },
    select: {
      id: true,
      title: true,
      curriculumPhaseId: true,
      location: true,
      curriculumPhase: {
        select: { id: true, name: true, sortOrder: true }
      }
    },
    orderBy: [{ startAt: "asc" }]
  });

  const curriculumPhases = allCurriculumPhases.map((phase) => ({ id: phase.id, name: phase.name }));

  const sessionOptions = todaysSessions.map((session) => ({
    id: session.id,
    curriculumPhaseId: session.curriculumPhaseId,
    label: `${session.title} - ${session.location}`
  }));

  const foundationsPhaseId =
    allCurriculumPhases.find((phase) => phase.name.toLowerCase().includes("foundations"))?.id ?? null;
  const foundationsLectureOptions = getFoundationsLecturesForFaculty(faculty.firstName, faculty.lastName);
  const resolvedQuestions = surveyVersion.questions.map((question) => {
    const phaseIds = extractTargetPhaseIds(question.config);
    const isFoundationsLectureQuestion =
      question.prompt.trim().toLowerCase() === "which lecture are you providing feedback on?";
    const isFoundationsSpecific = Boolean(foundationsPhaseId && phaseIds.includes(foundationsPhaseId));

    const options =
      isFoundationsLectureQuestion && isFoundationsSpecific
        ? foundationsLectureOptions.map((lecture, index) => ({
            id: `foundations-lecture-${index + 1}`,
            label: lecture,
            value: lecture,
            orderIndex: index + 1
          }))
        : question.options;

    return {
      id: question.id,
      prompt: question.prompt,
      helpText: question.helpText,
      type: question.type,
      required: question.required,
      orderIndex: question.orderIndex,
      phaseIds,
      config: question.config,
      options
    };
  });

  return (
    <main className="page">
      <section className="container" style={{ maxWidth: "900px" }}>
        <div style={{ marginBottom: "1rem" }}>
          <Link href="/search" className="btn ghost">
            Search another faculty
          </Link>
        </div>

        <div className="card" style={{ marginBottom: "1rem" }}>
          <h1>
            Feedback for {faculty.firstName} {faculty.lastName}
          </h1>
          <p className="muted">
            Feedback is anonymous and visible to faculty only as aggregated digest summaries grouped by curriculum
            phase.
          </p>
        </div>

        <SurveyForm
          facultyToken={faculty.publicToken}
          surveyVersionId={surveyVersion.id}
          curriculumPhases={curriculumPhases}
          sessionOptions={sessionOptions}
          questions={resolvedQuestions}
          captchaConfigured={Boolean(process.env.TURNSTILE_SECRET_KEY && process.env.TURNSTILE_SITE_KEY)}
          captchaSiteKey={process.env.TURNSTILE_SITE_KEY ?? ""}
        />
      </section>
    </main>
  );
}
