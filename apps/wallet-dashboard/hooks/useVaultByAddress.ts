// Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { useSupabase } from '@/providers/SupabaseProvider';
import { Database } from '@/supabase/database.types';
import { isValidIotaAddress } from '@iota/iota-sdk/utils';
import { SupabaseClient } from '@supabase/supabase-js';
import { skipToken, useQuery } from '@tanstack/react-query';

const STALE_TIME = 10 * 60 * 1000;

const vaultByAddress = async (
    address: string,
    supabase: SupabaseClient | null,
): Promise<Database['public']['Tables']['vaults']['Row'] | null> => {
    if (!supabase) throw new Error('Supabase client not available.');

    const x = await supabase
        .from('vaults')
        .select('*')
        .eq('vault_address', address.toLowerCase())
        .maybeSingle();
    if (x?.error !== null) {
        throw new Error('Could not fetch vault at address.');
    }
    if (!x?.data) return null;
    return x.data as Database['public']['Tables']['vaults']['Row'];
};

export function useVaultByAddress(userAddress?: string) {
    const { client } = useSupabase();

    return useQuery({
        queryKey: ['vault', 'get-vault-by-address', userAddress],
        queryFn:
            userAddress && isValidIotaAddress(userAddress)
                ? () => vaultByAddress(userAddress, client())
                : skipToken,
        meta: { persist: true },
        staleTime: ({ state: { data } }) => (data === null ? 0 : STALE_TIME),
        enabled: !!userAddress && isValidIotaAddress(userAddress),
    });
}
