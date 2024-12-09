// src/components/AddressAutocomplete.tsx

import { Box, Button, TextField } from '@mui/material';
import { useContext, useState } from 'react';
import { UserContext } from '../context/UserContext';

interface AddressAutocompleteProps {
  onAddressSelect: (address: string) => void;
}

const AddressAutocomplete: React.FC<AddressAutocompleteProps> = ({
  onAddressSelect,
}) => {
  const { setUserAddress } = useContext(UserContext);
  const [address, setAddress] = useState('');

  const handleAddressSelect = (address: string) => {
    if (address.trim()) {
      setUserAddress(address.trim());
      onAddressSelect(address.trim());
    }
  };

  return (
    <Box mt={2}>
      <TextField
        label="Enter your address"
        variant="outlined"
        fullWidth
        value={address}
        onChange={(e) => setAddress(e.target.value)}
      />
      <Button
        variant="contained"
        color="primary"
        onClick={() => handleAddressSelect(address)}
        sx={{ mt: 2 }}
      >
        Submit Address
      </Button>
    </Box>
  );
};

export default AddressAutocomplete;
