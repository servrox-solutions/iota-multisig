// Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { Database } from '@/supabase/database.types';
import { Transaction } from '@iota/iota-sdk/transactions';
import { fromHex } from '@iota/iota-sdk/utils';
import { useQuery } from '@tanstack/react-query';
import { getVaultDefaultClient } from 'iota-vault-sdk';
import type { ProposedTransaction } from './useQueryVaultProposedTransactions';

interface QueryVaultProposedTransactionByIdParams {
    vaultId: number;
    transactionId: number | null;
}

async function fetchVaultProposedTransactionById({
    vaultId,
    transactionId,
}: QueryVaultProposedTransactionByIdParams): Promise<ProposedTransaction | null> {
    if (transactionId === null) {
        return null;
    }

    const client = getVaultDefaultClient();
    if (!client) {
        throw new Error('Supabase client not available.');
    }

    const { data, error } = await client
        .from('proposed_transactions_of_current_user')
        .select('*')
        .eq('vault_id', vaultId)
        .eq('id', transactionId)
        .maybeSingle();

    if (error) {
        throw new Error(`Could not fetch proposed transaction ${transactionId}.`);
    }

    if (!data) {
        return null;
    }

    const row = data as Database['public']['Views']['proposed_transactions_of_current_user']['Row'];

    return {
        raw: Transaction.from(
            fromHex(
                String.fromCharCode.apply(null, [...fromHex(row.transaction_payload!.slice(2))]),
            ),
        ),
        createdAt: new Date(row.created_at!),
        comment: row.comment,
        proposedBy: row.proposed_by!,
        executedBy: row.executed_by,
        digest: row.transaction_digest,
        executedAt: row.executed_at ? new Date(row.executed_at) : null,
        declinedAt: row.declined_at ? new Date(row.declined_at) : null,
        id: row.id!,
        status: {
            approved: row.approvals!,
            rejected: row.rejections!,
            pending: row.pending!,
        },
    } satisfies ProposedTransaction;
}

export function useQueryVaultProposedTransactionById({
    vaultId,
    transactionId,
}: QueryVaultProposedTransactionByIdParams) {
    return useQuery({
        queryKey: ['vault', vaultId, 'query-proposed-transaction', transactionId],
        queryFn: () => fetchVaultProposedTransactionById({ vaultId, transactionId }),
        enabled: transactionId !== null,
        staleTime: 1000,
        refetchInterval: 1000 * 60,
    });
}
