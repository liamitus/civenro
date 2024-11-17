import React, { useState, useRef, useEffect } from 'react';
import { Autocomplete } from '@react-google-maps/api';
import { TextField } from '@mui/material';

interface AddressAutocompleteProps {
  onSelectAddress: (address: string) => void;
}

const AddressAutocomplete: React.FC<AddressAutocompleteProps> = ({
  onSelectAddress,
}) => {
  const [address, setAddress] = useState('');
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleLoad = (autocomplete: google.maps.places.Autocomplete) => {
    autocompleteRef.current = autocomplete;
  };

  const handlePlaceChanged = () => {
    if (autocompleteRef.current) {
      const place = autocompleteRef.current.getPlace();
      if (place.formatted_address) {
        setAddress(place.formatted_address);
        onSelectAddress(place.formatted_address);
      }
    }
  };

  return (
    <Autocomplete onLoad={handleLoad} onPlaceChanged={handlePlaceChanged}>
      <TextField
        inputRef={inputRef}
        label="Enter your address"
        variant="outlined"
        fullWidth
        value={address}
        onChange={(e) => setAddress(e.target.value)}
      />
    </Autocomplete>
  );
};

export default AddressAutocomplete;
