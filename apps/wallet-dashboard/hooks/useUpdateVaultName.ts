// Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { Vault } from '@/lib/types';
import { Database } from '@/supabase/database.types';
import { useCurrentAccount } from '@iota/dapp-kit';
import { QueryKey, useMutation, useQueryClient } from '@tanstack/react-query';
import { getVaultDefaultClient } from 'iota-vault-sdk';

type UpdateVaultNameArgs = Database['public']['Functions']['update_vault_name']['Args'];

const updateVaultName = async ({ p_name, p_vault_id }: UpdateVaultNameArgs): Promise<void> => {
    const client = getVaultDefaultClient();
    if (!client) {
        throw new Error('Supabase client not available.');
    }

    const res = await client.rpc('update_vault_name', {
        p_name,
        p_vault_id,
    });

    if (res?.error) {
        console.error(res.error);
        throw new Error(res.error.message);
    }
};

export function useUpdateVaultName() {
    const queryClient = useQueryClient();
    const account = useCurrentAccount();

    return useMutation({
        mutationFn: async (args: UpdateVaultNameArgs) => {
            return await updateVaultName(args);
        },
        onMutate: async ({ p_name, p_vault_id }) => {
            const queryKey = ['vault', 'get-vaults-by-user', account?.address] as QueryKey;
            await queryClient.cancelQueries({ queryKey });

            const previousData = queryClient.getQueryData<Vault[] | null>(queryKey);

            queryClient.setQueryData<Vault[] | null>(queryKey, (current) => {
                if (!current) {
                    return current;
                }

                return current.map((vault) =>
                    vault.id === p_vault_id ? { ...vault, vaultName: p_name } : vault,
                );
            });

            return { previousData, queryKey };
        },
        onError: (
            error,
            _variables,
            context: { previousData: Vault[] | null | undefined; queryKey: QueryKey } | undefined,
        ) => {
            if (context) {
                queryClient.setQueryData(context.queryKey, context.previousData);
            }
            console.error(error);
        },
        onSettled: () => queryClient.invalidateQueries({ queryKey: ['vault'] }),
    });
}
