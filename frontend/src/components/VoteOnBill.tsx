import React from 'react';
import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Typography,
  Box,
  Button,
  ButtonGroup,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

interface VoteOnBillProps {
  expanded: boolean;
  onChange: (event: React.SyntheticEvent, isExpanded: boolean) => void;
  handleVote: (voteType: 'For' | 'Against' | 'Abstain') => void;
  selectedVote: 'For' | 'Against' | 'Abstain' | null;
  publicVotes: { voteType: string; count: number }[];
  congressionalVotes: { vote: string; count: number }[];
}

const VoteOnBill: React.FC<VoteOnBillProps> = ({
  expanded,
  onChange,
  handleVote,
  selectedVote,
  publicVotes,
  congressionalVotes,
}) => {
  // Process public votes
  const totalPublicVotes =
    publicVotes.reduce((sum, vote) => sum + vote.count, 0) || 1;
  const publicForCount =
    publicVotes.find((vote) => vote.voteType === 'For')?.count || 0;
  const publicAgainstCount =
    publicVotes.find((vote) => vote.voteType === 'Against')?.count || 0;
  const publicAbstainCount =
    publicVotes.find((vote) => vote.voteType === 'Abstain')?.count || 0;

  // Process congressional votes
  const totalCongressVotes =
    congressionalVotes.reduce((sum, vote) => sum + vote.count, 0) || 1;
  const congressYeaCount =
    congressionalVotes.find((vote) => vote.vote === 'Yea')?.count || 0;
  const congressNayCount =
    congressionalVotes.find((vote) => vote.vote === 'Nay')?.count || 0;
  const congressPresentCount =
    congressionalVotes.find((vote) => vote.vote === 'Present')?.count || 0;
  const congressNotVotingCount =
    congressionalVotes.find((vote) => vote.vote === 'Not Voting')?.count || 0;

  return (
    <Accordion expanded={expanded} onChange={onChange}>
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

        {/* Public Votes Visualization */}
        <Box mt={4}>
          <Typography variant="h6" align="center">
            Public Votes
          </Typography>
          <Box display="flex" justifyContent="space-around" mt={2}>
            <Box textAlign="center">
              <Typography variant="h4" color="green">
                {publicForCount}
              </Typography>
              <Typography variant="body1">For</Typography>
            </Box>
            <Box textAlign="center">
              <Typography variant="h4" color="red">
                {publicAgainstCount}
              </Typography>
              <Typography variant="body1">Against</Typography>
            </Box>
            <Box textAlign="center">
              <Typography variant="h4" color="gray">
                {publicAbstainCount}
              </Typography>
              <Typography variant="body1">Abstain</Typography>
            </Box>
          </Box>
        </Box>

        {/* Congressional Votes Visualization */}
        <Box mt={4}>
          <Typography variant="h6" align="center">
            Congressional Votes
          </Typography>
          <Box
            mt={2}
            position="relative"
            height={20}
            bgcolor="#e0e0e0"
            borderRadius={10}
          >
            {/* Yea Votes */}
            <Box
              position="absolute"
              left={0}
              height="100%"
              bgcolor="green"
              width={`${(congressYeaCount / totalCongressVotes) * 100}%`}
              borderRadius={
                congressYeaCount / totalCongressVotes === 1
                  ? '10px'
                  : '10px 0 0 10px'
              }
            />
            {/* Nay Votes */}
            <Box
              position="absolute"
              left={`${(congressYeaCount / totalCongressVotes) * 100}%`}
              height="100%"
              bgcolor="red"
              width={`${(congressNayCount / totalCongressVotes) * 100}%`}
            />
            {/* Present Votes */}
            <Box
              position="absolute"
              left={`${
                ((congressYeaCount + congressNayCount) / totalCongressVotes) *
                100
              }%`}
              height="100%"
              bgcolor="gray"
              width={`${(congressPresentCount / totalCongressVotes) * 100}%`}
            />
            {/* Not Voting */}
            <Box
              position="absolute"
              left={`${
                ((congressYeaCount + congressNayCount + congressPresentCount) /
                  totalCongressVotes) *
                100
              }%`}
              height="100%"
              bgcolor="#bdbdbd"
              width={`${(congressNotVotingCount / totalCongressVotes) * 100}%`}
              borderRadius={
                congressNotVotingCount / totalCongressVotes === 1
                  ? '10px'
                  : '0 10px 10px 0'
              }
            />
          </Box>
          <Box display="flex" justifyContent="space-between" mt={1}>
            <Typography variant="body2" color="green">
              Yea: {congressYeaCount}
            </Typography>
            <Typography variant="body2" color="red">
              Nay: {congressNayCount}
            </Typography>
            <Typography variant="body2" color="gray">
              Present: {congressPresentCount}
            </Typography>
            <Typography variant="body2" color="#757575">
              Not Voting: {congressNotVotingCount}
            </Typography>
          </Box>
        </Box>
      </AccordionDetails>
    </Accordion>
  );
};

export default VoteOnBill;
