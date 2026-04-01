"use client";

import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "civenro_address";

export function useAddress() {
  const [address, setAddress] = useState<string>("");
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) setAddress(stored);
    setIsLoaded(true);
  }, []);

  const setUserAddress = useCallback((newAddress: string) => {
    setAddress(newAddress);
    if (newAddress) {
      localStorage.setItem(STORAGE_KEY, newAddress);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  return { address, setUserAddress, isLoaded };
}
