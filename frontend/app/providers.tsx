'use client';

import { QueryClientProvider } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';
import { getQueryClient } from '@/lib/api/queryClient';

/**
 * Provider client global. Dipasang sekali di root layout (RSC) supaya cache
 * TanStack Query tidak dibuat ulang tiap navigasi.
 */
export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(getQueryClient);
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
