"use client";

import { useEffect, useRef } from "react";
import { readLessonProgress } from "@/lib/lesson-progress";

type LocalProgressFieldProps = {
  fieldName: string;
};

export function LocalProgressField({ fieldName }: LocalProgressFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const hydrate = () => {
      if (!inputRef.current) {
        return;
      }

      const progress = readLessonProgress();
      inputRef.current.value = JSON.stringify(progress);
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
    <input
      ref={inputRef}
      name={fieldName}
      type="hidden"
      value=""
    />
  );
}
