"use client";

import { useEffect, useMemo, useState } from "react";
import {
  extractTargetPhaseIds,
  getQuestionOrderForScope,
  normalizeQuestionOrderScope,
  selectQuestionSetForPhase
} from "@/lib/survey/question-config";

type QuestionType = "LIKERT" | "MULTIPLE_CHOICE" | "MULTI_SELECT" | "NUMERIC" | "FREE_TEXT";
type SurveyVersionStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";

type SurveyVersionRow = {
  id: string;
  versionNumber: number;
  label: string;
  status: SurveyVersionStatus;
  publishedAt: string | null;
  _count: { questions: number; feedbackSubmissions: number };
};

type SurveyQuestion = {
  id: string;
  prompt: string;
  helpText: string | null;
  type: QuestionType;
  required: boolean;
  includeInDigest: boolean;
  activeStatus: boolean;
  orderIndex: number;
  config: unknown;
  options: Array<{ id: string; label: string; value: string }>;
};

type SurveyVersionDetail = {
  id: string;
  versionNumber: number;
  label: string;
  status: SurveyVersionStatus;
  questions: SurveyQuestion[];
};

type CurriculumPhase = {
  id: string;
  name: string;
  sortOrder: number;
};

type QuestionEdit = {
  required: boolean;
  includeInDigest: boolean;
  activeStatus: boolean;
};

const QUESTION_TYPES: QuestionType[] = ["LIKERT", "MULTIPLE_CHOICE", "MULTI_SELECT", "NUMERIC", "FREE_TEXT"];

export function SurveyBuilderPanel() {
  const [versions, setVersions] = useState<SurveyVersionRow[]>([]);
  const [selectedVersionId, setSelectedVersionId] = useState<string>("");
  const [detail, setDetail] = useState<SurveyVersionDetail | null>(null);
  const [curriculumPhases, setCurriculumPhases] = useState<CurriculumPhase[]>([]);
  const [newLabel, setNewLabel] = useState("New Draft Survey");
  const [questionPhaseFilter, setQuestionPhaseFilter] = useState("ALL");

  const [prompt, setPrompt] = useState("");
  const [helpText, setHelpText] = useState("");
  const [questionType, setQuestionType] = useState<QuestionType>("FREE_TEXT");
  const [required, setRequired] = useState(false);
  const [includeInDigest, setIncludeInDigest] = useState(true);
  const [optionsText, setOptionsText] = useState("1\n2\n3\n4\n5");
  const [targetPhaseIds, setTargetPhaseIds] = useState<string[]>([]);
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);

  const [questionEdits, setQuestionEdits] = useState<Record<string, QuestionEdit>>({});
  const [savingAll, setSavingAll] = useState(false);
  const [savingOrder, setSavingOrder] = useState(false);
  const [draggingQuestionId, setDraggingQuestionId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function loadVersions() {
    const response = await fetch("/api/admin/surveys");
    const data = (await response.json()) as { versions: SurveyVersionRow[] };
    const nextVersions = data.versions ?? [];
    setVersions(nextVersions);

    const hasCurrentSelection = selectedVersionId && nextVersions.some((version) => version.id === selectedVersionId);

    if (!hasCurrentSelection && nextVersions.length) {
      const preferredVersion =
        nextVersions.find((version) => version.status === "PUBLISHED") ?? nextVersions[0];

      setSelectedVersionId(preferredVersion.id);
      await loadVersion(preferredVersion.id);
      return;
    }

    if (!nextVersions.length) {
      setSelectedVersionId("");
      setDetail(null);
      setQuestionEdits({});
    }
  }

  async function loadCurriculumPhases() {
    const response = await fetch("/api/admin/curriculum-phases");
    const data = (await response.json()) as { curriculumPhases: CurriculumPhase[] };
    setCurriculumPhases(data.curriculumPhases ?? []);
  }

  async function loadVersion(versionId: string) {
    const response = await fetch(`/api/admin/surveys?versionId=${versionId}`);
    const data = (await response.json()) as { version: SurveyVersionDetail };
    const version = data.version ?? null;
    setDetail(version);

    if (version) {
      setQuestionEdits(
        Object.fromEntries(
          version.questions.map((question) => [
            question.id,
            {
              required: question.required,
              includeInDigest: question.includeInDigest,
              activeStatus: question.activeStatus
            }
          ])
        )
      );
      setEditingQuestionId((current) =>
        current && version.questions.some((question) => question.id === current) ? current : null
      );
    } else {
      setQuestionEdits({});
      setEditingQuestionId(null);
    }
  }

  useEffect(() => {
    void loadVersions();
    void loadCurriculumPhases();
  }, []);

  useEffect(() => {
    if (selectedVersionId) {
      void loadVersion(selectedVersionId);
    }
  }, [selectedVersionId]);

  const dirtyQuestionIds = useMemo(() => {
    if (!detail) {
      return [];
    }

    return detail.questions
      .filter((question) => {
        const edit = questionEdits[question.id];
        if (!edit) {
          return false;
        }
        return (
          edit.required !== question.required ||
          edit.includeInDigest !== question.includeInDigest ||
          edit.activeStatus !== question.activeStatus
        );
      })
      .map((question) => question.id);
  }, [detail, questionEdits]);

  const hasUnsavedChanges = dirtyQuestionIds.length > 0;

  useEffect(() => {
    if (!hasUnsavedChanges) {
      return;
    }

    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [hasUnsavedChanges]);

  const orderScope = useMemo(
    () => normalizeQuestionOrderScope(questionPhaseFilter),
    [questionPhaseFilter]
  );

  const canReorderInScope = useMemo(
    () => Boolean(orderScope) && detail?.status !== "ARCHIVED",
    [detail?.status, orderScope]
  );

  const filteredQuestions = useMemo(() => {
    if (!detail) {
      return [];
    }

    const scoped = detail.questions.filter((question) => {
      if (questionPhaseFilter === "ALL") {
        return true;
      }
      if (questionPhaseFilter === "GLOBAL") {
        const phaseIds = extractTargetPhaseIds(question.config);
        return phaseIds.length === 0;
      }

      return true;
    });

    const studentVisibleQuestions =
      questionPhaseFilter !== "ALL" && questionPhaseFilter !== "GLOBAL"
        ? selectQuestionSetForPhase(scoped, questionPhaseFilter, (question) => extractTargetPhaseIds(question.config))
        : scoped;

    return [...studentVisibleQuestions].sort((left, right) => {
      if (orderScope) {
        const scopedLeft = getQuestionOrderForScope(left.config, orderScope);
        const scopedRight = getQuestionOrderForScope(right.config, orderScope);

        if (scopedLeft !== null && scopedRight !== null && scopedLeft !== scopedRight) {
          return scopedLeft - scopedRight;
        }
        if (scopedLeft !== null && scopedRight === null) {
          return -1;
        }
        if (scopedLeft === null && scopedRight !== null) {
          return 1;
        }
      }

      return left.orderIndex - right.orderIndex;
    });
  }, [detail, questionPhaseFilter, orderScope]);

  const publishedVersion = useMemo(
    () => versions.find((version) => version.status === "PUBLISHED") ?? null,
    [versions]
  );

  function setQuestionEdit(questionId: string, patch: Partial<QuestionEdit>) {
    setQuestionEdits((prev) => ({
      ...prev,
      [questionId]: {
        required: prev[questionId]?.required ?? false,
        includeInDigest: prev[questionId]?.includeInDigest ?? true,
        activeStatus: prev[questionId]?.activeStatus ?? true,
        ...patch
      }
    }));
  }

  function resetQuestionComposer() {
    setEditingQuestionId(null);
    setPrompt("");
    setHelpText("");
    setQuestionType("FREE_TEXT");
    setRequired(false);
    setIncludeInDigest(true);
    setOptionsText("1\n2\n3\n4\n5");
    setTargetPhaseIds([]);
  }

  async function createDraft() {
    const response = await fetch("/api/admin/surveys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label: newLabel })
    });

    if (!response.ok) {
      setMessage(await errorMessage(response, "Failed to create draft"));
      return;
    }

    const body = (await response.json()) as { version: SurveyVersionRow };
    setSelectedVersionId(body.version.id);
    resetQuestionComposer();
    setMessage(`Created draft v${body.version.versionNumber}`);
    await loadVersions();
  }

  function beginEditQuestion(question: SurveyQuestion) {
    if (detail?.status === "ARCHIVED") {
      setMessage("Archived survey versions are read-only.");
      return;
    }

    setEditingQuestionId(question.id);
    setPrompt(question.prompt);
    setHelpText(question.helpText ?? "");
    setQuestionType(question.type);
    setRequired(questionEdits[question.id]?.required ?? question.required);
    setIncludeInDigest(questionEdits[question.id]?.includeInDigest ?? question.includeInDigest);
    setOptionsText(question.options.map((option) => option.label).join("\n"));
    setTargetPhaseIds(extractTargetPhaseIds(question.config));
    setMessage(`Editing question: ${question.prompt}`);
  }

  function cancelEditQuestion() {
    resetQuestionComposer();
    setMessage("Question edit cancelled.");
  }

  async function saveQuestion() {
    if (!selectedVersionId) {
      setMessage("Select a survey version");
      return;
    }

    if (detail?.status === "ARCHIVED") {
      setMessage("Archived survey versions are read-only.");
      return;
    }

    const promptValue = prompt.trim();
    if (!promptValue) {
      setMessage("Question prompt is required.");
      return;
    }

    const lines = optionsText
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    const needsOptions = questionType === "LIKERT" || questionType === "MULTIPLE_CHOICE" || questionType === "MULTI_SELECT";
    if (needsOptions && lines.length === 0) {
      setMessage("Provide at least one option for selectable question types.");
      return;
    }

    const existingQuestion = editingQuestionId
      ? detail?.questions.find((question) => question.id === editingQuestionId) ?? null
      : null;
    const activeStatusValue = existingQuestion
      ? (questionEdits[existingQuestion.id]?.activeStatus ?? existingQuestion.activeStatus)
      : true;
    const existingConfig =
      existingQuestion?.config && typeof existingQuestion.config === "object" && !Array.isArray(existingQuestion.config)
        ? ({ ...(existingQuestion.config as Record<string, unknown>) } as Record<string, unknown>)
        : {};

    if (targetPhaseIds.length > 0) {
      existingConfig.phaseIds = targetPhaseIds;
    } else {
      delete existingConfig.phaseIds;
    }

    const nextConfig = Object.keys(existingConfig).length > 0 ? existingConfig : undefined;

    const response = await fetch(`/api/admin/surveys/${selectedVersionId}/questions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: editingQuestionId ?? undefined,
        prompt: promptValue,
        helpText: helpText.trim() || undefined,
        type: questionType,
        required,
        includeInDigest,
        activeStatus: activeStatusValue,
        config: nextConfig,
        options:
          questionType === "FREE_TEXT" || questionType === "NUMERIC"
            ? undefined
            : lines.map((line) => ({ label: line, value: line }))
      })
    });

    if (!response.ok) {
      setMessage(await errorMessage(response, editingQuestionId ? "Failed to update question" : "Failed to add question"));
      return;
    }

    const wasEditing = Boolean(editingQuestionId);
    resetQuestionComposer();
    setMessage(wasEditing ? "Question updated." : "Question added.");
    await loadVersion(selectedVersionId);
  }

  async function persistScopedOrder(questionIds: string[]) {
    if (!selectedVersionId) {
      return;
    }

    if (!orderScope) {
      setMessage("Select a specific curriculum phase (or Global only) before reordering.");
      return;
    }

    setSavingOrder(true);

    const response = await fetch(`/api/admin/surveys/${selectedVersionId}/reorder`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        questionIds,
        scope: questionPhaseFilter
      })
    });

    setSavingOrder(false);

    if (!response.ok) {
      setMessage(await errorMessage(response, "Failed to reorder questions"));
      return;
    }

    setMessage("Question order updated for this phase.");
    await loadVersion(selectedVersionId);
  }

  async function reorderQuestion(questionId: string, direction: "up" | "down") {
    if (!detail || !selectedVersionId) {
      return;
    }

    if (!canReorderInScope) {
      setMessage("Choose a specific phase (or Global only) to reorder questions.");
      return;
    }

    const currentIndex = filteredQuestions.findIndex((question) => question.id === questionId);
    if (currentIndex < 0) {
      return;
    }

    const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= filteredQuestions.length) {
      return;
    }

    const reordered = [...filteredQuestions];
    const [moved] = reordered.splice(currentIndex, 1);
    const insertionIndex = currentIndex < targetIndex ? targetIndex - 1 : targetIndex;
    reordered.splice(insertionIndex, 0, moved);

    await persistScopedOrder(reordered.map((question) => question.id));
  }

  async function dropQuestionBefore(targetQuestionId: string) {
    if (!draggingQuestionId || draggingQuestionId === targetQuestionId) {
      return;
    }

    if (!canReorderInScope) {
      setMessage("Choose a specific phase (or Global only) to reorder questions.");
      return;
    }

    const currentIndex = filteredQuestions.findIndex((question) => question.id === draggingQuestionId);
    const targetIndex = filteredQuestions.findIndex((question) => question.id === targetQuestionId);
    if (currentIndex < 0 || targetIndex < 0 || currentIndex === targetIndex) {
      return;
    }

    const reordered = [...filteredQuestions];
    const [moved] = reordered.splice(currentIndex, 1);
    reordered.splice(targetIndex, 0, moved);

    await persistScopedOrder(reordered.map((question) => question.id));
  }

  async function publishVersion() {
    if (!selectedVersionId) {
      return;
    }

    const response = await fetch(`/api/admin/surveys/${selectedVersionId}/publish`, {
      method: "POST"
    });

    if (!response.ok) {
      setMessage(await errorMessage(response, "Publish failed"));
      return;
    }

    setMessage("Survey version published and now live to students.");
    await loadVersions();
    await loadVersion(selectedVersionId);
  }

  async function saveAllQuestionSettings() {
    if (!detail || !selectedVersionId) {
      return;
    }

    const dirtyQuestions = detail.questions.filter((question) => dirtyQuestionIds.includes(question.id));
    if (dirtyQuestions.length === 0) {
      setMessage("No unsaved question setting changes.");
      return;
    }

    setSavingAll(true);
    const failures: string[] = [];

    for (const question of dirtyQuestions) {
      const settings = questionEdits[question.id] ?? {
        required: question.required,
        includeInDigest: question.includeInDigest,
        activeStatus: question.activeStatus
      };

      const response = await fetch(`/api/admin/surveys/${selectedVersionId}/questions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: question.id,
          prompt: question.prompt,
          helpText: question.helpText ?? undefined,
          type: question.type,
          required: settings.required,
          includeInDigest: settings.includeInDigest,
          activeStatus: settings.activeStatus,
          config: question.config ?? undefined,
          options:
            question.type === "FREE_TEXT" || question.type === "NUMERIC"
              ? undefined
              : question.options.map((option) => ({
                  label: option.label,
                  value: option.value
                }))
        })
      });

      if (!response.ok) {
        failures.push(question.prompt);
      }
    }

    setSavingAll(false);

    if (failures.length) {
      setMessage(`Failed to save ${failures.length} question(s).`);
      return;
    }

    setMessage(
      detail.status === "DRAFT"
        ? `Saved ${dirtyQuestions.length} question setting update(s) to draft. Publish to make changes live to students.`
        : `Saved ${dirtyQuestions.length} question setting update(s).`
    );
    await loadVersion(selectedVersionId);
  }

  async function deleteQuestion(questionId: string) {
    const response = await fetch(`/api/admin/surveys/questions/${questionId}`, { method: "DELETE" });
    if (!response.ok) {
      setMessage(await errorMessage(response, "Failed to delete question"));
      return;
    }

    if (editingQuestionId === questionId) {
      resetQuestionComposer();
    }
    setMessage("Question deleted");
    await loadVersion(selectedVersionId);
  }

  async function deleteSelectedVersion() {
    if (!selectedVersionId) {
      setMessage("Select a survey version");
      return;
    }

    const selectedVersion = versions.find((version) => version.id === selectedVersionId);
    if (!selectedVersion) {
      setMessage("Selected survey version was not found.");
      return;
    }

    if (selectedVersion._count.feedbackSubmissions > 0) {
      setMessage("This survey version has submissions and cannot be deleted.");
      return;
    }

    const confirmed = window.confirm(
      `Delete survey v${selectedVersion.versionNumber} (${selectedVersion.label})? This cannot be undone.`
    );
    if (!confirmed) {
      return;
    }

    const response = await fetch(`/api/admin/surveys/${selectedVersionId}`, {
      method: "DELETE"
    });

    if (!response.ok) {
      setMessage(await errorMessage(response, "Failed to delete survey version"));
      return;
    }

    setMessage(`Deleted survey v${selectedVersion.versionNumber}.`);
    setSelectedVersionId("");
    setDetail(null);
    setQuestionEdits({});
    resetQuestionComposer();
    await loadVersions();
  }

  return (
    <div className="grid" style={{ gap: "1rem" }}>
      <div className="card">
        <h2>Survey Versions</h2>
        <p className="muted">
          Students only see the currently published survey version:
          {" "}
          {publishedVersion ? `v${publishedVersion.versionNumber} - ${publishedVersion.label}` : "None published"}
        </p>
        {detail && detail.status !== "PUBLISHED" ? (
          <div className="alert warn" style={{ marginBottom: "0.8rem" }}>
            Selected version is not live to students until it is published.
          </div>
        ) : null}

        <div className="grid" style={{ gridTemplateColumns: "2fr 1fr auto", alignItems: "end" }}>
          <div>
            <label className="label">Version</label>
            <select
              className="select"
              value={selectedVersionId}
              onChange={(event) => {
                const nextVersionId = event.target.value;
                if (hasUnsavedChanges && nextVersionId !== selectedVersionId) {
                  const confirmed = window.confirm(
                    "You have unsaved question setting changes. Leave this version without saving?"
                  );
                  if (!confirmed) {
                    return;
                  }
                }
                if (nextVersionId !== selectedVersionId) {
                  setQuestionPhaseFilter("ALL");
                }
                setSelectedVersionId(nextVersionId);
              }}
            >
              <option value="">Select survey version</option>
              {versions.map((version) => (
                <option key={version.id} value={version.id}>
                  v{version.versionNumber} - {version.label} ({version.status})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">New draft label</label>
            <input className="input" value={newLabel} onChange={(event) => setNewLabel(event.target.value)} />
          </div>
          <button className="btn primary" type="button" onClick={createDraft}>
            Create draft
          </button>
        </div>

        <div style={{ marginTop: "0.8rem" }}>
          <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
            <button className="btn ghost" type="button" onClick={publishVersion}>
              Publish selected version
            </button>
            <button className="btn danger" type="button" onClick={deleteSelectedVersion} disabled={!selectedVersionId}>
              Delete selected version
            </button>
          </div>
          {selectedVersionId ? (
            <p className="muted" style={{ marginTop: "0.5rem", marginBottom: 0 }}>
              {(() => {
                const selectedVersion = versions.find((version) => version.id === selectedVersionId);
                if (!selectedVersion) {
                  return "";
                }
                if (selectedVersion._count.feedbackSubmissions > 0) {
                  return `Deletion disabled: ${selectedVersion._count.feedbackSubmissions} submission(s) are linked to this version.`;
                }
                return "This version can be deleted because it has no linked submissions.";
              })()}
            </p>
          ) : null}
        </div>
      </div>

      {detail ? (
        <>
          <div className="card">
            <h2>{editingQuestionId ? "Edit Question" : "Add Question"}</h2>
            <p className="muted">
              Editing version status: <strong>{detail.status}</strong>
              {editingQuestionId ? " - editing an existing question" : ""}
            </p>

            <div className="grid two">
              <div>
                <label className="label">Prompt</label>
                <input className="input" value={prompt} onChange={(event) => setPrompt(event.target.value)} />
              </div>
              <div>
                <label className="label">Help text</label>
                <input className="input" value={helpText} onChange={(event) => setHelpText(event.target.value)} />
              </div>
              <div>
                <label className="label">Type</label>
                <select
                  className="select"
                  value={questionType}
                  onChange={(event) => setQuestionType(event.target.value as QuestionType)}
                >
                  {QUESTION_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Required</label>
                <select
                  className="select"
                  value={required ? "yes" : "no"}
                  onChange={(event) => setRequired(event.target.value === "yes")}
                >
                  <option value="no">No</option>
                  <option value="yes">Yes</option>
                </select>
              </div>
              <div>
                <label className="label">Share in faculty digest</label>
                <select
                  className="select"
                  value={includeInDigest ? "yes" : "no"}
                  onChange={(event) => setIncludeInDigest(event.target.value === "yes")}
                >
                  <option value="yes">Yes</option>
                  <option value="no">No (private/admin-only)</option>
                </select>
              </div>
            </div>

            <div style={{ marginTop: "0.8rem" }}>
              <label className="label">Options (one per line for selectable question types)</label>
              <textarea
                className="textarea"
                rows={5}
                value={optionsText}
                onChange={(event) => setOptionsText(event.target.value)}
              />
            </div>

            <div style={{ marginTop: "0.8rem" }}>
              <label className="label">Applies to curriculum phases</label>
              <p className="muted">Leave unchecked to apply question to all phases.</p>
              <div
                className="grid two"
                style={{
                  maxHeight: 180,
                  overflow: "auto",
                  border: "1px solid var(--line)",
                  padding: "0.6rem",
                  borderRadius: "10px"
                }}
              >
                {curriculumPhases.map((phase) => (
                  <label key={phase.id} style={{ display: "flex", gap: "0.4rem", alignItems: "center" }}>
                    <input
                      type="checkbox"
                      checked={targetPhaseIds.includes(phase.id)}
                      onChange={() =>
                        setTargetPhaseIds((prev) =>
                          prev.includes(phase.id) ? prev.filter((id) => id !== phase.id) : [...prev, phase.id]
                        )
                      }
                    />
                    <span>{phase.name}</span>
                  </label>
                ))}
              </div>
            </div>

            <div style={{ marginTop: "0.8rem" }}>
              <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
                <button className="btn primary" type="button" onClick={saveQuestion} disabled={detail.status === "ARCHIVED"}>
                  {editingQuestionId ? "Save question edits" : "Add question"}
                </button>
                {editingQuestionId ? (
                  <button className="btn ghost" type="button" onClick={cancelEditQuestion}>
                    Cancel edit
                  </button>
                ) : null}
              </div>
            </div>
          </div>

          <div className="card">
            <h2>
              Questions in v{detail.versionNumber} ({detail.status})
            </h2>

            <div
              style={{
                display: "flex",
                gap: "0.7rem",
                flexWrap: "wrap",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "0.8rem"
              }}
            >
              <div style={{ minWidth: "280px" }}>
                <label className="label">View questions for phase</label>
                <select
                  className="select"
                  value={questionPhaseFilter}
                  onChange={(event) => setQuestionPhaseFilter(event.target.value)}
                >
                  <option value="ALL">All phases</option>
                  <option value="GLOBAL">Global only (no phase filter)</option>
                  {curriculumPhases.map((phase) => (
                    <option key={phase.id} value={phase.id}>
                      {phase.name}
                    </option>
                  ))}
                </select>
                <p className="muted" style={{ marginTop: "0.4rem", marginBottom: 0 }}>
                  {questionPhaseFilter === "ALL"
                    ? "Reordering is disabled in All phases view. Select a specific phase (or Global only)."
                    : "Drag rows or use arrows to reorder within this selected phase scope."}
                </p>
              </div>
              <div style={{ display: "flex", gap: "0.6rem", alignItems: "center", flexWrap: "wrap" }}>
                {hasUnsavedChanges ? (
                  <span className="badge gray">{dirtyQuestionIds.length} unsaved change(s)</span>
                ) : (
                  <span className="badge green">All changes saved</span>
                )}
                {savingOrder ? <span className="badge gray">Saving order...</span> : null}
                <button
                  className="btn primary"
                  type="button"
                  onClick={saveAllQuestionSettings}
                  disabled={!hasUnsavedChanges || savingAll}
                >
                  {savingAll ? "Saving..." : "Save all changes"}
                </button>
              </div>
            </div>

            <div style={{ overflowX: "auto" }}>
              <table className="table" style={{ minWidth: "1120px" }}>
                <thead>
                  <tr>
                    <th>Order</th>
                    <th>Reorder</th>
                    <th>Prompt</th>
                    <th>Type</th>
                    <th>Phases</th>
                    <th>Required</th>
                    <th>Digest Visible</th>
                    <th>Active</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredQuestions.map((question, rowIndex) => {
                    const current = questionEdits[question.id] ?? {
                      required: question.required,
                      includeInDigest: question.includeInDigest,
                      activeStatus: question.activeStatus
                    };
                    const isDirty = dirtyQuestionIds.includes(question.id);
                    const canMoveUp = rowIndex > 0;
                    const canMoveDown = rowIndex < filteredQuestions.length - 1;
                    const rowCanDrag = canReorderInScope && !savingOrder;

                    return (
                      <tr
                        key={question.id}
                        style={isDirty ? { background: "#f8fafc" } : undefined}
                        draggable={rowCanDrag}
                        onDragStart={() => setDraggingQuestionId(question.id)}
                        onDragOver={(event) => {
                          if (!rowCanDrag) {
                            return;
                          }
                          event.preventDefault();
                        }}
                        onDrop={async (event) => {
                          event.preventDefault();
                          if (!rowCanDrag) {
                            return;
                          }
                          await dropQuestionBefore(question.id);
                          setDraggingQuestionId(null);
                        }}
                        onDragEnd={() => setDraggingQuestionId(null)}
                      >
                        <td>{rowIndex + 1}</td>
                        <td>
                          <div style={{ display: "flex", gap: "0.4rem" }}>
                            <button
                              className="btn ghost"
                              type="button"
                              onClick={() => reorderQuestion(question.id, "up")}
                              disabled={!canReorderInScope || savingOrder || !canMoveUp}
                              title="Move up"
                            >
                              ↑
                            </button>
                            <button
                              className="btn ghost"
                              type="button"
                              onClick={() => reorderQuestion(question.id, "down")}
                              disabled={!canReorderInScope || savingOrder || !canMoveDown}
                              title="Move down"
                            >
                              ↓
                            </button>
                          </div>
                        </td>
                        <td>{question.prompt}</td>
                        <td>{question.type}</td>
                        <td>{targetPhaseLabel(question.config, curriculumPhases)}</td>
                        <td>
                          <BooleanPills
                            value={current.required}
                            onChange={(value) => setQuestionEdit(question.id, { required: value })}
                            trueLabel="Required"
                            falseLabel="Optional"
                          />
                        </td>
                        <td>
                          <BooleanPills
                            value={current.includeInDigest}
                            onChange={(value) => setQuestionEdit(question.id, { includeInDigest: value })}
                            trueLabel="Visible"
                            falseLabel="Private"
                          />
                        </td>
                        <td>
                          <BooleanPills
                            value={current.activeStatus}
                            onChange={(value) => setQuestionEdit(question.id, { activeStatus: value })}
                            trueLabel="Active"
                            falseLabel="Inactive"
                          />
                        </td>
                        <td>
                          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                            <button className="btn ghost" type="button" onClick={() => beginEditQuestion(question)}>
                              Edit
                            </button>
                            <button className="btn danger" type="button" onClick={() => deleteQuestion(question.id)}>
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <div className="card">Select a survey version to begin.</div>
      )}

      {message ? <div className="alert warn">{message}</div> : null}
    </div>
  );
}

function targetPhaseLabel(config: unknown, phases: CurriculumPhase[]) {
  const targetIds = extractTargetPhaseIds(config);
  if (!targetIds.length) {
    return "All phases";
  }

  const nameById = new Map(phases.map((phase) => [phase.id, phase.name]));
  return targetIds.map((id) => nameById.get(id) ?? id).join(", ");
}

function BooleanPills(props: {
  value: boolean;
  onChange: (value: boolean) => void;
  trueLabel: string;
  falseLabel: string;
}) {
  return (
    <div style={{ display: "flex", gap: "0.45rem", minWidth: "240px" }}>
      <button
        className={`btn ${props.value ? "primary" : "ghost"}`}
        type="button"
        onClick={() => props.onChange(true)}
        style={{ minWidth: "110px", padding: "0.5rem 0.7rem", whiteSpace: "nowrap" }}
      >
        {props.trueLabel}
      </button>
      <button
        className={`btn ${props.value ? "ghost" : "primary"}`}
        type="button"
        onClick={() => props.onChange(false)}
        style={{ minWidth: "110px", padding: "0.5rem 0.7rem", whiteSpace: "nowrap" }}
      >
        {props.falseLabel}
      </button>
    </div>
  );
}

async function errorMessage(response: Response, fallback: string) {
  try {
    const body = (await response.json()) as { message?: string };
    return body.message ?? fallback;
  } catch {
    return fallback;
  }
}
