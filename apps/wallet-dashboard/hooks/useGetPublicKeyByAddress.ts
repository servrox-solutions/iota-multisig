// Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { useSupabase } from '@/providers/SupabaseProvider';
import { isValidIotaAddress } from '@iota/iota-sdk/utils';
import { SupabaseClient } from '@supabase/supabase-js';
import { skipToken, useQuery, useQueryClient } from '@tanstack/react-query';

const STALE_TIME = 10 * 60 * 1000; // 10 Minutes

const getPublicKey = async (
    address: string,
    supabase: SupabaseClient | null,
): Promise<string | null> => {
    if (!supabase) throw new Error('Supabase client not available.');

    const x = await supabase.from('owners').select('public_key').eq('address', address).single();
    if (x?.error !== null) {
        throw new Error('Could not fetch public key for address.');
    }
    if (!x?.data) return null;
    return x.data.public_key;
};

export function useFetchPublicKeyByAddress() {
    const queryClient = useQueryClient();
    const { client } = useSupabase();

    return (address?: string) =>
        queryClient.fetchQuery({
            queryKey: ['vault', 'get-public-key-by-address', address],
            queryFn:
                address && isValidIotaAddress(address)
                    ? () => getPublicKey(address, client())
                    : skipToken,
            meta: { persist: true },
            // If no data present, refetch immediately.
            // If public key is present, stale it for 10 minutes.
            staleTime: ({ state: { data } }) => (data === null ? 0 : STALE_TIME),
        });
}

export function useGetPublicKeyByAddress(address?: string) {
    const { client } = useSupabase();

    return useQuery({
        queryKey: ['public-key-by-address', address],
        queryFn:
            address && isValidIotaAddress(address)
                ? () => getPublicKey(address, client())
                : skipToken,
        meta: { persist: true },
        // If no data present, refetch immediately.
        // If public key is present, stale it for 10 minutes.
        staleTime: ({ state: { data } }) => (data === null ? 0 : STALE_TIME),
    });
}
