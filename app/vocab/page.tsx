import { requireUserId } from "@/lib/auth";
import { getTrainingStatsForUser, getWords } from "@/lib/db";
import { PageHeader } from "@/components/ui";
import { VocabTable } from "./vocab-table";

export default async function VocabPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const userId = await requireUserId();
  const { status } = await searchParams;
  const initialFilter = (status as "known" | "learning" | "all") ?? "all";

  const [words, drillStatsMap] = await Promise.all([
    getWords(userId, "all"),
    getTrainingStatsForUser(userId),
  ]);

  const drillStats = Object.fromEntries(drillStatsMap);

  return (
    <div className="min-h-full">
      <PageHeader
        title="Vocabulary"
        subtitle={`${words.length} words`}
        active="vocab"
      />

      <main className="mx-auto max-w-5xl px-4 py-8">
        {words.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-500">
            No words yet. Import a lesson to start building your vocab.
          </div>
        ) : (
          <VocabTable
            words={words}
            drillStats={drillStats}
            initialFilter={initialFilter}
          />
        )}
      </main>
    </div>
  );
}
