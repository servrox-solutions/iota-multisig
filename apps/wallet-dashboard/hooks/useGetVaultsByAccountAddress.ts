// Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { VaultService } from '@/lib/services/vault.service';
import { WalletAccount } from '@iota/wallet-standard';
import { skipToken, useQuery } from '@tanstack/react-query';

export function useGetVaultsByAccountAddress(account: WalletAccount | null) {
    return useQuery({
        queryKey: ['vaults', account?.address],
        queryFn: account?.address
            ? () => VaultService.getVaultsForAccountAddress(account?.address)
            : skipToken,
        meta: { persist: true },
        initialData: [
            {
                vaultName: 'TestVault',
                threshold: 2,
                owners: [],
                address: '0x444b4c2822b213add43a0be6bbe5321ed34b56d1505de22c9ea042a8a2338945',
            },
        ],
        staleTime: 10 * 60 * 1000, // 10 minutes
    });
}
