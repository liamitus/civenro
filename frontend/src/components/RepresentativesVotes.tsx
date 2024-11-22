import React from 'react';
import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Typography,
  Box,
  Grid,
  Tooltip,
  Avatar,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import AddressInput from './AddressInput';

interface Representative {
  name: string;
  vote: string;
  imageUrl: string | null;
  link: string | null;
}

interface RepresentativesVotesProps {
  expanded: boolean;
  onChange: (event: React.SyntheticEvent, isExpanded: boolean) => void;
  address: string | null;
  representatives: Representative[];
  getVoteBorderColor: (vote: string) => string;
}

const RepresentativesVotes: React.FC<RepresentativesVotesProps> = ({
  expanded,
  onChange,
  address,
  representatives,
  getVoteBorderColor,
}) => {
  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down('sm'));

  const getAvatarStyles = (vote: string) => {
    const hasVote =
      vote !== 'No vote recorded' &&
      vote !== 'Representative not found in database';
    const borderColor = hasVote ? getVoteBorderColor(vote) : 'transparent';
    return {
      width: isSmallScreen ? 60 : 100,
      height: isSmallScreen ? 60 : 100,
      margin: 'auto',
      border: `4px solid ${borderColor}`,
      boxSizing: 'content-box' as const,
      borderRadius: '50%',
      objectFit: 'cover', // Ensure the image covers the avatar
    };
  };

  return (
    <Accordion expanded={expanded} onChange={onChange}>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Typography variant="subtitle1">Your Representatives' Votes</Typography>
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
            {representatives.map((rep: any) => {
              const hasRecordedVote =
                rep.vote !== 'No vote recorded' &&
                rep.vote !== 'Representative not found in database';
              const tooltipText = hasRecordedVote
                ? `${rep.name} - Voted ${rep.vote}`
                : `${rep.name} - ${rep.vote}`;
              return (
                <Grid item xs={4} key={rep.name}>
                  <Tooltip title={tooltipText}>
                    {rep.link ? (
                      <a
                        href={rep.link}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Avatar
                          alt={tooltipText}
                          src={rep.imageUrl || undefined}
                          sx={getAvatarStyles(rep.vote)}
                        />
                      </a>
                    ) : (
                      <Avatar
                        alt={tooltipText}
                        src={rep.imageUrl || undefined}
                        sx={getAvatarStyles(rep.vote)}
                      />
                    )}
                  </Tooltip>
                </Grid>
              );
            })}
          </Grid>
        )}
      </AccordionDetails>
    </Accordion>
  );
};

export default RepresentativesVotes;
