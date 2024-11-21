// frontend/src/context/UserContext.tsx

import React, { createContext, useState, useEffect } from 'react';

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
  const [address, setAddress] = useState(() => {
    return localStorage.getItem('userAddress') || '';
  });

  const setUserAddress = (newAddress: string) => {
    setAddress(newAddress);
    localStorage.setItem('userAddress', newAddress);
    // Optionally, send it to the backend if needed
  };

  return (
    <UserContext.Provider value={{ address, setUserAddress }}>
      {children}
    </UserContext.Provider>
  );
};
