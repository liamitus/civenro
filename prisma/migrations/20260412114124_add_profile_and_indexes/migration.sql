-- CreateTable
CREATE TABLE "Profile" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL DEFAULT 'Anonymous',
    "email" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Profile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Profile_username_idx" ON "Profile"("username");

-- CreateIndex
CREATE INDEX "Comment_userId_idx" ON "Comment"("userId");

-- CreateIndex
CREATE INDEX "Comment_billId_idx" ON "Comment"("billId");

-- CreateIndex
CREATE INDEX "Comment_billId_parentCommentId_idx" ON "Comment"("billId", "parentCommentId");

-- CreateIndex
CREATE INDEX "CommentVote_commentId_idx" ON "CommentVote"("commentId");

-- CreateIndex
CREATE INDEX "Conversation_userId_billId_idx" ON "Conversation"("userId", "billId");

-- CreateIndex
CREATE INDEX "Conversation_billId_idx" ON "Conversation"("billId");

-- CreateIndex
CREATE INDEX "Message_conversationId_idx" ON "Message"("conversationId");

-- CreateIndex
CREATE INDEX "Vote_userId_idx" ON "Vote"("userId");
