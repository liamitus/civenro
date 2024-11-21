// frontend/src/components/AddressInput.tsx

import React, { useContext } from 'react';
import { Box } from '@mui/material';
import AddressAutocomplete from './AddressAutocomplete';
import { UserContext } from '../context/UserContext';

const AddressInput: React.FC = () => {
  const { setUserAddress } = useContext(UserContext);

  return (
    <Box mt={2}>
      <AddressAutocomplete />
    </Box>
  );
};

export default AddressInput;
