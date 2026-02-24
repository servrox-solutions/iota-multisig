// Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { NonEmptyArray, Vault } from '@/lib/types';
import { toast } from '@iota/core';
import { useCurrentAccount } from '@iota/dapp-kit';
import { Network } from '@iota/iota-sdk/client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createVaultInvitation } from 'iota-vault-sdk';

export interface AddUserData {
    address: string;
    publicKey: string;
}

const addVault = async (
    vault: Omit<Vault, 'network'>,
    networks: NonEmptyArray<Network>,
): Promise<number[]> => {
    return createVaultInvitation({
        users: vault.owners.sort((owner) => owner.address.localeCompare(owner.address)),
        threshold: vault.threshold,
        name: vault.vaultName,
        networks,
    });
};

export const useAddVault = ({ onSuccess }: { onSuccess?: (vaultWithid: Vault[]) => void }) => {
    const queryClient = useQueryClient();
    const account = useCurrentAccount();

    return useMutation({
        mutationFn: async ({
            vault,
            networks,
        }: {
            vault: Omit<Vault, 'network'>;
            networks: NonEmptyArray<Network>;
        }) => {
            // ensure uniqueness of networks and fixed order because returned vault ids are in the same order as the input networks
            const uniqueNetworks = [...new Set(networks)].sort((x, y) => x.localeCompare(y));
            // Cancel any outgoing refetches
            // (so they don't overwrite our optimistic update)
            uniqueNetworks.forEach(async (network) => {
                await queryClient.cancelQueries({
                    queryKey: ['vault', 'get-vaults-by-user', account?.address],
                });

                // Optimistically update to the new value
                queryClient.setQueryData(
                    ['vault', 'get-vaults-by-user', account?.address],
                    (old: Vault[]) => [...old, { ...vault, network }] as Vault[],
                );
            });

            // Create the new vaults
            return await addVault(vault, networks);
        },
        // Always refetch after error or success. This also overwrites the optimistic update with the final values.
        onSettled: () => queryClient.invalidateQueries({ queryKey: ['vault'] }),
        onSuccess: (vaultIds, variables) => {
            toast('Vault successfully added.');
            onSuccess?.(
                // ensure returned ids are correctly assigned the networks
                [...new Set(variables.networks)]
                    .sort((x, y) => x.localeCompare(y))
                    .map((network, idx) => {
                        console.log(variables.vault, network, vaultIds, idx, {
                            ...variables.vault,
                            network,
                            id: vaultIds[idx],
                        });
                        return { ...variables.vault, network, id: vaultIds[idx] };
                    }),
            );
        },
        onError: (error: Error) => toast.error(error.message),
    });
};
