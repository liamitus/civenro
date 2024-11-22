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
  Accordion,
  AccordionSummary,
  AccordionDetails,
  IconButton,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
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
      <Typography variant="h5" gutterBottom>
        {bill.title}
      </Typography>

      {/* Summary */}
      <Typography variant="body2" gutterBottom>
        {bill.summary}
      </Typography>

      {/* Condensed Sections using Accordions */}
      {/* AI Chatbox Placeholder */}
      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="subtitle1">
            Learn More About This Bill
          </Typography>
        </AccordionSummary>
        <AccordionDetails>
          {/* Future AI chat functionality will be implemented here */}
          <Typography variant="body2" color="textSecondary">
            AI Chatbox placeholder – Coming soon!
          </Typography>
        </AccordionDetails>
      </Accordion>

      {/* Representatives' Votes */}
      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="subtitle1">
            Your Representatives' Votes
          </Typography>
        </AccordionSummary>
        <AccordionDetails>
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
            <Grid container spacing={1} mt={1}>
              {representatives.map((rep: any) => (
                <Grid item xs={4} key={rep.name}>
                  <Tooltip title={`${rep.name} - Voted ${rep.vote}`}>
                    {rep.link ? (
                      <a
                        href={rep.link}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Avatar
                          alt={`${rep.name} - Voted ${rep.vote}`}
                          src={rep.imageUrl || undefined}
                          sx={{
                            width: 60,
                            height: 60,
                            margin: 'auto',
                            border: `2px solid ${getVoteBorderColor(rep.vote)}`,
                          }}
                        />
                      </a>
                    ) : (
                      <Avatar
                        alt={`${rep.name} - Voted ${rep.vote}`}
                        src={rep.imageUrl || undefined}
                        sx={{
                          width: 60,
                          height: 60,
                          margin: 'auto',
                          border: `2px solid ${getVoteBorderColor(rep.vote)}`,
                        }}
                      />
                    )}
                  </Tooltip>
                </Grid>
              ))}
            </Grid>
          )}
        </AccordionDetails>
      </Accordion>

      {/* Voting Section */}
      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="subtitle1">Vote on this Bill</Typography>
        </AccordionSummary>
        <AccordionDetails>
          {/* Voting Buttons */}
          <ButtonGroup variant="contained" color="primary" fullWidth>
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

          {/* Condensed Vote Representation */}
          <Box mt={2}>
            {/* Replace vote counts with a compact chart */}
            <Typography variant="body2" align="center">
              Public Votes
            </Typography>
            {/* Placeholder for a compact chart or progress bar */}
            <Box mt={1}>
              {/* Implement a simple progress bar or chart here */}
              <Typography variant="body2" color="textSecondary">
                Vote visualization placeholder
              </Typography>
            </Box>
          </Box>
        </AccordionDetails>
      </Accordion>

      {/* Comments Section */}
      <Accordion defaultExpanded>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="subtitle1">Comments</Typography>
        </AccordionSummary>
        <AccordionDetails>
          {/* Comment Form */}
          <form onSubmit={handleCommentSubmit}>
            <TextField
              label="Add a comment"
              variant="outlined"
              fullWidth
              multiline
              rows={3}
              value={commentContent}
              onChange={(e) => setCommentContent(e.target.value)}
              sx={{ mt: 1 }}
            />
            <Button
              type="submit"
              variant="contained"
              color="primary"
              fullWidth
              sx={{ mt: 1 }}
            >
              Submit Comment
            </Button>
          </form>

          {/* Comment List */}
          <List sx={{ mt: 2 }}>
            {comments.map((comment) => (
              <Comment
                key={comment.id}
                comment={comment}
                billId={bill.id}
                refreshComments={refreshComments}
              />
            ))}
          </List>
        </AccordionDetails>
      </Accordion>
    </Container>
  );
};

export default BillDetailPage;
