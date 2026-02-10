// Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { useSupabase } from '@/providers/SupabaseProvider';
import { Database } from '@/supabase/database.types';
import { toast } from '@iota/core';
import { useCurrentAccount } from '@iota/dapp-kit';
import { isValidIotaAddress } from '@iota/iota-sdk/utils';
import { SupabaseClient } from '@supabase/supabase-js';
import { skipToken, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

export interface WhitelistEntry {
    address: string;
    createdAt: string;
}

const getVaultWhitelist = async (
    supabase: SupabaseClient | null,
    vaultId: number,
): Promise<WhitelistEntry[]> => {
    if (!supabase) throw new Error('Supabase client not available.');
    return [
        {
            address: '0x9',
            createdAt: new Date().toISOString(),
        },
        {
            address: '0x9',
            createdAt: new Date().toISOString(),
        },
        {
            address: '0x9',
            createdAt: new Date().toISOString(),
        },
    ];

    const res = await supabase.rpc('get_vault_whitelist', { p_vault_id: vaultId });
    if (res?.error) {
        console.error(res.error);
        throw new Error('Could not fetch whitelist entries.');
    }

    const data =
        (res.data as Database['public']['Functions']['get_vault_whitelist']['Returns']) ?? [];

    return data.map((entry) => ({
        address: entry.address,
        createdAt: entry.created_at,
    }));
};

const addVaultWhitelistEntry = async (
    supabase: SupabaseClient | null,
    vaultId: number,
    address: string,
): Promise<void> => {
    if (!supabase) throw new Error('Supabase client not available.');

    const res = await supabase.rpc('add_vault_whitelist_entry', {
        p_vault_id: vaultId,
        p_address: address,
    });

    if (res?.error) {
        console.error(res.error);
        throw new Error(res.error.message);
    }
};

const removeVaultWhitelistEntry = async (
    supabase: SupabaseClient | null,
    vaultId: number,
    address: string,
): Promise<void> => {
    if (!supabase) throw new Error('Supabase client not available.');

    const res = await supabase.rpc('remove_vault_whitelist_entry', {
        p_vault_id: vaultId,
        p_address: address,
    });

    if (res?.error) {
        console.error(res.error);
        throw new Error(res.error.message);
    }
};

export const useVaultWhitelist = (vaultId?: number) => {
    const { client } = useSupabase();
    const queryClient = useQueryClient();
    const account = useCurrentAccount();
    const accountAddress = account?.address;

    const queryKey = ['vault', vaultId, 'whitelist'];

    const query = useQuery({
        queryKey,
        queryFn:
            vaultId && accountAddress && isValidIotaAddress(accountAddress)
                ? () => getVaultWhitelist(client(), vaultId)
                : skipToken,
        staleTime: 1000,
        enabled: !!vaultId && !!accountAddress && isValidIotaAddress(accountAddress),
        refetchInterval: 1000 * 60,
    });

    const addMutation = useMutation({
        mutationFn: async (address: string) => {
            if (!vaultId) throw new Error('Vault id missing.');
            return addVaultWhitelistEntry(client(), vaultId, address);
        },
        onMutate: async (address) => {
            if (!vaultId) return { previousData: undefined };

            await queryClient.cancelQueries({ queryKey });
            const previousData = queryClient.getQueryData<WhitelistEntry[]>(queryKey);
            const now = new Date().toISOString();

            queryClient.setQueryData<WhitelistEntry[]>(queryKey, (current) => {
                const entries = current ?? [];
                if (entries.some((entry) => entry.address === address)) {
                    return entries;
                }
                return [{ address, createdAt: now }, ...entries];
            });

            return { previousData };
        },
        onError: (error, _variables, context) => {
            if (context?.previousData) {
                queryClient.setQueryData(queryKey, context.previousData);
            }
            toast.error(error.message);
        },
        onSuccess: () => toast('Whitelist address added.'),
        onSettled: () => queryClient.invalidateQueries({ queryKey }),
    });

    const removeMutation = useMutation({
        mutationFn: async (address: string) => {
            if (!vaultId) throw new Error('Vault id missing.');
            return removeVaultWhitelistEntry(client(), vaultId, address);
        },
        onMutate: async (address) => {
            if (!vaultId) return { previousData: undefined };

            await queryClient.cancelQueries({ queryKey });
            const previousData = queryClient.getQueryData<WhitelistEntry[]>(queryKey);

            queryClient.setQueryData<WhitelistEntry[]>(queryKey, (current) =>
                (current ?? []).filter((entry) => entry.address !== address),
            );

            return { previousData };
        },
        onError: (error, _variables, context) => {
            if (context?.previousData) {
                queryClient.setQueryData(queryKey, context.previousData);
            }
            toast.error(error.message);
        },
        onSuccess: () => toast('Whitelist address removed.'),
        onSettled: () => queryClient.invalidateQueries({ queryKey }),
    });

    return {
        ...query,
        addWhitelistEntry: addMutation.mutateAsync,
        removeWhitelistEntry: removeMutation.mutateAsync,
        isAdding: addMutation.isPending,
        isRemoving: removeMutation.isPending,
    };
};
