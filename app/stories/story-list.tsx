"use client";

import type { Story } from "@/lib/types";
import { ManageableCard } from "@/components/manageable-card";
import { deleteStoryAction, renameStoryAction } from "./actions";

interface StoryListProps {
  stories: Story[];
}

export function StoryList({ stories }: StoryListProps) {
  return (
    <div className="space-y-4">
      {stories.map((story) => (
        <ManageableCard
          key={story.id}
          id={story.id}
          title={story.title}
          href={`/stories/${story.id}`}
          subtitle={
            <>
              {new Date(story.created_at).toLocaleDateString()}
              {story.status === "generating" && " · Writing…"}
              {story.status === "failed" && " · Failed"}
              {story.known_word_pct != null && ` · ${story.known_word_pct}% familiar`}
            </>
          }
          deleteConfirmMessage={`Delete story "${story.title}"?\n\nThis cannot be undone.`}
          onRename={renameStoryAction}
          onDelete={deleteStoryAction}
        />
      ))}
    </div>
  );
}
