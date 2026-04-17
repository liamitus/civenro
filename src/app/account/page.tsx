"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  PasswordStrengthIndicator,
  validatePassword,
} from "@/components/auth/password-strength";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { DonationHistory } from "@/components/account/donation-history";
import { resolveUsername } from "@/lib/citizen-id";
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
  const [newPassword, setNewPassword] = useState("");
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error">(
    "success",
  );

  // Delete account state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);

  const supabase = createSupabaseBrowserClient();

  const showMessage = (text: string, type: "success" | "error" = "success") => {
    setMessage(text);
    setMessageType(type);
    if (type === "success") {
      setTimeout(() => setMessage(""), 4000);
    }
  };

  const fetchComments = useCallback(async () => {
    if (!user) return;
    const res = await fetch(`/api/comments/user/${user.id}?page=${page}`);
    if (res.ok) {
      const data = await res.json();
      setComments((prev) =>
        page === 1 ? data.comments : [...prev, ...data.comments],
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

  const username = resolveUsername(user);

  const handleUpdateUsername = async () => {
    if (!newUsername.trim()) return;
    const { error } = await supabase.auth.updateUser({
      data: { username: newUsername.trim() },
    });
    if (error) {
      showMessage(error.message, "error");
    } else {
      // Sync display name to existing comments
      await fetch("/api/account/username", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: newUsername.trim() }),
      });
      showMessage("Username updated");
      setNewUsername("");
    }
  };

  const handleUpdateEmail = async () => {
    if (!newEmail.trim()) return;
    const { error } = await supabase.auth.updateUser({
      email: newEmail.trim(),
    });
    if (error) {
      showMessage(error.message, "error");
    } else {
      showMessage(
        "Confirmation email sent to your new address. Check both inboxes.",
      );
      setNewEmail("");
    }
  };

  const handleUpdatePassword = async () => {
    const validation = validatePassword(newPassword);
    if (!validation.isValid) {
      showMessage("Password does not meet requirements", "error");
      return;
    }
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });
    if (error) {
      showMessage(error.message, "error");
    } else {
      showMessage("Password updated");
      setNewPassword("");
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== "DELETE") return;
    setDeleting(true);

    const res = await fetch("/api/account/delete", {
      method: "DELETE",
    });

    if (res.ok) {
      await supabase.auth.signOut();
      router.push("/");
    } else {
      const data = await res.json();
      showMessage(data.error || "Failed to delete account", "error");
      setDeleting(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-6">
      <h1 className="text-2xl font-bold">Account</h1>

      <Card className="space-y-4 p-4">
        <h2 className="font-semibold">Profile</h2>
        <p className="text-muted-foreground text-sm">
          Username: <span className="text-foreground">{username}</span>
        </p>
        <p className="text-muted-foreground text-sm">
          Email: <span className="text-foreground">{user.email}</span>
        </p>
        <p className="text-muted-foreground text-sm">
          Member since:{" "}
          <span className="text-foreground">
            {new Date(user.created_at).toLocaleDateString()}
          </span>
        </p>
      </Card>

      <Card className="space-y-4 p-4">
        <h2 className="font-semibold">Display Name</h2>
        <p className="text-muted-foreground text-xs">
          This is how you appear in comments and discussions. You were assigned{" "}
          <span className="text-foreground font-medium">{username}</span> —
          change it to your name or a pseudonym you prefer.
        </p>
        <div className="flex gap-2">
          <Input
            value={newUsername}
            onChange={(e) => setNewUsername(e.target.value)}
            placeholder="New display name"
          />
          <Button size="sm" onClick={handleUpdateUsername}>
            Update
          </Button>
        </div>
      </Card>

      <Card className="space-y-4 p-4">
        <h2 className="font-semibold">Update Email</h2>
        <p className="text-muted-foreground text-xs">
          A confirmation link will be sent to both your current and new email.
        </p>
        <div className="flex gap-2">
          <Input
            type="email"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            placeholder="New email"
          />
          <Button size="sm" onClick={handleUpdateEmail}>
            Update
          </Button>
        </div>
      </Card>

      <Card className="space-y-4 p-4">
        <h2 className="font-semibold">Change Password</h2>
        <div className="space-y-2">
          <Label>New Password</Label>
          <Input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
          <PasswordStrengthIndicator password={newPassword} />
          <Button size="sm" onClick={handleUpdatePassword}>
            Change Password
          </Button>
        </div>
      </Card>

      {message && (
        <p
          className={`text-sm ${
            messageType === "error" ? "text-red-500" : "text-green-600"
          }`}
        >
          {message}
        </p>
      )}

      <Separator />

      <DonationHistory userId={user.id} />

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
                    className="text-primary mt-1 block text-xs hover:underline"
                  >
                    {comment.bill.title}
                  </Link>
                )}
              </div>
              <span className="text-muted-foreground ml-2 text-xs whitespace-nowrap">
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

      <Separator />

      <Card className="space-y-4 border-red-200 p-4">
        <h2 className="font-semibold text-red-600">Danger Zone</h2>
        <p className="text-muted-foreground text-sm">
          Permanently delete your account and all associated data. This action
          cannot be undone.
        </p>
        {!showDeleteConfirm ? (
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setShowDeleteConfirm(true)}
          >
            Delete Account
          </Button>
        ) : (
          <div className="space-y-2">
            <p className="text-sm text-red-600">
              Type <span className="font-mono font-bold">DELETE</span> to
              confirm:
            </p>
            <Input
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder="Type DELETE"
              className="max-w-xs"
            />
            <div className="flex gap-2">
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDeleteAccount}
                disabled={deleteConfirmText !== "DELETE" || deleting}
              >
                {deleting ? "Deleting..." : "Permanently Delete"}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setDeleteConfirmText("");
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
