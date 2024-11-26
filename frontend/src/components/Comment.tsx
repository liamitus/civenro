import React, { useContext, useState } from 'react';
import {
  Box,
  Typography,
  Button,
  TextField,
  IconButton,
  useTheme,
} from '@mui/material';
import {
  ExpandLess,
  ExpandMore,
  AddCircleOutline,
  RemoveCircleOutline,
} from '@mui/icons-material';
import { submitComment, submitCommentVote } from '../services/commentService';
import { AuthContext } from '../context/AuthContext';
import { ModalContext } from '../context/ModalContext';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

const VOTE_THRESHOLD = -1;

interface CommentProps {
  comment: {
    id: number;
    content: string;
    userId: number | null;
    username: string;
    date: string;
    voteCount: number;
    parentCommentId?: number;
    replies?: CommentProps['comment'][];
    userVote?: number; // 1 for upvote, -1 for downvote, 0 or undefined for no vote
  };
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
  const isHidden = comment.voteCount <= VOTE_THRESHOLD;
  const [isCollapsed, setIsCollapsed] = useState(isHidden);

  const theme = useTheme();

  const handleReplySubmit = async () => {
    if (!replyContent.trim()) return;

    await submitComment(billId, replyContent, user.userId, comment.id);
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
      await submitCommentVote(comment.id, voteType, user.userId);
      // Update comment.userVote locally
      comment.userVote = voteType === comment.userVote ? 0 : voteType;
      refreshComments();
    } catch (error) {
      console.error('Error submitting vote:', error);
    }
  };

  // Determine button colors based on userVote
  const upvoteColor = comment.userVote === 1 ? 'primary' : 'default';
  const downvoteColor = comment.userVote === -1 ? 'primary' : 'default';

  return (
    <Box ml={comment.parentCommentId ? 2 : 0} mt={1}>
      <Box display="flex" alignItems="flex-start">
        {/* Vote Bar */}
        <Box
          display="flex"
          flexDirection="column"
          alignItems="center"
          mr={1}
          mt={0.5}
        >
          <IconButton
            onClick={() => handleVote(1)}
            size="small"
            aria-label="Upvote"
            color={upvoteColor}
          >
            <AddCircleOutline fontSize="inherit" />
          </IconButton>
          <IconButton
            onClick={() => handleVote(-1)}
            size="small"
            aria-label="Downvote"
            color={downvoteColor}
          >
            <RemoveCircleOutline fontSize="inherit" />
          </IconButton>
        </Box>

        {/* Comment Content */}
        <Box flex="1">
          <Box display="flex" alignItems="center">
            <IconButton
              onClick={() => setIsCollapsed(!isCollapsed)}
              size="small"
            >
              {isCollapsed ? <ExpandMore /> : <ExpandLess />}
            </IconButton>
            <Typography variant="subtitle2" color="textSecondary">
              {comment.username}
            </Typography>
            <Typography
              variant="subtitle2"
              color="textSecondary"
              sx={{ mx: 1 }}
            >
              {comment.voteCount}
            </Typography>
            <Typography variant="body2" color="textSecondary">
              • {dayjs(comment.date).fromNow()}
            </Typography>
          </Box>

          {!isCollapsed && (
            <>
              <Typography variant="body1" sx={{ mt: 0.5 }}>
                {comment.content}
              </Typography>
              <Box display="flex" alignItems="center" sx={{ mt: 0.5 }}>
                <Button
                  size="small"
                  onClick={() => setShowReplyField(!showReplyField)}
                >
                  Reply
                </Button>
              </Box>
              {showReplyField && (
                <Box mt={0.5}>
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
                    sx={{ mt: 0.5 }}
                  >
                    Submit
                  </Button>
                </Box>
              )}
              {/* Render Replies */}
              {comment.replies &&
                comment.replies.map((reply: any) => (
                  <Comment
                    key={reply.id}
                    comment={reply}
                    billId={billId}
                    refreshComments={refreshComments}
                  />
                ))}
            </>
          )}
          {isCollapsed && isHidden && (
            <Typography variant="body2" color="textSecondary" sx={{ mt: 0.5 }}>
              Comment hidden due to low score.
            </Typography>
          )}
        </Box>
      </Box>
    </Box>
  );
};

export default Comment;
