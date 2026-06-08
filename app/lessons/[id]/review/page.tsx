import { notFound } from "next/navigation";
import { requireUserId } from "@/lib/auth";
import { getLessonReviewWords } from "@/lib/db";
import { ReviewClient } from "./review-client";

export default async function ReviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const userId = await requireUserId();

  const data = await getLessonReviewWords(userId, id).catch(() => null);
  if (!data) notFound();

  return <ReviewClient lesson={data.lesson} words={data.words} />;
}
