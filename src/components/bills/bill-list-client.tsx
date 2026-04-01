"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { BillCard } from "./bill-card";
import type { BillSummary } from "@/types";

export function BillListClient() {
  const [bills, setBills] = useState<BillSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [chamber, setChamber] = useState("both");
  const [status, setStatus] = useState("");
  const [sortBy] = useState("introducedDate");
  const [order] = useState("desc");
  const observerRef = useRef<HTMLDivElement>(null);

  const fetchBills = useCallback(
    async (pageNum: number, append: boolean = false) => {
      setLoading(true);
      const params = new URLSearchParams({
        page: String(pageNum),
        limit: "20",
        sortBy,
        order,
      });
      if (chamber !== "both") params.set("chamber", chamber);
      if (status) params.set("status", status);
      if (search) params.set("search", search);

      const res = await fetch(`/api/bills?${params}`);
      if (res.ok) {
        const data = await res.json();
        setBills((prev) => (append ? [...prev, ...data.bills] : data.bills));
        setTotal(data.total);
      }
      setLoading(false);
    },
    [chamber, status, sortBy, order, search]
  );

  useEffect(() => {
    setPage(1);
    fetchBills(1);
  }, [fetchBills]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !loading && bills.length < total) {
          const nextPage = page + 1;
          setPage(nextPage);
          fetchBills(nextPage, true);
        }
      },
      { threshold: 0.1 }
    );
    if (observerRef.current) observer.observe(observerRef.current);
    return () => observer.disconnect();
  }, [loading, bills.length, total, page, fetchBills]);

  const filterPill = (
    label: string,
    value: string,
    current: string,
    setter: (v: string) => void
  ) => (
    <button
      key={value}
      onClick={() => setter(current === value ? "" : value)}
      className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy/40 ${
        current === value
          ? "bg-navy text-white"
          : "bg-transparent text-muted-foreground hover:text-navy hover:bg-navy/5"
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3 pb-4 border-b border-border/50">
        <div className="relative flex-1 min-w-[220px] max-w-sm">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="8" strokeWidth="2"/>
            <path d="m21 21-4.35-4.35" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          <input
            placeholder="Search bills..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-10 pl-9 pr-3 rounded-md border border-border/60 bg-white text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-navy/30 focus:border-navy/20"
          />
        </div>

        <div className="flex items-center gap-0.5 rounded-full border border-border/50 px-1 py-0.5">
          {filterPill("All", "both", chamber, setChamber)}
          {filterPill("House", "house", chamber, setChamber)}
          {filterPill("Senate", "senate", chamber, setChamber)}
        </div>

        <div className="flex items-center gap-0.5 rounded-full border border-border/50 px-1 py-0.5">
          {filterPill("Any", "", status, setStatus)}
          {filterPill("Introduced", "introduced", status, setStatus)}
          {filterPill("Passed", "passed", status, setStatus)}
          {filterPill("Enacted", "enacted", status, setStatus)}
        </div>
      </div>

      {/* Count */}
      {!loading && total > 0 && (
        <p className="text-sm text-muted-foreground">
          {total.toLocaleString()} bill{total !== 1 ? "s" : ""}
        </p>
      )}

      {/* Bill list */}
      <div className="space-y-2">
        {bills.map((bill, i) => (
          <div
            key={bill.id}
            className="animate-fade-slide-up"
            style={{ animationDelay: `${Math.min(i, 10) * 30}ms` }}
          >
            <BillCard bill={bill} />
          </div>
        ))}
      </div>

      {loading && (
        <div className="flex justify-center py-8">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <div className="w-4 h-4 rounded-full border-2 border-navy/15 border-t-navy/60 animate-spin" />
            Loading bills...
          </div>
        </div>
      )}

      {!loading && bills.length === 0 && (
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
