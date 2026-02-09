// Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { useSupabase } from '@/providers/SupabaseProvider';
import { toast } from '@iota/core';
import { useCurrentAccount } from '@iota/dapp-kit';
import { SupabaseClient } from '@supabase/supabase-js';
import { type InfiniteData, useMutation, useQueryClient } from '@tanstack/react-query';
import type { VaultProposedTransactionsPaginated } from './useQueryVaultProposedTransactions';

export interface SetApprovalData {
    proposedTransactionId: number;
    signature: string | null;
    vaultId: number;
}

const setApproval = async (
    client: SupabaseClient | null,
    { proposedTransactionId, signature }: Omit<SetApprovalData, 'vaultId'>, // vaultId is determined by transactionId
): Promise<number[]> => {
    if (!client) throw new Error('Supabase client not available.');

    const res = await client.rpc('set_approval', {
        p_transaction_id: proposedTransactionId,
        p_signature: signature,
    });
    if (res?.error) {
        console.error(res.error);
        throw new Error(res.error.message);
    }
    return res.data;
};

export const useSetApproval = () => {
    const { client } = useSupabase();
    const queryClient = useQueryClient();
    const account = useCurrentAccount();

    return useMutation({
        mutationFn: async (data: SetApprovalData) => {
            const address = account?.address;
            const predicate = (query: { queryKey: unknown }) =>
                Array.isArray(query.queryKey) &&
                query.queryKey[0] === 'vault' &&
                query.queryKey[1] === data.vaultId &&
                query.queryKey[2] === 'query-proposed-transactions';

            await queryClient.cancelQueries({ predicate });

            if (address) {
                queryClient.setQueriesData<InfiniteData<VaultProposedTransactionsPaginated>>(
                    { predicate },
                    (current) => {
                        if (!current) return current;
                        return {
                            ...current,
                            pages: current.pages.map((page) => ({
                                ...page,
                                transactions: page.transactions.map((tx) => {
                                    if (tx.id !== data.proposedTransactionId) return tx;

                                    const approved = tx.status.approved.filter(
                                        (addr) => addr !== address,
                                    );
                                    const rejected = tx.status.rejected.filter(
                                        (addr) => addr !== address,
                                    );
                                    const pending = tx.status.pending.filter(
                                        (addr) => addr !== address,
                                    );

                                    if (data.signature !== null) {
                                        approved.push(address);
                                    } else {
                                        rejected.push(address);
                                    }

                                    return {
                                        ...tx,
                                        status: { approved, rejected, pending },
                                    };
                                }),
                            })),
                        };
                    },
                );
            }

            return await setApproval(client(), data);
        },
        onError: (error, _variables, context) => {
            context?.previousData?.forEach(([queryKey, data]) => {
                queryClient.setQueryData(queryKey, data);
            });
            toast.error('Transaction proposal failed.');
            console.error(error);
        },
        onSettled: () => queryClient.invalidateQueries({ queryKey: ['vault'] }),
    });
};
