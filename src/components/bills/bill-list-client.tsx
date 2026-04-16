"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { BillCard } from "./bill-card";
import { TOPICS } from "@/lib/topic-mapping";
import { useAuth } from "@/hooks/use-auth";
import type { BillSummary } from "@/types";

const SORT_OPTIONS = [
  { value: "relevant", label: "Trending" },
  { value: "latest", label: "Latest Activity" },
  { value: "newest", label: "Newest" },
] as const;

export function BillListClient() {
  const [bills, setBills] = useState<BillSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [hiddenByMomentum, setHiddenByMomentum] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [chamber, setChamber] = useState("both");
  const [status, setStatus] = useState("");
  const [momentum, setMomentum] = useState("live");
  const [sortBy, setSortBy] = useState("relevant");
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [votedBillIds, setVotedBillIds] = useState<Set<number>>(new Set());
  const [hideVoted, setHideVoted] = useState(false);
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

  // Load the set of bills the current user has voted on.
  useEffect(() => {
    if (!user) {
      setVotedBillIds(new Set());
      setHideVoted(false);
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
  }, [user]);

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
      if (selectedTopic) {
        const topicInfo = TOPICS.find((t) => t.label === selectedTopic);
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
    [chamber, status, momentum, sortBy, search, selectedTopic]
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
      { threshold: 0.1 }
    );
    if (observerRef.current) observer.observe(observerRef.current);
    return () => observer.disconnect();
  }, [loading, loadingMore, bills.length, total, page, fetchBills]);

  const filterPill = (
    label: string,
    value: string,
    current: string,
    setter: (v: string) => void
  ) => (
    <button
      key={value}
      onClick={() => setter(current === value ? "" : value)}
      className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all whitespace-nowrap ${
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
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <circle cx="11" cy="11" r="8" strokeWidth="2" />
            <path
              d="m21 21-4.35-4.35"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
          <input
            placeholder="Search bills..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-10 pl-9 pr-3 rounded-lg border border-border/60 bg-white text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy/20"
          />
        </div>
        <div className="flex items-center gap-0.5 shrink-0">
          {SORT_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setSortBy(opt.value)}
              className={`px-2 py-1 rounded text-xs font-medium transition-all ${
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
        <div className="flex-1 flex gap-1.5 overflow-x-auto pb-0.5 scrollbar-hide -mx-1 px-1">
          <button
            onClick={() => setSelectedTopic(null)}
            className={`shrink-0 px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
              selectedTopic === null
                ? "bg-navy text-white"
                : "bg-muted/50 text-muted-foreground hover:text-navy hover:bg-navy/5"
            }`}
          >
            All Topics
          </button>
          {TOPICS.map((topic) => (
            <button
              key={topic.label}
              onClick={() =>
                setSelectedTopic(
                  selectedTopic === topic.label ? null : topic.label
                )
              }
              className={`shrink-0 px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
                selectedTopic === topic.label
                  ? "bg-navy text-white"
                  : "bg-muted/50 text-muted-foreground hover:text-navy hover:bg-navy/5"
              }`}
            >
              {topic.label}
            </button>
          ))}
        </div>

        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all border ${
            showFilters || activeFilterCount > 0
              ? "border-navy/20 bg-navy/5 text-navy"
              : "border-border/50 text-muted-foreground hover:text-navy hover:border-navy/20"
          }`}
        >
          <svg
            className="w-3.5 h-3.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            strokeWidth="2"
          >
            <path
              strokeLinecap="round"
              d="M3 6h18M7 12h10M10 18h4"
            />
          </svg>
          Filters
          {activeFilterCount > 0 && (
            <span className="w-4 h-4 rounded-full bg-navy text-white text-[10px] flex items-center justify-center leading-none">
              {activeFilterCount}
            </span>
          )}
        </button>
      </div>

      {/* Expandable filter row */}
      {showFilters && (
        <div className="flex flex-wrap items-center gap-3 pb-2 animate-fade-slide-up">
          <div className="flex items-center gap-0.5 rounded-full border border-border/50 px-1 py-0.5">
            {filterPill("All", "both", chamber, setChamber)}
            {filterPill("House", "house", chamber, setChamber)}
            {filterPill("Senate", "senate", chamber, setChamber)}
          </div>

          <div className="flex items-center gap-0.5 rounded-full border border-border/50 px-1 py-0.5">
            {filterPill("Any", "", status, setStatus)}
            {filterPill("Introduced", "introduced", status, setStatus)}
            {filterPill("In Progress", "in_progress", status, setStatus)}
            {filterPill("Passed", "passed", status, setStatus)}
            {filterPill("Enacted", "enacted", status, setStatus)}
            {filterPill("Failed", "failed", status, setStatus)}
          </div>

          {user && votedBillIds.size > 0 && (
            <button
              onClick={() => setHideVoted(!hideVoted)}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all border ${
                hideVoted
                  ? "bg-navy text-white border-navy"
                  : "border-border/50 text-muted-foreground hover:text-navy hover:border-navy/20"
              }`}
            >
              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
      <div className="flex items-center justify-between min-h-[24px]">
        <p className="text-xs text-muted-foreground flex items-center gap-2">
          {loading && (
            <span className="inline-flex items-center gap-1.5 text-navy/70">
              <span className="w-3 h-3 rounded-full border-2 border-navy/15 border-t-navy/70 animate-spin" />
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
                  onClick={() => setMomentum("all")}
                  className="text-muted-foreground/70 hover:text-navy underline decoration-dotted underline-offset-2 transition-colors"
                >
                  ({hiddenByMomentum.toLocaleString()} dormant or dead hidden)
                </button>
              )}
              {momentum === "all" && (
                <button
                  onClick={() => setMomentum("live")}
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
          loading && bills.length > 0 ? "opacity-40 pointer-events-none" : ""
        }`}
        aria-busy={loading}
      >
        {visibleBills.map((bill, i) => (
          <div
            key={bill.id}
            className="animate-fade-slide-up"
            style={{ animationDelay: `${Math.min(i, 10) * 30}ms` }}
          >
            <BillCard bill={bill} voted={votedBillIds.has(bill.id)} />
          </div>
        ))}
      </div>

      {loading && bills.length === 0 && (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-[92px] rounded-lg border border-border/40 bg-muted/30 animate-pulse"
            />
          ))}
        </div>
      )}

      {loadingMore && (
        <div className="flex justify-center py-6">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <div className="w-4 h-4 rounded-full border-2 border-navy/15 border-t-navy/60 animate-spin" />
            Loading more…
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-border/60 bg-muted/30 p-6 text-center space-y-3">
          <p className="text-sm text-muted-foreground">{error}</p>
          <button
            onClick={() => fetchBills(1)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-navy bg-white border border-border/60 rounded-md hover:bg-navy/5 transition-colors"
          >
            Try again
          </button>
        </div>
      )}

      {!loading && !error && bills.length === 0 && (
        <div className="py-16 text-center">
          <p className="text-sm text-muted-foreground">
            No bills found matching your filters.
          </p>
        </div>
      )}

      <div ref={observerRef} className="h-4" />
    </div>
  );
}
