"use client";

import { useEffect, useRef } from "react";
import { lessonActivityStorageKey, readLessonProgress } from "@/lib/lesson-progress";

type LocalProgressFieldProps = {
  fieldName: string;
  quizFieldName?: string;
};

export function LocalProgressField({ fieldName, quizFieldName }: LocalProgressFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const quizInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const hydrate = () => {
      if (!inputRef.current) {
        return;
      }

      const progress = readLessonProgress();
      inputRef.current.value = JSON.stringify(progress);

      if (quizInputRef.current) {
        const activity = window.localStorage.getItem(lessonActivityStorageKey);
        quizInputRef.current.value = activity ?? "";
      }
    };

    const onSubmit = () => {
      hydrate();
    };

    const form = inputRef.current?.form;
    const submitHandler = () => {
      onSubmit();
    };

    hydrate();
    form?.addEventListener("submit", submitHandler);

    return () => {
      form?.removeEventListener("submit", submitHandler);
    };
  }, []);

  return (
    <>
      <input
        ref={inputRef}
        name={fieldName}
        type="hidden"
        value=""
      />
      {quizFieldName ? (
        <input
          ref={quizInputRef}
          name={quizFieldName}
          type="hidden"
          value=""
        />
      ) : null}
    </>
  );
}
