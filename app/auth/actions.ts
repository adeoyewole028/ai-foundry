"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { LessonProgressState } from "@/lib/lesson-progress-core.js";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { syncLessonProgressForCurrentUser } from "@/lib/supabase/progress";
import { createClient } from "@/lib/supabase/server";

function getString(formData: FormData, key: string) {
  const value = formData.get(key);

  return typeof value === "string" ? value.trim() : "";
}

function redirectWithMessage(path: string, type: "error" | "message", message: string): never {
  redirect(`${path}?${type}=${encodeURIComponent(message)}`);
}

function parseLocalProgressFromForm(formData: FormData): LessonProgressState {
  const raw = formData.get("localProgress");

  if (typeof raw !== "string") {
    return {};
  }

  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;

    if (typeof parsed !== "object" || parsed === null) {
      return {};
    }

    return Object.entries(parsed).reduce<LessonProgressState>((acc, [key, value]) => {
      if (typeof key === "string" && value === true) {
        acc[key] = true;
      }

      return acc;
    }, {});
  } catch {
    return {};
  }
}

async function syncPendingLessonProgress(formData: FormData) {
  const localProgress = parseLocalProgressFromForm(formData);

  if (Object.keys(localProgress).length === 0) {
    return;
  }

  await syncLessonProgressForCurrentUser(localProgress);
}

export async function login(formData: FormData) {
  if (!isSupabaseConfigured()) {
    redirectWithMessage(
      "/auth/login",
      "error",
      "Supabase is not configured yet. Add the project URL and publishable key."
    );
  }

  const email = getString(formData, "email");
  const password = getString(formData, "password");

  if (!email || !password) {
    redirectWithMessage("/auth/login", "error", "Email and password are required.");
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    redirectWithMessage("/auth/login", "error", error.message);
  }

  await syncPendingLessonProgress(formData);
  revalidatePath("/", "layout");
  redirect("/dashboard");
}

export async function signup(formData: FormData) {
  if (!isSupabaseConfigured()) {
    redirectWithMessage(
      "/auth/signup",
      "error",
      "Supabase is not configured yet. Add the project URL and publishable key."
    );
  }

  const fullName = getString(formData, "fullName");
  const email = getString(formData, "email");
  const password = getString(formData, "password");

  if (!fullName || !email || !password) {
    redirectWithMessage("/auth/signup", "error", "Name, email, and password are required.");
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName
      }
    }
  });

  if (error) {
    redirectWithMessage("/auth/signup", "error", error.message);
  }

  if (data.user) {
    await supabase.from("profiles").upsert({
      id: data.user.id,
      email,
      full_name: fullName
    });
    await syncPendingLessonProgress(formData);
  }

  revalidatePath("/", "layout");
  redirectWithMessage(
    "/auth/login",
    "message",
    "Account created. Check your email if confirmation is required, then sign in."
  );
}

export async function logout() {
  if (!isSupabaseConfigured()) {
    redirect("/");
  }

  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/");
}
