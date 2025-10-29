'use client';

import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient();

export function Provider({ children }: { children: React.ReactNode }) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
