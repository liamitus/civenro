import React, { createContext, useState } from 'react';

interface UserContextProps {
  address: string;
  setUserAddress: (address: string) => void;
}

export const UserContext = createContext<UserContextProps>({
  address: '',
  setUserAddress: () => {},
});

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [address, setAddress] = useState('');

  const setUserAddress = (newAddress: string) => {
    setAddress(newAddress);
    // Optionally, persist the address or send it to the backend
  };

  return (
    <UserContext.Provider value={{ address, setUserAddress }}>
      {children}
    </UserContext.Provider>
  );
};
