// src/pages/BillDetailPage.tsx

import React, { useContext, useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { getBillById } from '../services/billService';
import { getVotes, submitVote } from '../services/voteService';
import { getComments, submitComment } from '../services/commentService';
import { Container, Typography } from '@mui/material';
import { AuthContext } from '../context/AuthContext';
import { ModalContext } from '../context/ModalContext';
import { UserContext } from '../context/UserContext';
import { getRepresentativesByAddress } from '../services/representativeService';
import BillSummary from '../components/BillSummary';
import AIChatboxPlaceholder from '../components/AIChatboxPlaceholder';
import RepresentativesVotes from '../components/RepresentativesVotes';
import VoteOnBill from '../components/VoteOnBill';
import CommentsSection from '../components/CommentsSection';
import InfiniteScroll from 'react-infinite-scroll-component';
import Comment from '../components/Comment';

interface Bill {
  id: number;
  billId: string;
  title: string;
  summary: string;
  date: string;
  billType: string;
  currentChamber: string;
  currentStatus: string;
  currentStatusDate: string;
  introducedDate: string;
  link: string;
}

interface PublicVote {
  voteType: string;
  count: number;
}

interface CongressionalVote {
  vote: string;
  count: number;
}

interface CommentData {
  id: number;
  content: string;
  userId: number | null;
  username: string;
  date: string;
  voteCount: number;
  parentCommentId?: number;
  replies?: any;
}

const BillDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user, loading: authLoading } = useContext(AuthContext);
  const [bill, setBill] = useState<Bill | null>(null);
  const [votes, setVotes] = useState<{
    publicVotes: PublicVote[];
    congressionalVotes: CongressionalVote[];
  }>({
    publicVotes: [],
    congressionalVotes: [],
  });
  const [comments, setComments] = useState<CommentData[]>([]);
  const [commentsPage, setCommentsPage] = useState(1);
  const [commentsHasMore, setCommentsHasMore] = useState(true);
  const COMMENTS_LIMIT = 20;
  const [selectedVote, setSelectedVote] = useState<
    'For' | 'Against' | 'Abstain' | null
  >(null);
  const [commentContent, setCommentContent] = useState('');
  const [loading, setLoading] = useState<boolean>(true);
  const { showModal } = useContext(ModalContext);
  const { address } = useContext(UserContext);
  const [representatives, setRepresentatives] = useState([]);
  const [billChambers, setBillChambers] = useState<string[]>([]);

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
    if (authLoading) return; // Wait until auth data is loaded
    const fetchData = async () => {
      if (id) {
        try {
          const billData = await getBillById(parseInt(id));
          setBill(billData || null);

          const votesData = await getVotes(parseInt(id));
          setVotes({
            publicVotes: votesData.publicVotes || [],
            congressionalVotes: votesData.congressionalVotes || [],
          });

          const commentsData = await getComments(parseInt(id));
          setComments(commentsData.comments || []);
        } catch (error) {
          console.error('Error fetching bill details:', error);
          setBill(null);
        }
      }
      setLoading(false);
    };
    fetchData();
  }, [id, authLoading]);

  // Wrap fetchRepresentatives in useCallback
  const fetchRepresentatives = useCallback(
    async (currentAddress: string) => {
      if (user && currentAddress && bill && bill.id) {
        try {
          const data = await getRepresentativesByAddress(
            currentAddress,
            bill.id
          );
          setRepresentatives(data);
        } catch (error) {
          console.error('Error fetching representatives:', error);
        }
      }
    },
    [user, bill]
  );

  useEffect(() => {
    fetchRepresentatives(address);
  }, [user, address, bill?.id, fetchRepresentatives]);

  useEffect(() => {
    if (bill) {
      const chambers: string[] = [];
      const billTypeLower = bill.billType.toLowerCase();
      if (billTypeLower.startsWith('hr') || billTypeLower.startsWith('hres')) {
        chambers.push('House');
      }
      if (billTypeLower.startsWith('s') || billTypeLower.startsWith('sres')) {
        chambers.push('Senate');
      }
      if (bill.currentChamber.toLowerCase() === 'both') {
        chambers.push('House', 'Senate');
      }
      setBillChambers(Array.from(new Set(chambers)));
    }
  }, [bill]);

  const handleVote = async (voteType: 'For' | 'Against' | 'Abstain') => {
    if (!user) {
      showModal('auth', () => handleVote(voteType));
      return;
    }
    if (!bill) return;

    try {
      await submitVote(bill.id, voteType);
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
      await submitComment(bill.id, commentContent, user.id);
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

  const fetchComments = useCallback(async () => {
    if (!bill) return;
    try {
      const data = await getComments(
        bill.id,
        commentsPage,
        COMMENTS_LIMIT,
        'best'
      );
      setComments((prevComments) => {
        const allComments = [...prevComments, ...(data.comments || [])];
        setCommentsHasMore(allComments.length < data.total);
        return allComments;
      });
      setCommentsPage((prevPage) => prevPage + 1);
    } catch (error) {
      console.error('Error fetching comments:', error);
    }
  }, [bill, COMMENTS_LIMIT]);

  useEffect(() => {
    // Reset comments when bill changes
    setComments([]);
    setCommentsPage(1);
    setCommentsHasMore(true);
    fetchComments();
  }, [bill, fetchComments]);

  const publicVotes = votes.publicVotes;
  const congressionalVotes = votes.congressionalVotes;

  const onAddressChange = (newAddress: string) => {
    fetchRepresentatives(newAddress);
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
        <Typography variant="h5">
          Bill not found or an error occurred.
        </Typography>
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
        billChambers={billChambers}
        onAddressChange={onAddressChange}
      />

      {/* Voting Section */}
      <VoteOnBill
        expanded={accordionState.voteOnThisBill}
        onChange={handleAccordionChange('voteOnThisBill')}
        handleVote={handleVote}
        selectedVote={selectedVote}
        publicVotes={publicVotes}
        congressionalVotes={congressionalVotes}
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
        >
          <InfiniteScroll
            dataLength={comments.length}
            next={fetchComments}
            hasMore={commentsHasMore}
            loader={<h4>Loading more comments...</h4>}
            endMessage={
              comments.length === 0 ? (
                <p>Be the first to comment!</p>
              ) : (
                <p>No more comments to display.</p>
              )
            }
          >
            {comments.map((comment) => (
              <Comment
                key={comment.id}
                comment={comment}
                billId={bill.id}
                refreshComments={refreshComments}
              />
            ))}
          </InfiniteScroll>
        </CommentsSection>
      )}
    </Container>
  );
};

export default BillDetailPage;
