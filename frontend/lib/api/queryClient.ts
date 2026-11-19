import { QueryClient } from '@tanstack/react-query';

/**
 * Konfigurasi tunggal TanStack Query.
 * Query tidak diulang untuk galat 4xx supaya pesan validasi tidak "hilang"
 * karena retry, dan staleTime 30 detik menghindari refetch beruntun.
 */
function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        retry: (failureCount, error) => {
          const status = (error as { status?: number } | null)?.status ?? 0;
          if (status >= 400 && status < 500) return false;
          return failureCount < 2;
        },
      },
      mutations: { retry: 0 },
    },
  });
}

let browserQueryClient: QueryClient | undefined;

/**
 * Di server selalu buat client baru (tidak boleh lintas request);
 * di browser simpan satu instance agar cache tidak hilang saat render ulang.
 */
export function getQueryClient() {
  if (typeof window === 'undefined') return makeQueryClient();
  browserQueryClient ??= makeQueryClient();
  return browserQueryClient;
}
