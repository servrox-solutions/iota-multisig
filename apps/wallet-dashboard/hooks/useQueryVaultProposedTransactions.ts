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
    created_at: Date;
    comment: string | null;
    proposed_by: string;
    id: number;
}

export interface VaultProposedTransactionsPaginated {
    transactions: ProposedTransaction[];
    hasNext: boolean;
    cursorId: number | null;
}

export interface VaultProposedTransactionsParam {
    vaultId: number;
    cursorId?: number;
    limit?: number;
}

const proposedTransactionsByVaultId = async (
    supabase: SupabaseClient | null,
    { vaultId, cursorId, limit = 10 }: VaultProposedTransactionsParam,
): Promise<VaultProposedTransactionsPaginated> => {
    if (!supabase) throw new Error('Supabase client not available.');

    // Reading only possible if user is owner of the vault_id, determined by the JWT subject (address)
    let proposedTransactionsQuery = supabase
        .from('proposed_transactions')
        .select('*')
        .eq('vault_id', vaultId)
        .order('id', {
            ascending: false, // highest ID is always the latest transaction
        })
        // Fetch 1 more row to determine if there is a next page.
        // Maybe there is a better way to do it. The last entry will be stripped later.
        .limit(limit + 1);

    if (cursorId !== undefined) {
        proposedTransactionsQuery = proposedTransactionsQuery.lt('id', cursorId);
    }
    const result = await proposedTransactionsQuery;
    if (result?.error !== null) {
        throw new Error(`Could not fetch proposed transactions for vault ${vaultId}.`);
    }

    const dbData = result.data as Database['public']['Tables']['proposed_transactions']['Row'][];

    const hasNext = (result.data.length ?? 0) > limit;
    // strip last element because we fetched 1 more than limit to determine hasNext
    const limitDbData = dbData.slice(0, -1);

    const transactions = limitDbData.map(
        (data) =>
            ({
                raw: Transaction.from(
                    fromHex(
                        String.fromCharCode.apply(null, [
                            ...fromHex(data.transaction_payload.slice(2)),
                        ]),
                    ),
                ),
                created_at: new Date(data.created_at),
                comment: data.comment,
                proposed_by: data.proposed_by,
                id: data.id,
            }) as ProposedTransaction,
    );
    const newCursorId = limitDbData.length > 0 ? limitDbData[limitDbData.length - 1].id : null;
    console.log('ha', newCursorId, limitDbData);
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
}: VaultProposedTransactionsParam) {
    const { client } = useSupabase();

    return useInfiniteQuery<VaultProposedTransactionsPaginated>({
        initialPageParam: { vaultId, cursorId, limit },
        queryKey: ['vault', vaultId, 'query-proposed-transactions', cursorId, limit],
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
                  }
                : undefined;
        },
    });
}
