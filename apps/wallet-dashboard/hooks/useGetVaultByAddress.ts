// Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { VaultService } from '@/lib/services/vault.service';
import { useQuery } from '@tanstack/react-query';

export function useGetVaultByAddress(address: string) {
    return useQuery({
        queryKey: ['vaults', address],
        queryFn: () => VaultService.getVaultByAddress(address),
        meta: { persist: true },
        staleTime: 10 * 60 * 1000, // 10 minutes
    });
}
