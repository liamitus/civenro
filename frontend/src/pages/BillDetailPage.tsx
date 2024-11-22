// frontend/src/pages/BillDetailPage.tsx

import React, { useContext, useEffect, useState } from 'react';
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
  Avatar,
  Grid,
  Tooltip,
} from '@mui/material';
import { AuthContext } from '../context/AuthContext';
import { ModalContext } from '../context/ModalContext';
import { UserContext } from '../context/UserContext';
import { getRepresentativesByAddress } from '../services/representativeService';
import AddressInput from '../components/AddressInput';

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
  const { user } = useContext(AuthContext);
  const { showModal } = useContext(ModalContext);
  const { address } = useContext(UserContext);
  const [representatives, setRepresentatives] = useState([]);

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

  useEffect(() => {
    const fetchRepresentatives = async () => {
      if (address && bill && bill.id) {
        const data = await getRepresentativesByAddress(address, bill.id);
        setRepresentatives(data);
      }
    };
    fetchRepresentatives();
  }, [address, bill?.id]);

  const handleVote = async (voteType: 'For' | 'Against' | 'Abstain') => {
    if (!user) {
      showModal('auth', () => handleVote(voteType)); // Retry the action after login
      return;
    }
    if (!bill) return;

    try {
      await submitVote(bill.id, voteType);
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
    if (!user) {
      showModal('auth', () => handleCommentSubmit(e));
      return;
    }
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

  // Add a function to map votes to colors
  const getVoteBorderColor = (vote: string) => {
    switch (vote) {
      case 'Yea':
        return 'green';
      case 'Nay':
        return 'red';
      case 'Present':
        return 'yellow';
      case 'Not Voting':
        return 'grey';
      default:
        return 'grey';
    }
  };

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
      {/* Title */}
      <Typography variant="h4" gutterBottom>
        {bill.title}
      </Typography>

      {/* Summary */}
      <Typography variant="body1" gutterBottom>
        {bill.summary}
      </Typography>

      {/* Placeholder for AI Chatbox */}
      <Box mt={4}>
        <Typography variant="h6">Learn More About This Bill</Typography>
        <Box mt={2} p={2} border={1} borderColor="grey.300" borderRadius={4}>
          {/* Future AI chat functionality will be implemented here */}
          <Typography variant="body2" color="textSecondary">
            AI Chatbox placeholder – Coming soon!
          </Typography>
        </Box>
      </Box>

      {/* Representatives Section */}
      <Box mt={4}>
        <Typography variant="h6">Your Representatives' Votes</Typography>
        {!address ? (
          <Box mt={2}>
            <Typography variant="body1">
              Enter your address to see how your representatives voted:
            </Typography>
            <AddressInput />
          </Box>
        ) : representatives.length === 0 ? (
          <Typography variant="body1" mt={2}>
            No voting records available.
          </Typography>
        ) : (
          <Grid container spacing={2} mt={2}>
            {representatives.map((rep: any) => (
              <Grid item xs={6} sm={4} md={3} key={rep.name}>
                <Tooltip title={rep.name}>
                  <a href={rep.link} target="_blank" rel="noopener noreferrer">
                    <Avatar
                      alt={`${rep.name} - Voted ${rep.vote}`}
                      src={rep.imageUrl}
                      sx={{
                        width: 100,
                        height: 100,
                        margin: 'auto',
                        border: `4px solid ${getVoteBorderColor(rep.vote)}`,
                      }}
                    />
                  </a>
                </Tooltip>
              </Grid>
            ))}
          </Grid>
        )}
      </Box>

      {/* Voting Section */}
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

        {/* Visual Representation of Votes */}
        <Box mt={4}>
          <Grid container spacing={4}>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle1">Public Votes</Typography>
              {/* Placeholder for public vote visualization */}
              <Box
                mt={2}
                p={2}
                border={1}
                borderColor="grey.300"
                borderRadius={4}
              >
                <Typography variant="body2" color="textSecondary">
                  Public vote visualization placeholder
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle1">Congressional Votes</Typography>
              {/* Placeholder for congressional vote visualization */}
              <Box
                mt={2}
                p={2}
                border={1}
                borderColor="grey.300"
                borderRadius={4}
              >
                <Typography variant="body2" color="textSecondary">
                  Congressional vote visualization placeholder
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </Box>
      </Box>

      {/* Comments Section */}
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
