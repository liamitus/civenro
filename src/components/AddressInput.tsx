// frontend/src/components/AddressInput.tsx

import React from 'react';
import { Box } from '@mui/material';
import AddressAutocomplete from './AddressAutocomplete';

interface AddressInputProps {
  onAddressSubmit: (address: string) => void;
}

const AddressInput: React.FC<AddressInputProps> = ({ onAddressSubmit }) => {
  return (
    <Box mt={2}>
      <AddressAutocomplete
        onAddressSelect={(selectedAddress: string) => {
          onAddressSubmit(selectedAddress);
        }}
      />
    </Box>
  );
};

export default AddressInput;
