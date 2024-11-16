import React, { useContext, useState } from 'react';
import { Box, Typography, Button, TextField, IconButton } from '@mui/material';
import { ThumbUp, ThumbDown } from '@mui/icons-material';
import { submitComment, submitCommentVote } from '../services/commentService';
import { AuthContext } from '../context/AuthContext';
import { ModalContext } from '../context/ModalContext';

interface CommentProps {
  comment: any;
  billId: number;
  refreshComments: () => void;
}

const Comment: React.FC<CommentProps> = ({
  comment,
  billId,
  refreshComments,
}) => {
  const { user } = useContext(AuthContext);
  const { showModal } = useContext(ModalContext);
  const [replyContent, setReplyContent] = useState('');
  const [showReplyField, setShowReplyField] = useState(false);

  // Replace with actual user ID if authentication is implemented
  const userId: number | null = null;

  const handleReplySubmit = async () => {
    if (!replyContent.trim()) return;

    await submitComment(billId, replyContent, userId || undefined, comment.id);
    setReplyContent('');
    setShowReplyField(false);
    refreshComments();
  };

  const handleVote = async (voteType: number) => {
    if (!user) {
      showModal('auth', () => handleVote(voteType));
      return;
    }
    try {
      await submitCommentVote(comment.id, voteType, user.userId || undefined);
      refreshComments();
    } catch (error) {
      console.error('Error submitting vote:', error);
    }
  };

  return (
    <Box ml={comment.parentCommentId ? 4 : 0} mt={2}>
      <Typography variant="body1">{comment.content}</Typography>
      <Box display="flex" alignItems="center">
        <IconButton onClick={() => handleVote(1)}>
          <ThumbUp fontSize="small" />
        </IconButton>
        <Typography variant="body2">{comment.voteCount}</Typography>
        <IconButton onClick={() => handleVote(-1)}>
          <ThumbDown fontSize="small" />
        </IconButton>
        <Button size="small" onClick={() => setShowReplyField(!showReplyField)}>
          Reply
        </Button>
      </Box>
      {showReplyField && (
        <Box mt={1}>
          <TextField
            value={replyContent}
            onChange={(e) => setReplyContent(e.target.value)}
            fullWidth
            multiline
            rows={2}
          />
          <Button
            onClick={handleReplySubmit}
            variant="contained"
            size="small"
            sx={{ mt: 1 }}
          >
            Submit
          </Button>
        </Box>
      )}
      {comment.replies &&
        comment.replies.map((reply: any) => (
          <Comment
            key={reply.id}
            comment={reply}
            billId={billId}
            refreshComments={refreshComments}
          />
        ))}
    </Box>
  );
};

export default Comment;
