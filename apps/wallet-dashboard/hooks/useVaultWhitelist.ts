// Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { toast } from '@iota/core';
import { useCurrentAccount } from '@iota/dapp-kit';
import { isValidIotaAddress } from '@iota/iota-sdk/utils';
import { skipToken, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
    addVaultWhitelistEntry,
    getVaultWhitelist,
    removeVaultWhitelistEntry,
} from 'iota-vault-sdk';

export interface WhitelistEntry {
    address: string;
    createdAt: string;
}

export const useVaultWhitelist = (vaultId?: number) => {
    const queryClient = useQueryClient();
    const account = useCurrentAccount();
    const accountAddress = account?.address;

    const queryKey = ['vault', vaultId, 'whitelist'];

    const query = useQuery({
        queryKey,
        queryFn:
            vaultId && accountAddress && isValidIotaAddress(accountAddress)
                ? async () => {
                      const entries = await getVaultWhitelist({ vaultId });
                      return entries.map((entry) => ({
                          address: entry.address,
                          createdAt: entry.created_at,
                      }));
                  }
                : skipToken,
        staleTime: 1000,
        enabled: !!vaultId && !!accountAddress && isValidIotaAddress(accountAddress),
        refetchInterval: 1000 * 60,
    });

    const addMutation = useMutation({
        mutationFn: async (address: string) => {
            if (!vaultId) throw new Error('Vault id missing.');
            return addVaultWhitelistEntry({ vaultId, address });
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
            return removeVaultWhitelistEntry({ vaultId, address });
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
