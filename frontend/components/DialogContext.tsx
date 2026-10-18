'use client';
import { createContext, useContext } from 'react';

export const DialogCloseContext = createContext<(() => void) | null>(null);
export const useDialogClose = () => useContext(DialogCloseContext);
