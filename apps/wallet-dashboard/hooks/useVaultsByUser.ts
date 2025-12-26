// Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { useSupabase } from '@/providers/SupabaseProvider';
import { Database } from '@/supabase/database.types';
import { isValidIotaAddress } from '@iota/iota-sdk/utils';
import { SupabaseClient } from '@supabase/supabase-js';
import { skipToken, useQuery, useQueryClient } from '@tanstack/react-query';

const STALE_TIME = 10 * 60 * 1000;

const vaultsByUser = async (
    address: string,
    supabase: SupabaseClient | null,
): Promise<Database['public']['Tables']['vaults']['Row'][] | null> => {
    if (!supabase) throw new Error('Supabase client not available.');

    const x = await supabase
        .from('vaults')
        .select('*')
        .contains('owners', JSON.stringify([{ address }]));
    if (x?.error !== null) {
        throw new Error('Could not fetch public key for address.');
    }
    if (!x?.data) return null;
    return x.data as Database['public']['Tables']['vaults']['Row'][];
};

export function useFetchtVaultsByUser() {
    const queryClient = useQueryClient();
    const { client } = useSupabase();

    return (userAddress?: string) =>
        queryClient.fetchQuery({
            queryKey: ['vault', 'get-vaults-by-user', userAddress],
            queryFn:
                userAddress && isValidIotaAddress(userAddress)
                    ? () => vaultsByUser(userAddress, client())
                    : skipToken,
            meta: { persist: true },
            // If no data present, refetch immediately.
            // If public key is present, stale it for 10 minutes.
            staleTime: ({ state: { data } }) => (data === null ? 0 : STALE_TIME),
        });
}

export function useVaultsByUser(userAddress?: string) {
    const { client } = useSupabase();

    return useQuery({
        queryKey: ['vault', 'get-vaults-by-user', userAddress],
        queryFn:
            userAddress && isValidIotaAddress(userAddress)
                ? () => vaultsByUser(userAddress, client())
                : skipToken,
        meta: { persist: true },
        // If no data present, refetch immediately.
        // If vaults are present, stale it for 10 minutes.
        staleTime: ({ state: { data } }) => (data === null ? 0 : STALE_TIME),
        enabled: !!userAddress && isValidIotaAddress(userAddress),
    });
}
