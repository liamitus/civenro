"use client";

import { useCallback, useSyncExternalStore } from "react";

const STORAGE_KEY = "govroll_address";
const CHANGE_EVENT = "govroll_address_change";

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(CHANGE_EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(CHANGE_EVENT, callback);
  };
}

function getSnapshot(): string {
  return localStorage.getItem(STORAGE_KEY) ?? "";
}

function getServerSnapshot(): string {
  return "";
}

function getLoadedSnapshot(): boolean {
  return true;
}

function getLoadedServerSnapshot(): boolean {
  return false;
}

export function useAddress() {
  const address = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );
  const isLoaded = useSyncExternalStore(
    subscribe,
    getLoadedSnapshot,
    getLoadedServerSnapshot,
  );

  const setUserAddress = useCallback((newAddress: string) => {
    if (newAddress) {
      localStorage.setItem(STORAGE_KEY, newAddress);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }, []);

  return { address, setUserAddress, isLoaded };
}
