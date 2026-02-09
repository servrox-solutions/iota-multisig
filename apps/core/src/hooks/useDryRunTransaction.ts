// Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { useIotaClient } from '@iota/dapp-kit';
import type { DryRunTransactionBlockResponse } from '@iota/iota-sdk/client';
import { Transaction } from '@iota/iota-sdk/transactions';
import { useQuery } from '@tanstack/react-query';

export function useDryRunTransaction(raw: Transaction | null | undefined) {
    const client = useIotaClient();

    return useQuery<DryRunTransactionBlockResponse>({
        // eslint-disable-next-line @tanstack/query/exhaustive-deps
        queryKey: ['dryRunTransaction', raw?.getData()],
        enabled: !!raw && !!client,
        queryFn: async () => {
            const transactionBlock = await raw!.build({ client });
            return client.dryRunTransactionBlock({ transactionBlock });
        },
        staleTime: 10 * 1000,
        refetchInterval: 10 * 1000,
    });
}
