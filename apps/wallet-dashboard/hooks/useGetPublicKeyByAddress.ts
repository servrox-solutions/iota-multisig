// Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { UserService } from '@/lib/services';
import { WalletAccount } from '@iota/wallet-standard';
import { skipToken, useQuery } from '@tanstack/react-query';

export function useGetPublicKeyByAddress(account: WalletAccount | null) {
    return useQuery({
        queryKey: ['vaults', 'public-key-by-address', account?.address],
        queryFn: account?.address
            ? () => UserService.getPublicKeyForAddress(account?.address)
            : skipToken,
        meta: { persist: true },
        staleTime: 10 * 60 * 1000, // 10 minutes
    });
}
