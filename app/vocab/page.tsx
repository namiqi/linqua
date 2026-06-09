import { requireUserId } from "@/lib/auth";
import { getWords, getTrainingStatsForWords } from "@/lib/db";
import { daysUntilClaimable } from "@/lib/training/promotion";
import { PageHeader } from "@/components/ui";

export default async function VocabPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const userId = await requireUserId();
  const { status } = await searchParams;
  const filter = (status as "known" | "learning" | "all") ?? "all";
  const words = await getWords(userId, filter);
  const learningIds = words.filter((w) => w.status === "learning").map((w) => w.id);
  const drillStats = await getTrainingStatsForWords(userId, learningIds);

  const tabs = [
    { label: "All", value: "all" },
    { label: "Known", value: "known" },
    { label: "Learning", value: "learning" },
  ];

  return (
    <div className="min-h-full">
      <PageHeader
        title="Vocabulary"
        subtitle={`${words.length} words`}
        active="vocab"
      />

      <main className="mx-auto max-w-5xl px-4 py-8">
        <div className="mb-6 flex gap-2">
          {tabs.map((tab) => (
            <a
              key={tab.value}
              href={`/vocab?status=${tab.value}`}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                filter === tab.value
                  ? "bg-indigo-100 text-indigo-800"
                  : "bg-white text-slate-600 hover:bg-slate-100"
              }`}
            >
              {tab.label}
            </a>
          ))}
        </div>

        {words.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-500">
            No words yet. Import a lesson to start building your vocab.
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50">
                <tr>
                  <th className="px-4 py-3 font-medium text-slate-700">Russian</th>
                  <th className="px-4 py-3 font-medium text-slate-700">English</th>
                  <th className="px-4 py-3 font-medium text-slate-700">Status</th>
                  <th className="px-4 py-3 font-medium text-slate-700">Drill</th>
                </tr>
              </thead>
              <tbody>
                {words.map((word) => {
                  const stats = drillStats.get(word.id);
                  return (
                  <tr key={word.id} className="border-b border-slate-100 last:border-0">
                    <td className="px-4 py-3 font-medium text-slate-900">{word.lemma}</td>
                    <td className="px-4 py-3 text-slate-600">
                      {word.translation ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                          word.status === "known"
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {word.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {word.status === "learning" ? (
                        <span className="text-xs">
                          {stats
                            ? `${stats.correct}/${stats.attempts} correct`
                            : "0/0 correct"}
                          {word.learning_started_at && (
                            <>
                              {" · "}
                              {daysUntilClaimable(word.learning_started_at) > 0
                                ? `claim in ${daysUntilClaimable(word.learning_started_at)}d`
                                : "ready to claim"}
                            </>
                          )}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
