
'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useMemo } from 'react';

const TECHNICAL_MODE_STORAGE_KEY = 'ferretrack-technical-mode-active';
const MAX_COMMANDS = 50; // Limitar el número de comandos en la lista

type TechnicalModeContextType = {
  isTechnicalModeActive: boolean;
  toggleTechnicalMode: () => void;
  mongoCommands: string[];
  addMongoCommand: (command: string) => void;
  clearMongoCommands: () => void;
};

const TechnicalModeContext = createContext<TechnicalModeContextType | undefined>(undefined);

export function TechnicalModeProvider({ children }: { children: ReactNode }) {
  const [isTechnicalModeActive, setIsTechnicalModeActive] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      try {
        const storedValue = localStorage.getItem(TECHNICAL_MODE_STORAGE_KEY);
        return storedValue ? JSON.parse(storedValue) : false;
      } catch (error) {
        console.error("Error al leer el estado del modo técnico de localStorage", error);
        return false;
      }
    }
    return false;
  });

  const [mongoCommands, setMongoCommands] = useState<string[]>([]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(TECHNICAL_MODE_STORAGE_KEY, JSON.stringify(isTechnicalModeActive));
      } catch (error) {
        console.error("Error al guardar el estado del modo técnico en localStorage", error);
      }
    }
    if (!isTechnicalModeActive) {
      // Clear commands when mode is deactivated
      // setMongoCommands([]); // Option: clear immediately, or let them persist until explicitly cleared
    }
  }, [isTechnicalModeActive]);

  const toggleTechnicalMode = useCallback(() => {
    setIsTechnicalModeActive(prev => !prev);
  }, []);

  const addMongoCommand = useCallback((command: string) => {
    const timestamp = new Date().toLocaleTimeString('es-ES', { hour12: false });
    const commandWithTimestamp = `[${timestamp}] ${command}`;
    setMongoCommands(prevCommands => {
      const newCommands = [commandWithTimestamp, ...prevCommands];
      if (newCommands.length > MAX_COMMANDS) {
        return newCommands.slice(0, MAX_COMMANDS);
      }
      return newCommands;
    });
  }, []);

  const clearMongoCommands = useCallback(() => {
    setMongoCommands([]);
  }, []);

  const contextValue = useMemo(() => ({
    isTechnicalModeActive,
    toggleTechnicalMode,
    mongoCommands,
    addMongoCommand,
    clearMongoCommands,
  }), [isTechnicalModeActive, toggleTechnicalMode, mongoCommands, addMongoCommand, clearMongoCommands]);

  return (
    <TechnicalModeContext.Provider value={contextValue}>
      {children}
    </TechnicalModeContext.Provider>
  );
}

export function useTechnicalMode() {
  const context = useContext(TechnicalModeContext);
  if (context === undefined) {
    throw new Error('useTechnicalMode debe usarse dentro de un TechnicalModeProvider');
  }
  return context;
}
