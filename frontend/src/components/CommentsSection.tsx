import React from 'react';
import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Typography,
  TextField,
  Button,
  Select,
  MenuItem,
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
}) => {
  return (
    <Accordion expanded={expanded} onChange={onChange}>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Typography variant="subtitle1">Comments</Typography>
      </AccordionSummary>
      <AccordionDetails>
        <form onSubmit={handleCommentSubmit}>
          <TextField
            label="Add a comment"
            value={commentContent}
            onChange={(e) => setCommentContent(e.target.value)}
            fullWidth
            multiline
            rows={4}
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
        <Select
          value="new"
          onChange={() => {
            /* handle sort */
          }}
          sx={{ mt: 2, mb: 2 }}
        >
          <MenuItem value="new">Newest</MenuItem>
          <MenuItem value="old">Oldest</MenuItem>
        </Select>
        {comments.map((comment) => (
          <Comment
            key={comment.id}
            comment={comment}
            billId={billId}
            refreshComments={refreshComments}
          />
        ))}
      </AccordionDetails>
    </Accordion>
  );
};

export default CommentsSection;
