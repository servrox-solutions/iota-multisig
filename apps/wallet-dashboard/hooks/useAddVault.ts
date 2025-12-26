// Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { Vault } from '@/lib/services/vault.service';
import { useSupabase } from '@/providers/SupabaseProvider';
import { Database } from '@/supabase/database.types';
import { useCurrentAccount } from '@iota/dapp-kit';
import { SupabaseClient } from '@supabase/supabase-js';
import { useMutation, useQueryClient } from '@tanstack/react-query';

export interface AddUserData {
    address: string;
    publicKey: string;
}

const addVault = async (
    newVault: Omit<Database['public']['Tables']['vaults']['Row'], 'created_at'>,
    client: SupabaseClient | null,
) => {
    if (!client) throw new Error('Supabase client not available.');
    const res = await client.from('vaults').upsert(newVault);
    console.log(res);
    if (res?.error) {
        console.error(res.error);
        throw new Error('Error storing public key for address.');
    }
};

export const useAddVault = () => {
    const { client } = useSupabase();
    const queryClient = useQueryClient();
    const account = useCurrentAccount();

    return useMutation({
        mutationFn: async (newVault: Vault) => {
            // Cancel any outgoing refetches
            // (so they don't overwrite our optimistic update)
            await queryClient.cancelQueries({
                queryKey: ['vault', 'get-vaults-by-user', account?.address],
            });

            const dbVault: Omit<Database['public']['Tables']['vaults']['Row'], 'created_at'> = {
                vault_address: newVault.address,
                updated_at: new Date().toISOString(),
                threshold: newVault.threshold,
                name: newVault.vaultName,
                owners: newVault.owners,
            };

            // Optimistically update to the new value
            queryClient.setQueryData(
                ['vault', 'get-vaults-by-user', account?.address],
                (old: Vault[]) => [...old, dbVault] as Vault[],
            );
            // Create the new vault
            await addVault(dbVault, client());
        },
        // Always refetch after error or success. This also overwrites the optimistic update with the final values.
        onSettled: () => queryClient.invalidateQueries({ queryKey: ['vaults'] }),
    });
};
