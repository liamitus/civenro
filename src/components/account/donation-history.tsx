"use client";

import { useState, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

type DonationRow = {
  id: string;
  amountCents: number;
  currency: string;
  isRecurring: boolean;
  recurringStatus: string | null;
  displayMode: string;
  displayName: string | null;
  tributeName: string | null;
  createdAt: string;
  hiddenAt: string | null;
};

export function DonationHistory({ userId: _userId }: { userId: string }) {
  const [donations, setDonations] = useState<DonationRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDonations = useCallback(async () => {
    const res = await fetch(`/api/account/donations`);
    if (res.ok) {
      const data = await res.json();
      setDonations(data.donations);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchDonations();
  }, [fetchDonations]);

  const handleMakeAnonymous = async (donationId: string) => {
    const res = await fetch(`/api/account/donations`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ donationId, action: "anonymize" }),
    });
    if (res.ok) fetchDonations();
  };

  const handleHide = async (donationId: string) => {
    const res = await fetch(`/api/account/donations`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ donationId, action: "hide" }),
    });
    if (res.ok) fetchDonations();
  };

  if (loading) return null;
  if (donations.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">
          Your Contributions ({donations.length})
        </h2>
        <Link href="/support" className="text-primary text-xs hover:underline">
          Support again
        </Link>
      </div>
      {donations.map((d) => (
        <Card key={d.id} className="p-3">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">
                  ${(d.amountCents / 100).toFixed(2)}
                </span>
                {d.isRecurring && (
                  <Badge variant="outline" className="px-1.5 text-[10px]">
                    {d.recurringStatus === "ACTIVE"
                      ? "Monthly"
                      : d.recurringStatus === "GRACE"
                        ? "Retrying"
                        : d.recurringStatus === "CANCELED"
                          ? "Canceled"
                          : "Monthly"}
                  </Badge>
                )}
              </div>
              <p className="text-muted-foreground text-xs">
                {d.displayMode === "ANONYMOUS"
                  ? "Anonymous"
                  : d.displayMode === "TRIBUTE"
                    ? `In honor of ${d.tributeName}`
                    : (d.displayName ?? "Anonymous")}
                {d.hiddenAt && " (hidden from public page)"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground text-xs">
                {new Date(d.createdAt).toLocaleDateString()}
              </span>
              {d.displayMode !== "ANONYMOUS" && !d.hiddenAt && (
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-xs"
                    onClick={() => handleMakeAnonymous(d.id)}
                  >
                    Make anonymous
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground h-6 px-2 text-xs"
                    onClick={() => handleHide(d.id)}
                  >
                    Hide
                  </Button>
                </div>
              )}
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
