type QuestionConfigLike = {
  phaseIds?: unknown;
  phaseOrder?: unknown;
};

type PhaseOrderMap = Record<string, number>;

export const GLOBAL_QUESTION_ORDER_SCOPE = "__global__";

export function extractTargetPhaseIds(config: unknown): string[] {
  if (!config || typeof config !== "object") {
    return [];
  }

  const phaseIds = (config as QuestionConfigLike).phaseIds;
  if (!Array.isArray(phaseIds)) {
    return [];
  }

  return phaseIds.filter((value): value is string => typeof value === "string" && value.length > 0);
}

export function selectQuestionsForPhase<T>(
  questions: T[],
  phaseId: string,
  getPhaseIds: (question: T) => string[]
) {
  return questions.filter((question) => {
    const phaseIds = getPhaseIds(question);
    return phaseIds.length === 0 || phaseIds.includes(phaseId);
  });
}

export function selectQuestionSetForPhase<T>(
  questions: T[],
  phaseId: string,
  getPhaseIds: (question: T) => string[]
) {
  const phaseSpecific = questions.filter((question) => getPhaseIds(question).includes(phaseId));
  if (phaseSpecific.length > 0) {
    return phaseSpecific;
  }

  return selectQuestionsForPhase(questions, phaseId, getPhaseIds);
}

export function normalizeQuestionOrderScope(scope: string | null | undefined): string | null {
  if (!scope || scope === "ALL") {
    return null;
  }

  if (scope === "GLOBAL") {
    return GLOBAL_QUESTION_ORDER_SCOPE;
  }

  return scope;
}

function extractPhaseOrderMap(config: unknown): PhaseOrderMap {
  if (!config || typeof config !== "object") {
    return {};
  }

  const mapValue = (config as QuestionConfigLike).phaseOrder;
  if (!mapValue || typeof mapValue !== "object" || Array.isArray(mapValue)) {
    return {};
  }

  const parsed: PhaseOrderMap = {};
  for (const [key, value] of Object.entries(mapValue as Record<string, unknown>)) {
    if (typeof value !== "number" || !Number.isFinite(value)) {
      continue;
    }
    parsed[key] = value;
  }
  return parsed;
}

export function getQuestionOrderForScope(config: unknown, scope: string | null | undefined): number | null {
  const normalizedScope = normalizeQuestionOrderScope(scope);
  if (!normalizedScope) {
    return null;
  }

  const map = extractPhaseOrderMap(config);
  const order = map[normalizedScope];
  return typeof order === "number" ? order : null;
}

export function setQuestionOrderForScope(
  config: unknown,
  scope: string,
  orderIndex: number
): Record<string, unknown> {
  const base =
    config && typeof config === "object" && !Array.isArray(config)
      ? { ...(config as Record<string, unknown>) }
      : {};

  const existingMap = extractPhaseOrderMap(base);
  existingMap[scope] = orderIndex;

  return {
    ...base,
    phaseOrder: existingMap
  };
}
