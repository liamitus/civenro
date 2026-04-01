"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import Link from "next/link";
import type { CommentData } from "@/types";

export default function AccountPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [comments, setComments] = useState<CommentData[]>([]);
  const [totalComments, setTotalComments] = useState(0);
  const [page, setPage] = useState(1);

  // Settings state
  const [newUsername, setNewUsername] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [message, setMessage] = useState("");

  const fetchComments = useCallback(async () => {
    if (!user) return;
    const res = await fetch(`/api/comments/user/${user.id}?page=${page}`);
    if (res.ok) {
      const data = await res.json();
      setComments((prev) =>
        page === 1 ? data.comments : [...prev, ...data.comments]
      );
      setTotalComments(data.total);
    }
  }, [user, page]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/");
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  if (authLoading || !user) return null;

  const username = user.user_metadata?.username || "User";

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 space-y-6">
      <h1 className="text-2xl font-bold">Account</h1>

      <Card className="p-4 space-y-4">
        <h2 className="font-semibold">Profile</h2>
        <p className="text-sm text-muted-foreground">
          Username: <span className="text-foreground">{username}</span>
        </p>
        <p className="text-sm text-muted-foreground">
          Email: <span className="text-foreground">{user.email}</span>
        </p>
        <p className="text-sm text-muted-foreground">
          Member since:{" "}
          <span className="text-foreground">
            {new Date(user.created_at).toLocaleDateString()}
          </span>
        </p>
      </Card>

      <Card className="p-4 space-y-4">
        <h2 className="font-semibold">Update Username</h2>
        <div className="flex gap-2">
          <Input
            value={newUsername}
            onChange={(e) => setNewUsername(e.target.value)}
            placeholder="New username"
          />
          <Button
            size="sm"
            onClick={async () => {
              // Note: username updates go through Supabase user metadata
              setMessage("Username update — feature coming soon");
            }}
          >
            Update
          </Button>
        </div>
      </Card>

      <Card className="p-4 space-y-4">
        <h2 className="font-semibold">Update Email</h2>
        <div className="flex gap-2">
          <Input
            type="email"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            placeholder="New email"
          />
          <Button
            size="sm"
            onClick={async () => {
              setMessage("Email update — feature coming soon");
            }}
          >
            Update
          </Button>
        </div>
      </Card>

      <Card className="p-4 space-y-4">
        <h2 className="font-semibold">Change Password</h2>
        <div className="space-y-2">
          <Label>Current Password</Label>
          <Input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
          />
          <Label>New Password</Label>
          <Input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
          <Button
            size="sm"
            onClick={async () => {
              setMessage("Password update — feature coming soon");
            }}
          >
            Change Password
          </Button>
        </div>
      </Card>

      {message && (
        <p className="text-sm text-muted-foreground">{message}</p>
      )}

      <Separator />

      <div className="space-y-3">
        <h2 className="font-semibold">Your Comments ({totalComments})</h2>
        {comments.map((comment) => (
          <Card key={comment.id} className="p-3">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm">{comment.content}</p>
                {comment.bill && (
                  <Link
                    href={`/bills/${comment.bill.id}`}
                    className="text-xs text-primary hover:underline mt-1 block"
                  >
                    {comment.bill.title}
                  </Link>
                )}
              </div>
              <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">
                {new Date(comment.date).toLocaleDateString()}
              </span>
            </div>
          </Card>
        ))}

        {totalComments > comments.length && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setPage((p) => p + 1)}
            className="w-full"
          >
            Load more
          </Button>
        )}
      </div>
    </div>
  );
}
