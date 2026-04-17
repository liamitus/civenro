"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/use-auth";
import type { CommentData } from "@/types";

function Comment({
  comment,
  onReply,
  userId,
}: {
  comment: CommentData;
  onReply: (parentId: number, content: string) => Promise<void>;
  userId: string | null;
}) {
  const [showReply, setShowReply] = useState(false);
  const [replyContent, setReplyContent] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleVote = async (voteType: number) => {
    if (!userId) return;
    await fetch("/api/comment-votes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ commentId: comment.id, voteType }),
    });
  };

  const handleReply = async () => {
    if (!replyContent.trim()) return;
    setSubmitting(true);
    await onReply(comment.id, replyContent);
    setReplyContent("");
    setShowReply(false);
    setSubmitting(false);
  };

  return (
    <div className="border-border border-l-2 py-2 pl-3">
      <div className="text-muted-foreground flex items-center gap-2 text-xs">
        <span className="text-foreground font-medium">{comment.username}</span>
        <span>{new Date(comment.date).toLocaleDateString()}</span>
      </div>

      <p className="mt-1 text-sm">{comment.content}</p>

      <div className="mt-1 flex items-center gap-2">
        <button
          onClick={() => handleVote(1)}
          className="text-muted-foreground hover:text-foreground text-xs"
          disabled={!userId}
        >
          +
        </button>
        <span className="text-xs font-medium">{comment.voteCount}</span>
        <button
          onClick={() => handleVote(-1)}
          className="text-muted-foreground hover:text-foreground text-xs"
          disabled={!userId}
        >
          -
        </button>
        {userId && (
          <button
            onClick={() => setShowReply(!showReply)}
            className="text-muted-foreground hover:text-foreground ml-2 text-xs"
          >
            Reply
          </button>
        )}
      </div>

      {showReply && (
        <div className="mt-2 space-y-2">
          <Textarea
            value={replyContent}
            onChange={(e) => setReplyContent(e.target.value)}
            placeholder="Write a reply..."
            className="min-h-[60px] text-sm"
          />
          <Button size="sm" onClick={handleReply} disabled={submitting}>
            {submitting ? "..." : "Reply"}
          </Button>
        </div>
      )}

      {comment.replies?.map((reply) => (
        <Comment
          key={reply.id}
          comment={reply}
          onReply={onReply}
          userId={userId}
        />
      ))}
    </div>
  );
}

export function CommentsSection({
  billId,
  onSignUp,
}: {
  billId: number;
  onSignUp?: () => void;
}) {
  const { user } = useAuth();
  const [comments, setComments] = useState<CommentData[]>([]);
  const [total, setTotal] = useState(0);
  const [newComment, setNewComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<"new" | "best">("new");

  const fetchComments = useCallback(async () => {
    const res = await fetch(
      `/api/comments/bill/${billId}?page=${page}&sort=${sort}`,
    );
    if (res.ok) {
      const data = await res.json();
      setComments(data.comments);
      setTotal(data.total);
    }
  }, [billId, page, sort]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  const submitComment = async (parentCommentId?: number, content?: string) => {
    const text = content || newComment;
    if (!text.trim() || !user) return;
    setSubmitting(true);

    await fetch("/api/comments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        billId,
        content: text,
        parentCommentId: parentCommentId || null,
      }),
    });

    if (!parentCommentId) setNewComment("");
    setSubmitting(false);
    fetchComments();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">
          Comments{total > 0 ? ` (${total})` : ""}
        </h3>
        <div className="flex gap-1">
          {(["new", "best"] as const).map((s) => (
            <Button
              key={s}
              variant={sort === s ? "default" : "ghost"}
              size="sm"
              onClick={() => setSort(s)}
              className="h-7 text-xs"
            >
              {s === "new" ? "New" : "Best"}
            </Button>
          ))}
        </div>
      </div>

      {user && (
        <div className="space-y-2">
          <Textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Share your thoughts..."
            className="min-h-[80px]"
          />
          <Button
            size="sm"
            onClick={() => submitComment()}
            disabled={submitting || !newComment.trim()}
          >
            {submitting ? "Posting..." : "Post Comment"}
          </Button>
        </div>
      )}

      {comments.length === 0 ? (
        <div className="space-y-1 py-8 text-center">
          <p className="text-muted-foreground text-sm">
            {user ? (
              "Start the conversation — share your perspective above."
            ) : (
              <>
                No comments yet.{" "}
                <button
                  type="button"
                  onClick={onSignUp}
                  className="hover:text-primary font-medium underline underline-offset-2 transition-colors"
                >
                  Sign up
                </button>{" "}
                to be the first to weigh in.
              </>
            )}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {comments.map((comment) => (
            <Comment
              key={comment.id}
              comment={comment}
              onReply={async (parentId, content) =>
                submitComment(parentId, content)
              }
              userId={user?.id || null}
            />
          ))}
        </div>
      )}

      {total > comments.length && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setPage((p) => p + 1)}
          className="w-full"
        >
          Load more comments
        </Button>
      )}
    </div>
  );
}
