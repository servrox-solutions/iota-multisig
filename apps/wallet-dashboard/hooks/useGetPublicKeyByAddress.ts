// Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { isValidIotaAddress } from '@iota/iota-sdk/utils';
import { skipToken, useQuery, useQueryClient } from '@tanstack/react-query';
import { getPublicKeyByAddress } from 'iota-vault-sdk';

const STALE_TIME = 10 * 60 * 1000; // 10 Minutes

export function useFetchPublicKeyByAddress() {
    const queryClient = useQueryClient();

    return (address?: string) =>
        queryClient.fetchQuery({
            queryKey: ['vault', 'get-public-key-by-address', address],
            queryFn:
                address && isValidIotaAddress(address)
                    ? () => getPublicKeyByAddress(address)
                    : skipToken,
            meta: { persist: true },
            // If no data present, refetch immediately.
            // If public key is present, stale it for 10 minutes.
            staleTime: ({ state: { data } }) => (data === null ? 0 : STALE_TIME),
        });
}

export function useGetPublicKeyByAddress(address?: string) {
    return useQuery({
        queryKey: ['public-key-by-address', address],
        queryFn:
            address && isValidIotaAddress(address)
                ? () => getPublicKeyByAddress(address)
                : skipToken,
        meta: { persist: true },
        // If no data present, refetch immediately.
        // If public key is present, stale it for 10 minutes.
        staleTime: ({ state: { data } }) => (data === null ? 0 : STALE_TIME),
    });
}
