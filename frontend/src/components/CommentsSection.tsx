import React from 'react';
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
  children?: React.ReactNode; // Add this line
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
  children, // Add this line
}) => {
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
            onChange={(e) => setCommentContent(e.target.value)}
            fullWidth
            multiline
            rows={4}
            inputProps={{ maxLength: 10000 }}
          />
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
        {children} {/* Add this line to render nested components */}
      </AccordionDetails>
    </Accordion>
  );
};

export default CommentsSection;
