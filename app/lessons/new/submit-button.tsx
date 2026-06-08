"use client";

import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui";

export function SubmitLessonButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={pending} className="min-w-[180px]">
      {pending ? "Extracting words…" : "Extract words & review"}
    </Button>
  );
}
