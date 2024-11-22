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
}

const VoteOnBill: React.FC<VoteOnBillProps> = ({
  expanded,
  onChange,
  handleVote,
  selectedVote,
}) => (
  <Accordion expanded={expanded} onChange={onChange}>
    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
      <Typography variant="subtitle1">Vote on this Bill</Typography>
    </AccordionSummary>
    <AccordionDetails>
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
      <Box mt={2}>
        <Typography variant="body2" align="center">
          Public Votes
        </Typography>
        <Box mt={1}>
          <Typography variant="body2" color="textSecondary">
            Vote visualization placeholder
          </Typography>
        </Box>
      </Box>
    </AccordionDetails>
  </Accordion>
);

export default VoteOnBill;
