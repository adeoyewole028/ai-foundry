import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export type ProjectSubmission = {
  id: number;
  userId: string;
  moduleSlug: string;
  lessonSlug: string;
  title: string;
  repoUrl: string;
  liveUrl: string | null;
  notes: string | null;
  skills: string[];
  technicalWriteup: string | null;
  reflection: string | null;
  status: string;
  createdAt: string | null;
  updatedAt: string | null;
};

type ProjectSubmissionPayload = {
  user_id: string;
  module_slug: string;
  lesson_slug: string;
  title: string;
  repo_url: string;
  live_url: string | null;
  notes: string | null;
  skills: string[];
  technical_writeup: string | null;
  reflection: string | null;
  status: string;
};

type ProjectSubmissionInput = {
  moduleSlug: string;
  lessonSlug: string;
  title: string;
  repoUrl: string;
  liveUrl: string | null;
  skills: string[];
  technicalWriteup: string | null;
  reflection: string | null;
};

function normalizeLegacyPortfolioNotes(rawNotes: string | null): {
  skills: string[];
  technicalWriteup: string | null;
  reflection: string | null;
} {
  if (!rawNotes) {
    return {
      skills: [],
      technicalWriteup: null,
      reflection: null
    };
  }

  const trimmed = rawNotes.trim();

  if (!trimmed.startsWith("{") || !trimmed.endsWith("}")) {
    return {
      skills: [],
      technicalWriteup: null,
      reflection: trimmed.length > 0 ? trimmed : null
    };
  }

  try {
    const parsed = JSON.parse(trimmed) as {
      __portfolio?: true;
      skills?: string[];
      technicalWriteup?: string | null;
      reflection?: string | null;
    };

    if (!parsed.__portfolio) {
      return {
        skills: [],
        technicalWriteup: null,
        reflection: null
      };
    }

    const skills = Array.isArray(parsed.skills)
      ? parsed.skills
          .map((skill) => (typeof skill === "string" ? skill.trim() : ""))
          .filter((skill) => skill.length > 0)
      : [];

    return {
      skills,
      technicalWriteup:
        typeof parsed.technicalWriteup === "string" && parsed.technicalWriteup.trim().length > 0
          ? parsed.technicalWriteup.trim()
          : null,
      reflection:
        typeof parsed.reflection === "string" && parsed.reflection.trim().length > 0
          ? parsed.reflection.trim()
          : null
    };
  } catch {
    return {
      skills: [],
      technicalWriteup: null,
      reflection: trimmed.length > 0 ? trimmed : null
    };
  }
}

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter((item) => item.length > 0);
}

function getUserId(claims: unknown): string | null {
  if (
    typeof claims === "object" &&
    claims !== null &&
    "sub" in claims &&
    typeof (claims as { sub?: unknown }).sub === "string"
  ) {
    return (claims as { sub: string }).sub;
  }

  return null;
}

function normalizeSubmissionRecord(record: {
  id: number;
  user_id: string;
  module_slug: string;
  lesson_slug: string;
  title: string;
  repo_url: string;
  live_url: string | null;
  notes: string | null;
  skills: string[] | null;
  technical_writeup: string | null;
  reflection: string | null;
  status: string;
  created_at?: string | null;
  updated_at?: string | null;
}): ProjectSubmission {
  const legacy = normalizeLegacyPortfolioNotes(record.notes);
  const storedSkills = normalizeStringArray(record.skills);

  const storedReflection =
    typeof record.reflection === "string" && record.reflection.trim().length > 0
      ? record.reflection.trim()
      : null;
  const storedTechnicalWriteup =
    typeof record.technical_writeup === "string" && record.technical_writeup.trim().length > 0
      ? record.technical_writeup.trim()
      : null;

  return {
    id: record.id,
    userId: record.user_id,
    moduleSlug: record.module_slug,
    lessonSlug: record.lesson_slug,
    title: record.title,
    repoUrl: record.repo_url,
    liveUrl: record.live_url,
    notes: record.notes,
    skills: storedSkills.length > 0 ? storedSkills : legacy.skills,
    technicalWriteup: storedTechnicalWriteup ?? legacy.technicalWriteup,
    reflection: storedReflection ?? legacy.reflection,
    status: record.status,
    createdAt: record.created_at ?? null,
    updatedAt: record.updated_at ?? null
  };
}

function toString(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value.trim() : "";
}

function toNullableString(value: FormDataEntryValue | null): string | null {
  const normalized = toString(value);

  return normalized.length > 0 ? normalized : null;
}

export async function getCurrentUserProjectSubmissions(
  moduleSlugs?: string[]
): Promise<ProjectSubmission[]> {
  if (!isSupabaseConfigured()) {
    return [];
  }

  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = getUserId(data?.claims);

  if (!userId) {
    return [];
  }

  let query = supabase
    .from("project_submissions")
    .select(
      "id,user_id,module_slug,lesson_slug,title,repo_url,live_url,notes,skills,technical_writeup,reflection,status,created_at,updated_at"
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (moduleSlugs && moduleSlugs.length > 0) {
    query = query.in("module_slug", moduleSlugs);
  }

  const { data: rows, error } = await query;

  if (error || !Array.isArray(rows)) {
    return [];
  }

  return rows
    .map((row) => {
      if (!row || typeof row !== "object") {
        return null;
      }

      return normalizeSubmissionRecord(row as {
        id: number;
        user_id: string;
        module_slug: string;
        lesson_slug: string;
        title: string;
        repo_url: string;
        live_url: string | null;
        notes: string | null;
        skills: string[] | null;
        technical_writeup: string | null;
        reflection: string | null;
        status: string;
        created_at?: string | null;
        updated_at?: string | null;
      });
    })
    .filter((submission): submission is ProjectSubmission => submission !== null);
}

export async function getLatestProjectSubmissionForCurrentUser({
  moduleSlug,
  lessonSlug
}: {
  moduleSlug: string;
  lessonSlug: string;
}): Promise<ProjectSubmission | null> {
  if (!isSupabaseConfigured()) {
    return null;
  }

  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = getUserId(data?.claims);

  if (!userId) {
    return null;
  }

  const { data: rows, error } = await supabase
    .from("project_submissions")
    .select(
      "id,user_id,module_slug,lesson_slug,title,repo_url,live_url,notes,skills,technical_writeup,reflection,status,created_at,updated_at"
    )
    .eq("user_id", userId)
    .eq("module_slug", moduleSlug)
    .eq("lesson_slug", lessonSlug)
    .order("created_at", { ascending: false })
    .limit(1);

  if (error || !Array.isArray(rows) || rows.length === 0) {
    return null;
  }

  return normalizeSubmissionRecord(rows[0] as {
    id: number;
    user_id: string;
    module_slug: string;
    lesson_slug: string;
    title: string;
    repo_url: string;
    live_url: string | null;
    notes: string | null;
    skills: string[] | null;
    technical_writeup: string | null;
    reflection: string | null;
    status: string;
    created_at?: string | null;
    updated_at?: string | null;
  });
}

export async function submitProjectSubmissionForCurrentUser({
  moduleSlug,
  lessonSlug,
  title,
  repoUrl,
  liveUrl,
  skills,
  technicalWriteup,
  reflection
}: ProjectSubmissionInput): Promise<
  | ({ ok: true } & { submission: ProjectSubmission })
  | { ok: false; error: string }
> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "supabase_not_configured" };
  }

  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = getUserId(data?.claims);

  if (!userId) {
    return { ok: false, error: "not_authenticated" };
  }

  const payload: ProjectSubmissionPayload = {
    user_id: userId,
    module_slug: moduleSlug,
    lesson_slug: lessonSlug,
    title,
    repo_url: repoUrl,
    live_url: liveUrl,
    notes: null,
    skills,
    technical_writeup: technicalWriteup,
    reflection,
    status: "submitted"
  };

  const { data: submittedRows, error } = await supabase
    .from("project_submissions")
    .upsert(payload, {
      onConflict: "user_id,module_slug,lesson_slug"
    })
    .select(
      "id,user_id,module_slug,lesson_slug,title,repo_url,live_url,notes,skills,technical_writeup,reflection,status,created_at,updated_at"
    );

  if (error) {
    return { ok: false, error: error.message };
  }

  const inserted = Array.isArray(submittedRows) && submittedRows[0]
    ? normalizeSubmissionRecord({
        id: submittedRows[0].id,
        user_id: submittedRows[0].user_id,
        module_slug: submittedRows[0].module_slug,
        lesson_slug: submittedRows[0].lesson_slug,
        title: submittedRows[0].title,
        repo_url: submittedRows[0].repo_url,
        live_url: submittedRows[0].live_url,
        notes: submittedRows[0].notes,
        skills: submittedRows[0].skills,
        technical_writeup: submittedRows[0].technical_writeup,
        reflection: submittedRows[0].reflection,
        status: submittedRows[0].status,
        created_at: submittedRows[0].created_at,
        updated_at: submittedRows[0].updated_at
      })
    : null;

  if (!inserted) {
    const row = await getLatestProjectSubmissionForCurrentUser({ moduleSlug, lessonSlug });
    if (!row) {
      return { ok: false, error: "Unable to retrieve saved submission." };
    }

    return { ok: true, submission: row };
  }

  return { ok: true, submission: inserted };
}

export function normalizeProjectSubmissionForm(formData: FormData) {
  const moduleSlug = toString(formData.get("moduleSlug"));
  const lessonSlug = toString(formData.get("lessonSlug"));
  const title = toString(formData.get("title")) || "Project submission";
  const repoUrl = toString(formData.get("repoUrl"));
  const liveUrl = toNullableString(formData.get("liveUrl"));
  const reflection = toNullableString(formData.get("reflection"));
  const technicalWriteup = toNullableString(formData.get("technicalWriteup"));
  const rawSkills = toNullableString(formData.get("skills"));
  const normalizedSkills = rawSkills
    ? rawSkills
        .split(",")
        .map((skill) => skill.trim())
        .filter((skill) => skill.length > 0)
    : [];

  if (!moduleSlug || !lessonSlug || !repoUrl || !title) {
    return {
      ok: false as const,
      error: "Missing required fields for project submission."
    } as const;
  }

  return {
    ok: true as const,
    value: {
      moduleSlug,
      lessonSlug,
      title,
      repoUrl,
      liveUrl,
      skills: normalizedSkills,
      technicalWriteup,
      reflection
    }
  };
}
