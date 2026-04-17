"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
  useQueryStates,
  parseAsString,
  parseAsStringLiteral,
  parseAsBoolean,
} from "nuqs";
import { BillCard } from "./bill-card";
import { BillGroupCard } from "./bill-group-card";
import { TOPICS } from "@/lib/topic-mapping";
import { useAuth } from "@/hooks/use-auth";
import { groupBills } from "@/lib/bill-grouping";
import type { BillSummary } from "@/types";

const SORT_OPTIONS = [
  { value: "relevant", label: "Trending" },
  { value: "latest", label: "Latest Activity" },
  { value: "newest", label: "Newest" },
] as const;

// Filter state lives in the URL so it survives back-nav from a bill detail
// page, is shareable, and works with the bfcache reload in layout.tsx.
// - history: "replace" keeps the back button semantic (back exits /bills,
//   doesn't step through every filter click).
// - clearOnDefault keeps the URL clean — /bills stays /bills until the user
//   actually narrows the feed.
// - throttleMs smooths search typing so we don't spam history.
const filterParsers = {
  search: parseAsString.withDefault(""),
  chamber: parseAsStringLiteral([
    "both",
    "house",
    "senate",
  ] as const).withDefault("both"),
  status: parseAsString.withDefault(""),
  momentum: parseAsStringLiteral([
    "live",
    "graveyard",
    "all",
  ] as const).withDefault("live"),
  sortBy: parseAsStringLiteral([
    "relevant",
    "latest",
    "newest",
  ] as const).withDefault("relevant"),
  topic: parseAsString.withDefault(""),
  hideVoted: parseAsBoolean.withDefault(false),
};

const filterOptions = {
  history: "replace" as const,
  clearOnDefault: true,
  shallow: true,
  throttleMs: 300,
};

export function BillListClient() {
  const [bills, setBills] = useState<BillSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [hiddenByMomentum, setHiddenByMomentum] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useQueryStates(filterParsers, filterOptions);
  const { search, chamber, status, momentum, sortBy, topic, hideVoted } =
    filters;
  const [showFilters, setShowFilters] = useState(false);
  const [votedBillIds, setVotedBillIds] = useState<Set<number>>(new Set());
  const observerRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();

  const activeFilterCount =
    (chamber !== "both" ? 1 : 0) +
    (status !== "" ? 1 : 0) +
    (hideVoted ? 1 : 0);

  const visibleBills = useMemo(
    () => (hideVoted ? bills.filter((b) => !votedBillIds.has(b.id)) : bills),
    [bills, hideVoted, votedBillIds],
  );
  const hiddenByVoteCount = hideVoted ? bills.length - visibleBills.length : 0;
  const feedItems = useMemo(() => groupBills(visibleBills), [visibleBills]);

  // Load the set of bills the current user has voted on.
  useEffect(() => {
    if (!user) {
      setVotedBillIds(new Set());
      setFilters({ hideVoted: false });
      return;
    }
    fetch("/api/user/voted-bills", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (Array.isArray(d?.billIds)) {
          setVotedBillIds(new Set<number>(d.billIds));
        }
      })
      .catch(() => {});
  }, [user, setFilters]);

  const fetchBills = useCallback(
    async (pageNum: number, append: boolean = false) => {
      if (append) setLoadingMore(true);
      else setLoading(true);
      const params = new URLSearchParams({
        page: String(pageNum),
        limit: "20",
        sortBy,
        order: "desc",
        momentum,
      });
      if (chamber !== "both") params.set("chamber", chamber);
      if (status) params.set("status", status);
      if (search) params.set("search", search);
      if (topic) {
        // URL stores the user-facing label ("Environment"); the API wants the
        // comma-joined CRS policy areas.
        const topicInfo = TOPICS.find((t) => t.label === topic);
        if (topicInfo) {
          params.set("topic", topicInfo.policyAreas.join(","));
        }
      }

      const res = await fetch(`/api/bills?${params}`);
      if (res.ok) {
        const data = await res.json();
        setBills((prev) => (append ? [...prev, ...data.bills] : data.bills));
        setTotal(data.total);
        setHiddenByMomentum(data.hiddenByMomentum ?? 0);
        setError(null);
      } else {
        setError("Something went wrong loading bills. Please try again.");
      }
      setLoading(false);
      setLoadingMore(false);
    },
    [chamber, status, momentum, sortBy, search, topic],
  );

  useEffect(() => {
    setPage(1);
    fetchBills(1);
  }, [fetchBills]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (
          entries[0].isIntersecting &&
          !loading &&
          !loadingMore &&
          bills.length < total
        ) {
          const nextPage = page + 1;
          setPage(nextPage);
          fetchBills(nextPage, true);
        }
      },
      { threshold: 0.1 },
    );
    if (observerRef.current) observer.observe(observerRef.current);
    return () => observer.disconnect();
  }, [loading, loadingMore, bills.length, total, page, fetchBills]);

  // `resetTo` is what the pill reverts to when the user clicks it while
  // already active. Chamber has no "none" value, so it reverts to "both"
  // (the default); status treats "" as "any".
  const filterPill = (
    label: string,
    value: string,
    current: string,
    key: "chamber" | "status",
    resetTo: string,
  ) => (
    <button
      key={value}
      onClick={() =>
        setFilters({ [key]: current === value ? resetTo : value } as Partial<
          typeof filters
        >)
      }
      className={`rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap transition-all ${
        current === value
          ? "bg-navy text-white"
          : "text-muted-foreground hover:text-navy hover:bg-navy/5"
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="space-y-3">
      {/* Row 1 — Search + Sort */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <svg
            className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <circle cx="11" cy="11" r="8" strokeWidth="2" />
            <path d="m21 21-4.35-4.35" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <input
            placeholder="Search bills..."
            value={search}
            onChange={(e) => setFilters({ search: e.target.value })}
            className="border-border/60 placeholder:text-muted-foreground focus:ring-navy/20 focus:border-navy/20 h-10 w-full rounded-lg border bg-white pr-3 pl-9 text-sm focus:ring-2 focus:outline-none"
          />
        </div>
        <div className="flex shrink-0 items-center gap-0.5">
          {SORT_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setFilters({ sortBy: opt.value })}
              className={`rounded px-2 py-1 text-xs font-medium transition-all ${
                sortBy === opt.value
                  ? "bg-navy/10 text-navy"
                  : "text-muted-foreground hover:text-navy"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Row 2 — Topics + Filters toggle */}
      <div className="flex items-center gap-2">
        <div className="scrollbar-hide -mx-1 flex flex-1 gap-1.5 overflow-x-auto px-1 pb-0.5">
          <button
            onClick={() => setFilters({ topic: "" })}
            className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium transition-all ${
              topic === ""
                ? "bg-navy text-white"
                : "bg-muted/50 text-muted-foreground hover:text-navy hover:bg-navy/5"
            }`}
          >
            All Topics
          </button>
          {TOPICS.map((t) => (
            <button
              key={t.label}
              onClick={() =>
                setFilters({ topic: topic === t.label ? "" : t.label })
              }
              className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium transition-all ${
                topic === t.label
                  ? "bg-navy text-white"
                  : "bg-muted/50 text-muted-foreground hover:text-navy hover:bg-navy/5"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-all ${
            showFilters || activeFilterCount > 0
              ? "border-navy/20 bg-navy/5 text-navy"
              : "border-border/50 text-muted-foreground hover:text-navy hover:border-navy/20"
          }`}
        >
          <svg
            className="h-3.5 w-3.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            strokeWidth="2"
          >
            <path strokeLinecap="round" d="M3 6h18M7 12h10M10 18h4" />
          </svg>
          Filters
          {activeFilterCount > 0 && (
            <span className="bg-navy flex h-4 w-4 items-center justify-center rounded-full text-[10px] leading-none text-white">
              {activeFilterCount}
            </span>
          )}
        </button>
      </div>

      {/* Expandable filter row */}
      {showFilters && (
        <div className="animate-fade-slide-up flex flex-wrap items-center gap-3 pb-2">
          <div className="border-border/50 flex items-center gap-0.5 rounded-full border px-1 py-0.5">
            {filterPill("All", "both", chamber, "chamber", "both")}
            {filterPill("House", "house", chamber, "chamber", "both")}
            {filterPill("Senate", "senate", chamber, "chamber", "both")}
          </div>

          <div className="border-border/50 flex items-center gap-0.5 rounded-full border px-1 py-0.5">
            {filterPill("Any", "", status, "status", "")}
            {filterPill("Introduced", "introduced", status, "status", "")}
            {filterPill("In Progress", "in_progress", status, "status", "")}
            {filterPill("Passed", "passed", status, "status", "")}
            {filterPill("Enacted", "enacted", status, "status", "")}
            {filterPill("Failed", "failed", status, "status", "")}
          </div>

          {user && votedBillIds.size > 0 && (
            <button
              onClick={() => setFilters({ hideVoted: !hideVoted })}
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-all ${
                hideVoted
                  ? "bg-navy border-navy text-white"
                  : "border-border/50 text-muted-foreground hover:text-navy hover:border-navy/20"
              }`}
            >
              <svg
                className="h-3 w-3"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                {hideVoted ? (
                  <>
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </>
                ) : (
                  <>
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </>
                )}
              </svg>
              {hideVoted ? "Voted hidden" : "Hide voted"}
            </button>
          )}
        </div>
      )}

      {/* Count + hidden bills link */}
      <div className="flex min-h-[24px] items-center justify-between">
        <p className="text-muted-foreground flex items-center gap-2 text-xs">
          {loading && (
            <span className="text-navy/70 inline-flex items-center gap-1.5">
              <span className="border-navy/15 border-t-navy/70 h-3 w-3 animate-spin rounded-full border-2" />
              Updating…
            </span>
          )}
          {!loading && total > 0 && (
            <>
              <span>
                {total.toLocaleString()} bill{total !== 1 ? "s" : ""}
              </span>
              {momentum === "live" && hiddenByMomentum > 0 && (
                <button
                  onClick={() => setFilters({ momentum: "all" })}
                  className="text-muted-foreground/70 hover:text-navy underline decoration-dotted underline-offset-2 transition-colors"
                >
                  ({hiddenByMomentum.toLocaleString()} dormant or dead hidden)
                </button>
              )}
              {momentum === "all" && (
                <button
                  onClick={() => setFilters({ momentum: "live" })}
                  className="text-muted-foreground/70 hover:text-navy underline decoration-dotted underline-offset-2 transition-colors"
                >
                  (show active only)
                </button>
              )}
              {hiddenByVoteCount > 0 && (
                <span className="text-muted-foreground/70">
                  · {hiddenByVoteCount} already voted on
                </span>
              )}
            </>
          )}
        </p>
      </div>

      {/* Bill list */}
      <div
        className={`space-y-2 transition-opacity duration-150 ${
          loading && bills.length > 0 ? "pointer-events-none opacity-40" : ""
        }`}
        aria-busy={loading}
      >
        {feedItems.map((item, i) => {
          const key =
            item.kind === "single"
              ? `bill-${item.bill.id}`
              : `group-${item.key}`;
          return (
            <div
              key={key}
              className="animate-fade-slide-up"
              style={{ animationDelay: `${Math.min(i, 10) * 30}ms` }}
            >
              {item.kind === "single" ? (
                <BillCard
                  bill={item.bill}
                  voted={votedBillIds.has(item.bill.id)}
                />
              ) : (
                <BillGroupCard bills={item.bills} votedBillIds={votedBillIds} />
              )}
            </div>
          );
        })}
      </div>

      {loading && bills.length === 0 && (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            // Shape-matching skeleton: chamber bar + title rows + badge row.
            // Respects prefers-reduced-motion automatically via motion-safe:.
            <div
              key={i}
              className="border-border/50 relative overflow-hidden rounded-lg border bg-white px-5 py-4"
              aria-hidden
            >
              <div className="bg-muted absolute top-0 bottom-0 left-0 w-1 rounded-l-lg" />
              <div className="space-y-2.5 pl-3">
                <div
                  className="bg-muted/60 h-4 rounded motion-safe:animate-pulse"
                  style={{ width: `${70 - i * 3}%` }}
                />
                <div
                  className="bg-muted/40 h-3 rounded motion-safe:animate-pulse"
                  style={{ width: `${55 - i * 2}%` }}
                />
                <div className="flex items-center gap-2 pt-1">
                  <div className="bg-muted/50 h-3 w-10 rounded motion-safe:animate-pulse" />
                  <div className="bg-muted/40 h-4 w-16 rounded motion-safe:animate-pulse" />
                  <div className="bg-muted/40 h-4 w-14 rounded motion-safe:animate-pulse" />
                  <div className="bg-muted/30 h-3 w-20 rounded motion-safe:animate-pulse" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {loadingMore && (
        <div className="flex justify-center py-6">
          <div className="text-muted-foreground flex items-center gap-2 text-xs">
            <div className="border-navy/15 border-t-navy/60 h-4 w-4 animate-spin rounded-full border-2" />
            Loading more…
          </div>
        </div>
      )}

      {error && (
        <div className="border-border/60 bg-muted/30 space-y-3 rounded-lg border p-6 text-center">
          <p className="text-muted-foreground text-sm">{error}</p>
          <button
            onClick={() => fetchBills(1)}
            className="text-navy border-border/60 hover:bg-navy/5 inline-flex items-center gap-1.5 rounded-md border bg-white px-3 py-1.5 text-xs font-medium transition-colors"
          >
            Try again
          </button>
        </div>
      )}

      {!loading && !error && bills.length === 0 && (
        <div className="py-16 text-center">
          <p className="text-muted-foreground text-sm">
            No bills found matching your filters.
          </p>
        </div>
      )}

      <div ref={observerRef} className="h-4" />
    </div>
  );
}
