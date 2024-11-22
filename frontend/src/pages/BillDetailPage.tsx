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
  useTheme,
  useMediaQuery,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { AuthContext } from '../context/AuthContext';
import { ModalContext } from '../context/ModalContext';
import { UserContext } from '../context/UserContext';
import { getRepresentativesByAddress } from '../services/representativeService';
import AddressInput from '../components/AddressInput';
import BillSummary from '../components/BillSummary';
import AIChatboxPlaceholder from '../components/AIChatboxPlaceholder';
import RepresentativesVotes from '../components/RepresentativesVotes';
import VoteOnBill from '../components/VoteOnBill';
import CommentsSection from '../components/CommentsSection';

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

  // Theme and media query for responsive avatar sizes
  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down('sm'));

  // State for accordion expanded/collapsed status
  const [accordionState, setAccordionState] = useState<{
    aiChatbox: boolean;
    representativesVotes: boolean;
    voteOnThisBill: boolean;
    comments: boolean;
  }>({
    aiChatbox: JSON.parse(
      localStorage.getItem('accordion_aiChatbox') || 'false'
    ),
    representativesVotes: JSON.parse(
      localStorage.getItem('accordion_representativesVotes') || 'false'
    ),
    voteOnThisBill: JSON.parse(
      localStorage.getItem('accordion_voteOnThisBill') || 'false'
    ),
    comments: JSON.parse(localStorage.getItem('accordion_comments') || 'true'),
  });

  // Handle accordion state changes and persist to localStorage
  const handleAccordionChange =
    (panel: string) => (_event: React.SyntheticEvent, isExpanded: boolean) => {
      setAccordionState((prevState) => {
        const newState = { ...prevState, [panel]: isExpanded };
        localStorage.setItem(`accordion_${panel}`, JSON.stringify(isExpanded));
        return newState;
      });
    };

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

  // Adjust avatar styles for responsive size and gap
  const getAvatarStyles = (vote: string) => {
    const borderColor = getVoteBorderColor(vote);
    return {
      width: isSmallScreen ? 60 : 80,
      height: isSmallScreen ? 60 : 80,
      margin: 'auto',
      padding: '2px', // Add padding for gap
      border: `2px solid ${borderColor}`,
      boxSizing: 'content-box' as const,
    };
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
      {/* Bill Summary */}
      {bill && <BillSummary bill={bill} />}

      {/* AI Chatbox Placeholder */}
      <AIChatboxPlaceholder
        expanded={accordionState.aiChatbox}
        onChange={handleAccordionChange('aiChatbox')}
      />

      {/* Representatives' Votes */}
      <RepresentativesVotes
        expanded={accordionState.representativesVotes}
        onChange={handleAccordionChange('representativesVotes')}
        address={address}
        representatives={representatives}
        getVoteBorderColor={getVoteBorderColor}
      />

      {/* Voting Section */}
      <VoteOnBill
        expanded={accordionState.voteOnThisBill}
        onChange={handleAccordionChange('voteOnThisBill')}
        handleVote={handleVote}
        selectedVote={selectedVote}
      />

      {/* Comments Section */}
      {bill && (
        <CommentsSection
          expanded={accordionState.comments}
          onChange={handleAccordionChange('comments')}
          comments={comments}
          commentContent={commentContent}
          setCommentContent={setCommentContent}
          handleCommentSubmit={handleCommentSubmit}
          refreshComments={refreshComments}
          billId={bill.id}
        />
      )}
    </Container>
  );
};

export default BillDetailPage;
