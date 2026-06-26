export type QuizQuestionLike = {
  id: string;
  prompt: string;
  correctAnswer: string;
  keywords: string[];
  quizMode?: "multiple-choice" | "short-answer";
  options?: Array<{
    id: string;
    label: string;
    explanation: string;
  }>;
  correctOptionId?: string | null;
  rubric?: Array<{
    id: string;
    label: string;
    required: boolean;
    terms: string[];
    minMatch?: number;
  }>;
  passingScore?: number | null;
};

export type QuizGradingResult = {
  questionId: string;
  prompt: string;
  passed: boolean;
  criterionResults: Array<{
    criterionId: string;
    label: string;
    passed: boolean;
    matchedTerms: string[];
    requiredTerms: string[];
  }>;
  matchedKeywords: string[];
  expectedMinimum: number;
  answerLength: number;
  correctOptionId?: string | null;
  selectedOptionId?: string | null;
};

export type QuizMode = "multiple-choice" | "short-answer";

function resolveQuizMode(
  question: QuizQuestionLike,
  quizMode?: QuizMode
): QuizMode {
  if (quizMode === "short-answer" || quizMode === "multiple-choice") {
    return quizMode;
  }

  if (question.quizMode === "short-answer" || question.quizMode === "multiple-choice") {
    return question.quizMode;
  }

  return question.options && question.options.length > 0 ? "multiple-choice" : "short-answer";
}

function gradeOpenEndedQuestion(
  question: QuizQuestionLike,
  answer: string
): QuizGradingResult {
  const rubricResult = question.rubric
    ? gradeRubricCriteria(answer, question.rubric, question.passingScore)
    : null;
  const keywordResult = rubricResult
    ? {
        passed: rubricResult.passed,
        matchedKeywords: rubricResult.criterionResults.flatMap((item) => item.matchedTerms),
        expectedMinimum: rubricResult.maxScore
      }
    : evaluateKeywordMatch(answer, question.keywords);
  const expectedMinimum = rubricResult ? rubricResult.maxScore : keywordResult.expectedMinimum;
  const criterionResults =
    rubricResult?.criterionResults.map((criterion) => ({
      criterionId: criterion.criterionId,
      label: criterion.label,
      passed: criterion.passed,
      matchedTerms: criterion.matchedTerms,
      requiredTerms: criterion.requiredTerms
    })) ?? [];

  if (rubricResult) {
    return {
      questionId: question.id,
      prompt: question.prompt,
      passed: rubricResult.passed,
      criterionResults,
      matchedKeywords: keywordResult.matchedKeywords,
      expectedMinimum,
      answerLength: normalize(answer).length,
      correctOptionId: question.correctOptionId ?? null,
      selectedOptionId: undefined
    };
  }

  return {
    questionId: question.id,
    prompt: question.prompt,
    passed: keywordResult.passed,
    criterionResults: [],
    matchedKeywords: keywordResult.matchedKeywords,
    expectedMinimum,
    answerLength: normalize(answer).length,
    correctOptionId: question.correctOptionId ?? null,
    selectedOptionId: undefined
  };
}

function normalize(value: string): string {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

function normalizeForSearch(value: string): string {
  return normalize(value)
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeOption(option: string): string {
  return normalize(option).replace(/[^\w\s]/g, "");
}

function normalizeTerm(value: string): string {
  return normalize(value).toLowerCase().replace(/[^\w\s]/g, "");
}

function toSet(items: string[]): Set<string> {
  return new Set(items.map(normalizeTerm).filter(Boolean));
}

type RubricCriterionResult = {
  criterionId: string;
  label: string;
  passed: boolean;
  matchedTerms: string[];
  requiredTerms: string[];
};

function gradeRubricCriteria(
  value: string,
  criteria: QuizQuestionLike["rubric"],
  passingScore?: number | null
): {
  criterionResults: RubricCriterionResult[];
  score: number;
  maxScore: number;
  expectedMinimum: number;
  passed: boolean;
} {
  if (!Array.isArray(criteria) || criteria.length === 0) {
    return {
      criterionResults: [],
      score: 0,
      maxScore: 0,
      expectedMinimum: 0,
      passed: false
    };
  }

  const normalizedValue = normalize(value);
  const valueTokens = new Set(normalizedValue.split(/\s+/).filter(Boolean));
  const criterionResults = criteria.map((criterion) => {
    const requiredTerms = criterion.terms.filter((term) => term.trim().length > 0);
    const normalizedRequiredTerms = toSet(requiredTerms);
    const minMatch = criterion.minMatch ?? (criterion.required ? normalizedRequiredTerms.size : 1);
    const matchedTerms = Array.from(normalizedRequiredTerms).filter((term) => {
      if (!term) {
        return false;
      }

      return valueTokens.has(term) || normalizedValue.includes(term);
    });
    const isRequired = criterion.required;
    const passed = isRequired
      ? matchedTerms.length >= normalizedRequiredTerms.size
      : matchedTerms.length >= minMatch;

    return {
      criterionId: criterion.id,
      label: criterion.label,
      passed,
      matchedTerms,
      requiredTerms: requiredTerms
    };
  });
  const requiredCriteria = criterionResults.filter((item, index) => criteria[index]?.required);
  const allRequiredCriteriaMet = requiredCriteria.every((item) => item.passed);
  const score = criterionResults.reduce((total, item) => (item.passed ? total + 1 : total), 0);
  const maxScore = criterionResults.length;
  const defaultPassingScore = Math.ceil(maxScore / 2);
  const expectedMinimum = typeof passingScore === "number"
    ? Math.max(1, Math.min(Math.floor(passingScore), maxScore))
    : defaultPassingScore;
  const passed = allRequiredCriteriaMet && score >= expectedMinimum;

  return {
    criterionResults,
    score,
    maxScore,
    expectedMinimum,
    passed
  };
}

function pickAnswerText(answer: unknown): string {
  return typeof answer === "string" ? answer : "";
}

function requiredKeywordMatchCount(keywords: string[]): number {
  return Math.min(Math.max(2, Math.ceil(keywords.length / 2)), keywords.length);
}

function evaluateKeywordMatch(
  value: string,
  keywords: string[],
  requireReasonableLength = true
): {
  passed: boolean;
  matchedKeywords: string[];
  expectedMinimum: number;
} {
  const normalizedValue = normalizeForSearch(value);
  const normalizedWords = normalizedValue.split(" ").filter(Boolean);
  const uniqueWords = new Set(normalizedWords);
  const normalizedKeywords = keywords.map((keyword) => normalize(keyword));
  const normalizedSearchWords = new Set(normalizedValue.split(" ").filter(Boolean));

  const hasTermMatch = (keyword: string) => {
    if (!keyword) {
      return false;
    }

    const normalizedKeyword = normalizeForSearch(keyword);

    if (!normalizedKeyword) {
      return false;
    }

    if (normalizedKeyword.includes(" ")) {
      return normalizedValue.includes(normalizedKeyword);
    }

    return normalizedSearchWords.has(normalizedKeyword);
  };

  const matchedKeywords = normalizedKeywords.filter(
    (keyword) => hasTermMatch(keyword)
  );
  const expectedMinimum = requiredKeywordMatchCount(normalizedKeywords);
  const requiredWords = requireReasonableLength
    ? Math.max(2, Math.min(4, Math.ceil(normalizedKeywords.length / 3)))
    : 0;
  const hasReasonableLength = !requireReasonableLength
    ? uniqueWords.size >= 1
    : (normalizedKeywords.length === 0
      ? uniqueWords.size >= 1
      : uniqueWords.size >= requiredWords);

  return {
    expectedMinimum,
    matchedKeywords,
    passed:
      normalizedKeywords.length === 0
        ? hasReasonableLength
        : hasReasonableLength && matchedKeywords.length >= expectedMinimum
  };
}

export function resolveQuizCorrectOptionId(
  question: QuizQuestionLike
): string | null {
  if (question.correctOptionId) {
    const hasMatchingOption = question.options?.some((option) => option.id === question.correctOptionId);

    if (hasMatchingOption) {
      return question.correctOptionId;
    }
  }

  if (question.options && question.options.length > 0) {
    const exactMatch = question.options.find((option) => {
      return normalizeOption(option.label) === normalizeOption(question.correctAnswer);
    });

    if (exactMatch) {
      return exactMatch.id;
    }
  }

  return null;
}

export function gradeQuizAnswer(
  question: QuizQuestionLike,
  answer: string,
  quizMode?: QuizMode
): QuizGradingResult {
  const mode = resolveQuizMode(question, quizMode);

  if (mode === "short-answer") {
    return gradeOpenEndedQuestion(question, answer);
  }

  if (question.options && question.options.length > 0) {
    const selectedOptionId = answer.trim();
    const resolvedCorrectOptionId = resolveQuizCorrectOptionId(question);
    if (typeof resolvedCorrectOptionId !== "string") {
      return {
        questionId: question.id,
        prompt: question.prompt,
        passed: false,
        criterionResults: [],
        matchedKeywords: [],
        expectedMinimum: 0,
        answerLength: answer.trim().length,
        correctOptionId: null,
        selectedOptionId
      };
    }

    const selectedOption = question.options.find((option) => option.id === selectedOptionId);
    const selectedText = selectedOption?.label ?? "";
    const keywordResult = evaluateKeywordMatch(selectedText, question.keywords, false);
    const matchedKeywords = keywordResult.matchedKeywords;
    const expectedMinimum = keywordResult.expectedMinimum;
    const passed = selectedOptionId === resolvedCorrectOptionId;

    return {
      questionId: question.id,
      prompt: question.prompt,
      passed,
      criterionResults: [],
      matchedKeywords,
      expectedMinimum,
      answerLength: selectedText.length,
      correctOptionId: resolvedCorrectOptionId,
      selectedOptionId
    };
  }

  return gradeOpenEndedQuestion(question, answer);
}

export function gradeQuizSubmission(
  questions: QuizQuestionLike[],
  answers: Record<string, string>,
  quizMode?: QuizMode
): {
  results: QuizGradingResult[];
  score: number;
  totalQuestions: number;
  matchedKeywordCount: number;
  passed: boolean;
} {
  const results = questions.map((question) =>
    gradeQuizAnswer(question, pickAnswerText(answers[question.id]), quizMode)
  );
  const score = results.filter((item) => item.passed).length;
  const totalQuestions = questions.length;
  const matchedKeywordCount = results.reduce((total, item) => total + item.matchedKeywords.length, 0);
  const passed = totalQuestions > 0 && score === totalQuestions;

  return { results, score, totalQuestions, matchedKeywordCount, passed };
}
