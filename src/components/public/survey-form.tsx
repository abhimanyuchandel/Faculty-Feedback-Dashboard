"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  GLOBAL_QUESTION_ORDER_SCOPE,
  getQuestionOrderForScope,
  selectQuestionSetForPhase
} from "@/lib/survey/question-config";

type QuestionType = "LIKERT" | "MULTIPLE_CHOICE" | "MULTI_SELECT" | "NUMERIC" | "FREE_TEXT";

type Option = {
  id: string;
  label: string;
  value: string;
  orderIndex: number;
};

type Question = {
  id: string;
  prompt: string;
  helpText: string | null;
  type: QuestionType;
  required: boolean;
  orderIndex: number;
  phaseIds: string[];
  config: unknown;
  options: Option[];
};

type CurriculumPhase = {
  id: string;
  name: string;
};

type Props = {
  facultyToken: string;
  surveyVersionId: string;
  curriculumPhases: CurriculumPhase[];
  sessionOptions: Array<{
    id: string;
    curriculumPhaseId: string;
    label: string;
  }>;
  questions: Question[];
};

type AnswerValue = string | number | string[] | null;

export function SurveyForm(props: Props) {
  const router = useRouter();
  const [phaseId, setPhaseId] = useState("");
  const [selectedSessionId, setSelectedSessionId] = useState("");
  const [teachingSessionDate, setTeachingSessionDate] = useState("");
  const [answers, setAnswers] = useState<Record<string, AnswerValue>>({});
  const [captchaToken, setCaptchaToken] = useState("dev-captcha-token");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const orderedQuestions = useMemo(
    () => [...props.questions].sort((a, b) => a.orderIndex - b.orderIndex),
    [props.questions]
  );

  const selectedPhaseName = useMemo(
    () => props.curriculumPhases.find((phase) => phase.id === phaseId)?.name ?? "",
    [phaseId, props.curriculumPhases]
  );
  const requiresStudentSessionDate = useMemo(
    () => isIcsOrIcrPhase(selectedPhaseName),
    [selectedPhaseName]
  );

  const visibleQuestions = useMemo(() => {
    if (!phaseId) {
      return [];
    }

    const isClerkship = selectedPhaseName.toLowerCase().includes("clerkship");

    const phaseQuestions = selectQuestionSetForPhase(orderedQuestions, phaseId, (question) => question.phaseIds);

    return [...phaseQuestions].sort((a, b) => {
      if (isClerkship) {
        const normalizedA = a.prompt.trim().toLowerCase();
        const normalizedB = b.prompt.trim().toLowerCase();
        const rank = (normalizedPrompt: string) => {
          if (normalizedPrompt === "when did you work with this faculty?") return 0;
          if (normalizedPrompt === "teaching site") return 1;
          return 10;
        };

        const rankA = rank(normalizedA);
        const rankB = rank(normalizedB);
        if (rankA !== rankB) {
          return rankA - rankB;
        }
      }

      const scopedA = getQuestionOrderForScope(a.config, phaseId) ?? getQuestionOrderForScope(a.config, GLOBAL_QUESTION_ORDER_SCOPE);
      const scopedB = getQuestionOrderForScope(b.config, phaseId) ?? getQuestionOrderForScope(b.config, GLOBAL_QUESTION_ORDER_SCOPE);
      if (scopedA !== null && scopedB !== null && scopedA !== scopedB) {
        return scopedA - scopedB;
      }
      if (scopedA !== null && scopedB === null) {
        return -1;
      }
      if (scopedA === null && scopedB !== null) {
        return 1;
      }

      return a.orderIndex - b.orderIndex;
    });
  }, [orderedQuestions, phaseId, selectedPhaseName]);

  const sessionsForSelectedPhase = useMemo(
    () => props.sessionOptions.filter((session) => session.curriculumPhaseId === phaseId),
    [props.sessionOptions, phaseId]
  );

  useEffect(() => {
    if (requiresStudentSessionDate) {
      setSelectedSessionId("");
      return;
    }

    if (!phaseId || sessionsForSelectedPhase.length === 0) {
      setSelectedSessionId("");
      return;
    }

    if (sessionsForSelectedPhase.length === 1) {
      setSelectedSessionId(sessionsForSelectedPhase[0].id);
      return;
    }

    if (!sessionsForSelectedPhase.some((session) => session.id === selectedSessionId)) {
      setSelectedSessionId("");
    }
  }, [phaseId, requiresStudentSessionDate, sessionsForSelectedPhase, selectedSessionId]);

  useEffect(() => {
    if (!requiresStudentSessionDate) {
      setTeachingSessionDate("");
    }
  }, [requiresStudentSessionDate]);

  function setAnswer(questionId: string, value: AnswerValue) {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  }

  function toggleMultiSelect(questionId: string, value: string) {
    const current = (answers[questionId] as string[] | undefined) ?? [];
    if (current.includes(value)) {
      setAnswer(
        questionId,
        current.filter((entry) => entry !== value)
      );
    } else {
      setAnswer(questionId, [...current, value]);
    }
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    if (!phaseId) {
      setError("Please select a curriculum phase.");
      return;
    }

    if (requiresStudentSessionDate && !teachingSessionDate) {
      setError("Please select the teaching session date.");
      return;
    }

    if (!requiresStudentSessionDate && sessionsForSelectedPhase.length > 0 && !selectedSessionId) {
      setError("Please select the teaching session/location for this phase.");
      return;
    }

    for (const question of visibleQuestions) {
      if (!question.required) {
        continue;
      }

      const value = answers[question.id];
      const empty =
        value === undefined ||
        value === null ||
        value === "" ||
        (Array.isArray(value) && value.length === 0);

      if (empty) {
        setError(`Please answer required question: ${question.prompt}`);
        return;
      }

      if (question.type === "MULTIPLE_CHOICE" && isSearchableChoiceQuestion(question)) {
        const typed = typeof value === "string" ? value.trim() : "";
        if (typed && !question.options.some((option) => option.value === typed)) {
          setError(`Please choose a valid option for question: ${question.prompt}`);
          return;
        }
      }
    }

    setSubmitting(true);

    try {
      const response = await fetch("/api/public/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          facultyToken: props.facultyToken,
          curriculumPhaseId: phaseId,
          surveyVersionId: props.surveyVersionId,
          teachingSessionId: !requiresStudentSessionDate ? selectedSessionId || undefined : undefined,
          teachingSessionDate: requiresStudentSessionDate ? teachingSessionDate : undefined,
          captchaToken,
          answers: visibleQuestions
            .filter((q) => answers[q.id] !== undefined)
            .map((q) => ({
              questionId: q.id,
              questionType: q.type,
              value: answers[q.id]
            }))
        })
      });

      const data = (await response.json()) as { message?: string };
      if (!response.ok) {
        throw new Error(data.message ?? "Submission failed");
      }

      router.push("/thanks");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="card" onSubmit={onSubmit}>
      <h2>Anonymous Feedback Survey</h2>
      <p className="muted">No student-identifying information is collected.</p>

      <div style={{ marginBottom: "1rem" }}>
        <label className="label" htmlFor="phase">
          Curriculum phase
        </label>
        <select id="phase" className="select" value={phaseId} onChange={(e) => setPhaseId(e.target.value)} required>
          <option value="">Select phase</option>
          {props.curriculumPhases.map((phase) => (
            <option value={phase.id} key={phase.id}>
              {phase.name}
            </option>
          ))}
        </select>
      </div>

      {phaseId && requiresStudentSessionDate ? (
        <div style={{ marginBottom: "1rem" }}>
          <label className="label" htmlFor="teaching-session-date">
            Teaching session date
          </label>
          <input
            id="teaching-session-date"
            className="input"
            type="date"
            value={teachingSessionDate}
            onChange={(event) => setTeachingSessionDate(event.target.value)}
            required
          />
        </div>
      ) : null}

      {!requiresStudentSessionDate && sessionsForSelectedPhase.length > 0 ? (
        <div style={{ marginBottom: "1rem" }}>
          <label className="label" htmlFor="session">
            Teaching session/location
          </label>
          <select
            id="session"
            className="select"
            value={selectedSessionId}
            onChange={(event) => setSelectedSessionId(event.target.value)}
            required
          >
            <option value="">Select session</option>
            {sessionsForSelectedPhase.map((session) => (
              <option key={session.id} value={session.id}>
                {session.label}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      {!phaseId ? <p className="muted">Select a curriculum phase to load phase-specific questions.</p> : null}

      {phaseId && visibleQuestions.length === 0 ? (
        <div className="alert warn">No active questions are configured for this curriculum phase.</div>
      ) : null}

      {visibleQuestions.map((question) => (
        <div key={question.id} style={{ marginBottom: "1rem" }}>
          <label className="label">
            {question.prompt} {question.required ? "*" : ""}
          </label>
          {question.helpText ? <p className="muted">{question.helpText}</p> : null}

          {question.type === "FREE_TEXT" ? (
            <textarea
              className="textarea"
              rows={4}
              value={String(answers[question.id] ?? "")}
              onChange={(event) => setAnswer(question.id, event.target.value)}
            />
          ) : null}

          {question.type === "NUMERIC" ? (
            <input
              className="input"
              type="number"
              min={0}
              step={1}
              value={String(answers[question.id] ?? "")}
              onChange={(event) => setAnswer(question.id, Number(event.target.value))}
            />
          ) : null}

          {(question.type === "LIKERT" || question.type === "MULTIPLE_CHOICE") ? (
            question.type === "MULTIPLE_CHOICE" && isSearchableChoiceQuestion(question) ? (
              <div>
                <input
                  className="input"
                  list={`q-search-${question.id}`}
                  value={typeof answers[question.id] === "string" ? String(answers[question.id]) : ""}
                  onChange={(event) => setAnswer(question.id, event.target.value)}
                  placeholder="Search by keyword and select a lecture"
                />
                <datalist id={`q-search-${question.id}`}>
                  {question.options.map((option) => (
                    <option key={option.id} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </datalist>
              </div>
            ) : (
            <div className="grid" style={{ gap: "0.4rem" }}>
              {question.options.map((option) => (
                <label key={option.id} style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                  <input
                    type="radio"
                    name={`q-${question.id}`}
                    checked={answers[question.id] === option.value}
                    onChange={() => setAnswer(question.id, option.value)}
                  />
                  <span>{option.label}</span>
                </label>
              ))}
            </div>
            )
          ) : null}

          {question.type === "MULTI_SELECT" ? (
            <div className="grid" style={{ gap: "0.4rem" }}>
              {question.options.map((option) => (
                <label key={option.id} style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                  <input
                    type="checkbox"
                    checked={((answers[question.id] as string[] | undefined) ?? []).includes(option.value)}
                    onChange={() => toggleMultiSelect(question.id, option.value)}
                  />
                  <span>{option.label}</span>
                </label>
              ))}
            </div>
          ) : null}
        </div>
      ))}

      <div style={{ marginBottom: "1rem" }}>
        <label className="label" htmlFor="captcha-token">
          CAPTCHA token (dev placeholder)
        </label>
        <input
          id="captcha-token"
          className="input"
          value={captchaToken}
          onChange={(event) => setCaptchaToken(event.target.value)}
          required
        />
      </div>

      {error ? <div className="alert error">{error}</div> : null}

      <button type="submit" className="btn primary" disabled={submitting}>
        {submitting ? "Submitting..." : "Submit anonymous feedback"}
      </button>
    </form>
  );
}

function isSearchableChoiceQuestion(question: Question) {
  if (!question.config || typeof question.config !== "object") {
    return false;
  }

  const searchable = (question.config as { searchable?: unknown }).searchable;
  return searchable === true;
}

function isIcsOrIcrPhase(phaseName: string) {
  const normalized = phaseName.trim().toLowerCase();
  return (
    /\bics\b/.test(normalized) ||
    /\bicr\b/.test(normalized) ||
    normalized.includes("clinical skills") ||
    normalized.includes("clinical reasoning")
  );
}
