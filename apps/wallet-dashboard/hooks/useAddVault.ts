// Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { Vault } from '@/lib/types';
import { useSupabase } from '@/providers/SupabaseProvider';
import { toast } from '@iota/core';
import { useCurrentAccount } from '@iota/dapp-kit';
import { SupabaseClient } from '@supabase/supabase-js';
import { useMutation, useQueryClient } from '@tanstack/react-query';

export interface AddUserData {
    address: string;
    publicKey: string;
}

const addVault = async (vault: Vault, client: SupabaseClient | null): Promise<number> => {
    if (!client) throw new Error('Supabase client not available.');
    const res = await client.rpc('create_vault_invitation', {
        p_users: vault.owners,
        p_threshold: vault.threshold,
        p_name: vault.vaultName,
    });
    if (res?.error) {
        console.error(res.error);
        throw new Error(res.error.message);
    }
    return res.data;
};

export const useAddVault = ({ onSuccess }: { onSuccess?: (vaultWithid: Vault) => void }) => {
    const { client } = useSupabase();
    const queryClient = useQueryClient();
    const account = useCurrentAccount();

    return useMutation({
        mutationFn: async (vault: Vault) => {
            // Cancel any outgoing refetches
            // (so they don't overwrite our optimistic update)
            await queryClient.cancelQueries({
                queryKey: ['vault', 'get-vaults-by-user', account?.address],
            });

            // Optimistically update to the new value
            queryClient.setQueryData(
                ['vault', 'get-vaults-by-user', account?.address],
                (old: Vault[]) => [...old, vault] as Vault[],
            );
            // Create the new vault
            return await addVault(vault, client());
        },
        // Always refetch after error or success. This also overwrites the optimistic update with the final values.
        onSettled: () => queryClient.invalidateQueries({ queryKey: ['vault'] }),
        onSuccess: (vaultId, variables) => {
            toast('Vault successfully added.');
            onSuccess?.({ ...variables, id: vaultId });
        },
        onError: (error: Error) => toast.error(error.message),
    });
};
