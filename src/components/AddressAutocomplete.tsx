// frontend/src/components/AddressAutocomplete.tsx

import { Box, Button, TextField } from '@mui/material';
import { useContext, useState } from 'react';
import { UserContext } from '../context/UserContext';

const AddressInput: React.FC = () => {
  const { setUserAddress } = useContext(UserContext);
  const [address, setAddress] = useState('');

  const handleSubmit = () => {
    if (address.trim()) {
      setUserAddress(address.trim());
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
        onClick={handleSubmit}
        sx={{ mt: 2 }}
      >
        Submit Address
      </Button>
    </Box>
  );
};

export default AddressInput;
