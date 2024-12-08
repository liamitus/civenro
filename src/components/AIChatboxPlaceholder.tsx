import React from 'react';
import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Typography,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

interface AIChatboxProps {
  expanded: boolean;
  onChange: (event: React.SyntheticEvent, isExpanded: boolean) => void;
}

const AIChatboxPlaceholder: React.FC<AIChatboxProps> = ({
  expanded,
  onChange,
}) => (
  <Accordion expanded={expanded} onChange={onChange}>
    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
      <Typography variant="subtitle1">Learn More About This Bill</Typography>
    </AccordionSummary>
    <AccordionDetails>
      <Typography variant="body2" color="textSecondary">
        AI Chat – Coming soon!
      </Typography>
    </AccordionDetails>
  </Accordion>
);

export default AIChatboxPlaceholder;
