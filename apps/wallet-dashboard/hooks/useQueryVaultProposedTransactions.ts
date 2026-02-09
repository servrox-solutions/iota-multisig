// Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { useSupabase } from '@/providers/SupabaseProvider';
import { Database } from '@/supabase/database.types';
import { Transaction } from '@iota/iota-sdk/transactions';
import { fromHex } from '@iota/iota-sdk/utils';
import { SupabaseClient } from '@supabase/supabase-js';
import { useInfiniteQuery } from '@tanstack/react-query';

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

const proposedTransactionsByVaultId = async (
    supabase: SupabaseClient | null,
    { vaultId, cursorId, limit = 10, filter = 'pending' }: VaultProposedTransactionsParam,
): Promise<VaultProposedTransactionsPaginated> => {
    if (!supabase) throw new Error('Supabase client not available.');

    // Reading only possible if user is owner of the vault_id, determined by the JWT subject (address)
    let proposedTransactionsQuery = supabase
        .from('proposed_transactions_of_current_user')
        .select('*')
        .eq('vault_id', vaultId)
        // Fetch 1 more row to determine if there is a next page.
        // Maybe there is a better way to do it. The last entry will be stripped later.
        .limit(limit + 1);

    if (filter === 'executed') {
        proposedTransactionsQuery = proposedTransactionsQuery
            .not('transaction_digest', 'is', null)
            .order('executed_at', {
                ascending: false,
            });
    }

    if (filter === 'declined') {
        proposedTransactionsQuery = proposedTransactionsQuery
            .not('declined_at', 'is', null)
            .order('declined_at', {
                ascending: false,
            });
    }

    if (filter === 'pending') {
        proposedTransactionsQuery = proposedTransactionsQuery
            .is('transaction_digest', null)
            .is('declined_at', null)
            .order('created_at', {
                ascending: false,
            });
    }

    if (cursorId !== undefined) {
        proposedTransactionsQuery = proposedTransactionsQuery.lt('id', cursorId);
    }
    const result = await proposedTransactionsQuery;
    if (result?.error !== null) {
        throw new Error(`Could not fetch proposed transactions for vault ${vaultId}.`);
    }

    const dbData =
        result.data as Database['public']['Views']['proposed_transactions_of_current_user']['Row'][];

    const hasNext = (result.data.length ?? 0) > limit;
    // strip last element because we fetched 1 more than limit to determine hasNext
    const limitDbData = hasNext ? dbData.slice(0, -1) : dbData;

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
    const newCursorId = limitDbData.length > 0 ? limitDbData[limitDbData.length - 1].id : null;
    return {
        transactions,
        hasNext,
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
    const { client } = useSupabase();

    return useInfiniteQuery<VaultProposedTransactionsPaginated>({
        initialPageParam: { vaultId, cursorId, limit, filter },
        queryKey: ['vault', vaultId, 'query-proposed-transactions', cursorId, limit, filter],
        queryFn: async ({ pageParam }): Promise<VaultProposedTransactionsPaginated> => {
            return proposedTransactionsByVaultId(
                client(),
                pageParam as VaultProposedTransactionsParam,
            );
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
