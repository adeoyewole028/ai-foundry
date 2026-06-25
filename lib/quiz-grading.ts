export type QuizQuestionLike = {
  id: string;
  prompt: string;
  correctAnswer: string;
  keywords: string[];
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

function normalize(value: string): string {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
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

function optionMatchScore(
  optionLabel: string,
  correctAnswer: string,
  keywords: string[]
): number {
  const normalizedLabel = normalizeOption(optionLabel);
  const normalizedCorrectAnswer = normalizeOption(correctAnswer);
  const normalizedKeywords = keywords.map((keyword) => normalizeOption(keyword)).filter(Boolean);

  if (!normalizedLabel) {
    return 0;
  }

  let score = 0;

  if (normalizedCorrectAnswer && normalizedCorrectAnswer.includes(normalizedLabel)) {
    score += 4;
  }

  if (normalizedLabel.includes(normalizedCorrectAnswer)) {
    score += 4;
  }

  for (const keyword of normalizedKeywords) {
    if (keyword.length > 0 && normalizedLabel.includes(keyword)) {
      score += 1;
    }
  }

  return score;
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
  const normalizedValue = normalize(value);
  const normalizedKeywords = keywords.map((keyword) => normalize(keyword));
  const matchedKeywords = normalizedKeywords.filter(
    (keyword) => normalizedValue.includes(keyword) && keyword.length > 0
  );
  const expectedMinimum = requiredKeywordMatchCount(normalizedKeywords);
  const hasReasonableLength = requireReasonableLength
    ? normalizedValue.length >= 32
    : normalizedValue.length >= 6;

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

  const normalizedCorrectAnswer = normalizeOption(question.correctAnswer);

  if (question.options && question.options.length > 0) {
    const exactMatch = question.options.find((option) => {
      return normalizeOption(option.label) === normalizedCorrectAnswer;
    });

    if (exactMatch) {
      return exactMatch.id;
    }

    const keywordMatch = question.options.find((option) => {
      const normalizedLabel = normalizeOption(option.label);
      return question.keywords.some(
        (keyword) =>
          normalizedLabel.length > 0 &&
          normalizeOption(keyword).length > 0 &&
          normalizedLabel.includes(normalizeOption(keyword))
      );
    });

    if (keywordMatch) {
      return keywordMatch.id;
    }

    const bestMatch = question.options.reduce<{
      option: { id: string; label: string } | null;
      score: number;
    }>(
      (acc, option) => {
        const score = optionMatchScore(
          option.label,
          question.correctAnswer,
          question.keywords
        );

        if (score > acc.score) {
          return { option, score };
        }

        return acc;
      },
      { option: null, score: -1 }
    );

    if (bestMatch.option && bestMatch.score > 0) {
      return bestMatch.option.id;
    }
  }

  return null;
}

export function gradeQuizAnswer(
  question: QuizQuestionLike,
  answer: string
): QuizGradingResult {
  if (question.options && question.options.length > 0) {
    const selectedOptionId = answer.trim();
    const resolvedCorrectOptionId = resolveQuizCorrectOptionId(question);
    const hasResolvedCorrectOptionId = typeof resolvedCorrectOptionId === "string";
    const selectedOption = question.options.find((option) => option.id === selectedOptionId);
    const selectedText = selectedOption?.label ?? "";
    const keywordResult = evaluateKeywordMatch(selectedText, question.keywords, false);
    const matchedKeywords = keywordResult.matchedKeywords;
    const expectedMinimum = keywordResult.expectedMinimum;
    const passed = hasResolvedCorrectOptionId
      ? selectedOptionId === resolvedCorrectOptionId
      : keywordResult.passed;

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

export function gradeQuizSubmission(
  questions: QuizQuestionLike[],
  answers: Record<string, string>
): {
  results: QuizGradingResult[];
  score: number;
  totalQuestions: number;
  matchedKeywordCount: number;
  passed: boolean;
} {
  const results = questions.map((question) => gradeQuizAnswer(question, pickAnswerText(answers[question.id])));
  const score = results.filter((item) => item.passed).length;
  const totalQuestions = questions.length;
  const matchedKeywordCount = results.reduce((total, item) => total + item.matchedKeywords.length, 0);
  const passed = totalQuestions > 0 && score === totalQuestions;

  return { results, score, totalQuestions, matchedKeywordCount, passed };
}
