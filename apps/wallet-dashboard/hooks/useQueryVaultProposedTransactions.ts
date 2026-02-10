// Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { Database } from '@/supabase/database.types';
import { Transaction } from '@iota/iota-sdk/transactions';
import { fromHex, toBase64 } from '@iota/iota-sdk/utils';
import { useInfiniteQuery } from '@tanstack/react-query';
import { getProposedTransactionsOfCurrentUser } from 'iota-vault-sdk';

export interface ProposedTransaction {
    raw: Transaction;
    createdAt: Date;
    comment: string | null;
    proposedBy: string;
    executedBy: string | null;
    digest: string | null;
    executedAt: Date | null;
    declinedAt: Date | null;
    id: number;
    status: {
        approved: string[];
        rejected: string[];
        pending: string[];
    };
}

export type ProposedTransactionFilter = 'pending' | 'executed' | 'declined';

export interface VaultProposedTransactionsPaginated {
    transactions: ProposedTransaction[];
    hasNext: boolean;
    cursorId: number | null;
}

export interface VaultProposedTransactionsParam {
    vaultId: number;
    cursorId?: number;
    limit?: number;
    filter?: ProposedTransactionFilter;
}

const proposedTransactionsByVaultId = async ({
    vaultId,
    cursorId,
    limit = 10,
    filter = 'pending',
}: VaultProposedTransactionsParam): Promise<VaultProposedTransactionsPaginated> => {
    const result = await getProposedTransactionsOfCurrentUser({
        vaultId,
        cursorId,
        limit,
        filter,
    });
    const dbData =
        result.rows as Database['public']['Views']['proposed_transactions_of_current_user']['Row'][];
    const limitDbData = dbData;

    const transactions = limitDbData.map(
        (data) =>
            ({
                raw: Transaction.from(
                    fromHex(
                        String.fromCharCode.apply(null, [
                            ...fromHex(data.transaction_payload!.slice(2)),
                        ]),
                    ),
                ),
                createdAt: new Date(data.created_at!),
                comment: data.comment,
                proposedBy: data.proposed_by!,
                executedBy: data.executed_by,
                digest: data.transaction_digest,
                executedAt: data.executed_at ? new Date(data.executed_at) : null,
                declinedAt: data.declined_at ? new Date(data.declined_at) : null,
                id: data.id!,
                status: {
                    approved: data.approvals!,
                    rejected: data.rejections!,
                    pending: data.pending!,
                },
            }) satisfies ProposedTransaction,
    );
    console.log(toBase64(await transactions[0].raw.build()));
    const newCursorId = result.cursorId;
    return {
        transactions,
        hasNext: result.hasNext,
        cursorId: newCursorId,
    };
};

// Returns all proposed transactions for the current user.
export function useQueryVaultProposedTransactions({
    vaultId,
    cursorId,
    limit,
    filter,
}: VaultProposedTransactionsParam) {
    return useInfiniteQuery<VaultProposedTransactionsPaginated>({
        initialPageParam: { vaultId, cursorId, limit, filter },
        queryKey: ['vault', vaultId, 'query-proposed-transactions', cursorId, limit, filter],
        queryFn: async ({ pageParam }): Promise<VaultProposedTransactionsPaginated> => {
            return proposedTransactionsByVaultId(pageParam as VaultProposedTransactionsParam);
        },
        // Always refetch because another user may has approved/rejected a transaction.
        // 1 Second stale time ensures de-duping of requests within 1 second.
        staleTime: 1000,
        // Refresh data all 60 seconds
        refetchInterval: 1000 * 60,
        getNextPageParam: (lastPage, _, lastPageParam, f) => {
            if (!lastPageParam) return undefined;
            return lastPage.hasNext
                ? {
                      vaultId: (lastPageParam as VaultProposedTransactionsParam).vaultId,
                      cursorId: lastPage.cursorId,
                      limit: (lastPageParam as VaultProposedTransactionsParam).limit,
                      filter: (lastPageParam as VaultProposedTransactionsParam).filter,
                  }
                : undefined;
        },
    });
}
