"use client";

import { createContext, useContext, useState, ReactNode, useCallback, useRef, useEffect } from "react";

interface NumpadConfig {
  value: string;
  onChange: (val: string) => void;
  onCommit: () => void;
  id?: string;
}

interface NumpadContextType {
  isOpen: boolean;
  config: NumpadConfig | null;
  openNumpad: (config: NumpadConfig) => void;
  closeNumpad: () => void;
  updateValue: (updater: (prev: string) => string) => void;
}

const NumpadContext = createContext<NumpadContextType | null>(null);

export function NumpadProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [config, setConfig] = useState<NumpadConfig | null>(null);
  
  // We use a ref to track the latest onChange and onCommit safely
  const configRef = useRef<NumpadConfig | null>(null);

  const openNumpad = useCallback((newConfig: NumpadConfig) => {
    configRef.current = newConfig;
    setConfig(newConfig);
    setIsOpen(true);
  }, []);

  const closeNumpad = useCallback(() => {
    setIsOpen(false);
    if (configRef.current) {
      configRef.current.onCommit();
    }
  }, []);

  const updateValue = useCallback((updater: (prev: string) => string) => {
    if (configRef.current) {
      const newVal = updater(configRef.current.value);
      const updatedConfig = { ...configRef.current, value: newVal };
      configRef.current = updatedConfig;
      setConfig(updatedConfig);
      updatedConfig.onChange(newVal);
    }
  }, []);

  // Update effect to close numpad if user clicks outside context, but maybe handle locally.
  return (
    <NumpadContext.Provider value={{ isOpen, config, openNumpad, closeNumpad, updateValue }}>
      {children}
    </NumpadContext.Provider>
  );
}

export function useNumpad() {
  return useContext(NumpadContext);
}
