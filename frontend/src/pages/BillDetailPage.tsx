import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getBills } from '../services/billService';
import { getVotes, submitVote } from '../services/voteService';
import { getComments, submitComment } from '../services/commentService';
import Comment from '../components/Comment';
import {
  Container,
  Typography,
  Button,
  ButtonGroup,
  TextField,
  List,
  Box,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  SelectChangeEvent,
} from '@mui/material';

interface Bill {
  id: number;
  billId: string;
  title: string;
  summary: string;
  date: string;
}

interface Vote {
  id: number;
  userId: number | null;
  billId: number;
  voteType: string;
}

interface Comment {
  id: number;
  content: string;
  userId: number | null;
  billId: number;
  date: string;
  user?: {
    id: number;
    state?: string;
  };
}

const BillDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [bill, setBill] = useState<Bill | null>(null);
  const [votes, setVotes] = useState<Vote[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [sortOption, setSortOption] = useState('new');
  const [selectedVote, setSelectedVote] = useState<
    'For' | 'Against' | 'Abstain' | null
  >(null);
  const [commentContent, setCommentContent] = useState('');
  const [loading, setLoading] = useState<boolean>(true);

  // Replace with actual user ID if authentication is implemented
  const userId: number | null = null; // null represents anonymous user

  useEffect(() => {
    const fetchData = async () => {
      if (id) {
        const billData = await getBills();
        const currentBill = billData.find((b: Bill) => b.id === parseInt(id));
        setBill(currentBill || null);

        const votesData = await getVotes(parseInt(id));
        setVotes(votesData);

        const commentsData = await getComments(parseInt(id));
        setComments(commentsData);
      }
      setLoading(false);
    };
    fetchData();
  }, [id]);

  const handleVote = async (voteType: 'For' | 'Against' | 'Abstain') => {
    if (!bill) return;

    try {
      await submitVote(bill.id, voteType, userId || undefined);
      // Refresh votes
      const updatedVotes = await getVotes(bill.id);
      setVotes(updatedVotes);
      setSelectedVote(voteType);
    } catch (error) {
      alert('Failed to submit vote. Please try again.');
    }
  };

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bill || !commentContent.trim()) return;

    try {
      await submitComment(bill.id, commentContent, userId || undefined);
      // Refresh comments
      const updatedComments = await getComments(bill.id);
      setComments(updatedComments);
      setCommentContent('');
    } catch (error) {
      alert('Failed to submit comment. Please try again.');
    }
  };

  const refreshComments = async () => {
    if (!bill) return;

    const commentsData = await getComments(bill.id);
    setComments(commentsData);
  };

  const handleSortChange = (event: SelectChangeEvent<string>) => {
    setSortOption(event.target.value as string);
    // Fetch comments again with the new sort option
    refreshComments();
  };

  // Aggregate vote counts
  const voteCounts = votes.reduce(
    (acc, vote) => {
      if (vote.voteType === 'For') acc.for += 1;
      if (vote.voteType === 'Against') acc.against += 1;
      if (vote.voteType === 'Abstain') acc.abstain += 1;
      return acc;
    },
    { for: 0, against: 0, abstain: 0 }
  );

  if (loading) {
    return (
      <Container>
        <Typography variant="h5">Loading...</Typography>
      </Container>
    );
  }

  if (!bill) {
    return (
      <Container>
        <Typography variant="h5">Bill not found.</Typography>
      </Container>
    );
  }

  return (
    <Container>
      <Typography variant="h4" gutterBottom>
        {bill.title}
      </Typography>
      <Typography variant="subtitle1" gutterBottom>
        {bill.summary}
      </Typography>
      <Typography variant="body2" color="textSecondary" gutterBottom>
        Date Introduced: {new Date(bill.date).toLocaleDateString()}
      </Typography>

      <Box mt={4}>
        <Typography variant="h6">Vote on this Bill</Typography>
        <ButtonGroup variant="contained" color="primary" sx={{ mt: 2 }}>
          <Button
            onClick={() => handleVote('For')}
            variant={selectedVote === 'For' ? 'contained' : 'outlined'}
          >
            For
          </Button>
          <Button
            onClick={() => handleVote('Against')}
            variant={selectedVote === 'Against' ? 'contained' : 'outlined'}
          >
            Against
          </Button>
          <Button
            onClick={() => handleVote('Abstain')}
            variant={selectedVote === 'Abstain' ? 'contained' : 'outlined'}
          >
            Abstain
          </Button>
        </ButtonGroup>

        <Box mt={2}>
          <Typography variant="body1">For: {voteCounts.for}</Typography>
          <Typography variant="body1">Against: {voteCounts.against}</Typography>
          <Typography variant="body1">Abstain: {voteCounts.abstain}</Typography>
        </Box>
      </Box>

      <Box mt={6}>
        <Typography variant="h6">Comments</Typography>
        <form onSubmit={handleCommentSubmit}>
          <TextField
            label="Add a comment"
            variant="outlined"
            fullWidth
            multiline
            rows={4}
            value={commentContent}
            onChange={(e) => setCommentContent(e.target.value)}
            sx={{ mt: 2, mb: 2 }}
          />
          <Button type="submit" variant="contained" color="primary">
            Submit Comment
          </Button>
        </form>

        <FormControl>
          <InputLabel id="sort-label">Sort by</InputLabel>
          <Select
            labelId="sort-label"
            value={sortOption}
            onChange={handleSortChange}
          >
            <MenuItem value="new">Newest</MenuItem>
            <MenuItem value="best">Best</MenuItem>
          </Select>
        </FormControl>

        <List>
          {comments.map((comment) => (
            <Comment
              key={comment.id}
              comment={comment}
              billId={bill.id}
              refreshComments={refreshComments}
            />
          ))}
        </List>
      </Box>
    </Container>
  );
};

export default BillDetailPage;
