import type { CalendarPost } from "@/lib/types";
import { Calendar, Sparkles } from "lucide-react";

import { PanelShell } from "./PanelShell";

interface CalendarPanelProps {
  posts: CalendarPost[];
}

const PLATFORM_LABELS: Record<string, string> = {
  linkedin: "in",
  x: "𝕏",
};

export function CalendarPanel({ posts }: CalendarPanelProps) {
  const sorted = [...posts].sort((a, b) => {
    if (!a.scheduledAt) return 1;
    if (!b.scheduledAt) return -1;
    return new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime();
  });

  const organic = sorted.filter((p) => !p.isSponsored);
  const sponsored = sorted.filter((p) => p.isSponsored);

  return (
    <PanelShell
      title="Content calendar"
      subtitle={`${organic.length} organic · ${sponsored.length} sponsored`}
      icon={<Calendar className="h-3.5 w-3.5 text-muted" />}
      bodyClassName="p-3 space-y-4"
    >
      {sorted.length === 0 ? (
        <p className="py-8 text-center text-xs text-muted">No calendar posts yet</p>
      ) : (
        <>
          {organic.length > 0 && (
            <PostGroup label="Organic queue" posts={organic} />
          )}
          {sponsored.length > 0 && (
            <PostGroup label="Sponsored placements" posts={sponsored} sponsored />
          )}
        </>
      )}
    </PanelShell>
  );
}

function PostGroup({
  label,
  posts,
  sponsored,
}: {
  label: string;
  posts: CalendarPost[];
  sponsored?: boolean;
}) {
  return (
    <div>
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-muted">
        {label}
      </p>
      <div className="space-y-2">
        {posts.map((post) => (
          <CalendarCard key={post.id} post={post} sponsored={sponsored} />
        ))}
      </div>
    </div>
  );
}

function CalendarCard({
  post,
  sponsored,
}: {
  post: CalendarPost;
  sponsored?: boolean;
}) {
  const platformLabel =
    PLATFORM_LABELS[post.platform] ?? post.platform.slice(0, 2).toUpperCase();
  const dateLabel = post.scheduledAt
    ? new Date(post.scheduledAt).toLocaleDateString("en-GB", {
        weekday: "short",
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "Unscheduled";

  return (
    <article
      className={`rounded-lg border p-3 shadow-sm ${
        sponsored
          ? "border-indigo-200 bg-indigo-50"
          : "border-border bg-white"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="flex h-5 w-5 items-center justify-center rounded bg-surface-2 text-[9px] font-bold text-muted">
            {platformLabel}
          </span>
          {sponsored && (
            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-indigo-700">
              <Sparkles className="h-3 w-3" />
              Sponsored
            </span>
          )}
        </div>
        <StatusBadge status={post.status} />
      </div>
      {post.title && (
        <p className="mt-2 text-xs font-medium leading-snug text-foreground">
          {post.title}
        </p>
      )}
      <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-muted/95">
        {post.content}
      </p>
      <p className="mt-2 text-[10px] font-medium text-muted">{dateLabel}</p>
    </article>
  );
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`shrink-0 rounded-full px-2 py-0.5 text-[9px] font-medium capitalize ${
        status === "scheduled"
          ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
          : status === "draft"
            ? "bg-amber-50 text-amber-700 ring-1 ring-amber-200"
            : "bg-surface text-muted ring-1 ring-border"
      }`}
    >
      {status}
    </span>
  );
}
