import React, { useContext } from 'react';
import { Container, Button } from '@mui/material';
import AddressAutocomplete from './AddressAutocomplete';
import { UserContext } from '../context/UserContext';

const AddressInput: React.FC = () => {
  const { setUserAddress } = useContext(UserContext);

  const handleSelectAddress = (address: string) => {
    setUserAddress(address);
  };

  return (
    <Container>
      <AddressAutocomplete onSelectAddress={handleSelectAddress} />
    </Container>
  );
};

export default AddressInput;
