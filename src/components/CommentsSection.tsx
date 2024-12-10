import React, { useState } from 'react';
import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Typography,
  TextField,
  Button,
  Box,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import Comment from './Comment';

interface CommentType {
  id: number;
  content: string;
  userId: number | null;
  username: string;
  date: string;
  voteCount: number;
  parentCommentId?: number;
  replies?: any;
}

interface CommentsSectionProps {
  expanded: boolean;
  onChange: (event: React.SyntheticEvent, isExpanded: boolean) => void;
  comments: CommentType[];
  commentContent: string;
  setCommentContent: (content: string) => void;
  handleCommentSubmit: (e: React.FormEvent) => void;
  refreshComments: () => void;
  billId: number;
  children?: React.ReactNode;
}

const CommentsSection: React.FC<CommentsSectionProps> = ({
  expanded,
  onChange,
  comments,
  commentContent,
  setCommentContent,
  handleCommentSubmit,
  refreshComments,
  billId,
  children,
}) => {
  const [errorMessage, setErrorMessage] = useState<string>('');

  const handleCommentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const content = e.target.value;
    setCommentContent(content);
    const length = content.length;
    if (length > 10000) {
      setErrorMessage(
        `Comment is ${length - 10000} characters over the limit.`
      );
    } else if (length > 9000) {
      setErrorMessage(
        `Approaching the limit: ${10000 - length} characters left.`
      );
    } else {
      setErrorMessage('');
    }
  };

  const handleCommentSubmitWithValidation = (e: React.FormEvent) => {
    e.preventDefault();
    if (commentContent.length > 10000) {
      // Handle error (e.g., show a message to the user)
      return;
    }
    handleCommentSubmit(e);
  };

  return (
    <Accordion expanded={expanded} onChange={onChange}>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Typography variant="subtitle1">Comments</Typography>
      </AccordionSummary>
      <AccordionDetails>
        <form onSubmit={handleCommentSubmitWithValidation}>
          <TextField
            label="Add a comment"
            value={commentContent}
            onChange={handleCommentChange} // Updated handler
            fullWidth
            multiline
            rows={4}
          />
          {errorMessage && (
            <Typography color="error" variant="body2" sx={{ mt: 1 }}>
              {errorMessage}
            </Typography>
          )}
          <Button
            type="submit"
            variant="contained"
            color="primary"
            sx={{ mt: 2 }}
          >
            Submit
          </Button>
        </form>
        <Box sx={{ mt: 4 }}>
          {' '}
          {/* Added Box with top margin */}
          {comments.map((comment) => (
            <Comment
              key={comment.id}
              comment={comment}
              billId={billId}
              refreshComments={refreshComments}
            />
          ))}
        </Box>
        {children}
      </AccordionDetails>
    </Accordion>
  );
};

export default CommentsSection;
