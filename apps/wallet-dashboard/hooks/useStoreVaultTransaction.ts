// Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { toast } from '@iota/core';
import { useCurrentAccount } from '@iota/dapp-kit';
import { Transaction } from '@iota/iota-sdk/transactions';
import { toHex } from '@iota/iota-sdk/utils';
import { type InfiniteData, useMutation, useQueryClient } from '@tanstack/react-query';
import { proposeTransaction } from 'iota-vault-sdk';
import type {
    ProposedTransaction,
    VaultProposedTransactionsPaginated,
} from './useQueryVaultProposedTransactions';

export interface ProposeTransactionData {
    vaultId: number;
    transactionBinary: Uint8Array<ArrayBufferLike>;
    comment?: string;
    signature?: string;
}

const addProposedTransaction = async (
    { vaultId, transactionBinary, comment, signature }: ProposeTransactionData,
): Promise<number[]> => {
    // TODO: store signature in function
    return proposeTransaction({
        vaultId,
        transactionData: toHex(transactionBinary),
        comment: comment ?? null,
        signature: signature ?? null,
    });
};

export const useStoreVaultTransaction = () => {
    const queryClient = useQueryClient();
    const account = useCurrentAccount();

    return useMutation({
        mutationFn: async (data: ProposeTransactionData) => {
            return await addProposedTransaction(data);
        },
        onMutate: async (data) => {
            const address = account?.address ?? '';
            const predicate = (query: { queryKey: unknown }) =>
                Array.isArray(query.queryKey) &&
                query.queryKey[0] === 'vault' &&
                query.queryKey[1] === data.vaultId &&
                query.queryKey[2] === 'query-proposed-transactions' &&
                query.queryKey[5] === 'pending';

            await queryClient.cancelQueries({ predicate });

            const previousData = queryClient.getQueriesData<
                InfiniteData<VaultProposedTransactionsPaginated>
            >({
                predicate,
            });

            const now = new Date();
            console.log(data);
            const optimisticTransaction: ProposedTransaction = {
                raw: Transaction.from(data.transactionBinary),
                createdAt: now,
                comment: data.comment ?? null,
                proposedBy: address,
                executedBy: null,
                digest: null,
                executedAt: null,
                declinedAt: null,
                id: -now.getTime(),
                status: {
                    approved: data.signature && address ? [address] : [],
                    rejected: [],
                    pending: [],
                },
            };

            queryClient.setQueriesData<InfiniteData<VaultProposedTransactionsPaginated>>(
                { predicate },
                (current) => {
                    if (!current) return current;
                    const [firstPage, ...restPages] = current.pages;
                    if (!firstPage) return current;
                    return {
                        ...current,
                        pages: [
                            {
                                ...firstPage,
                                transactions: [optimisticTransaction, ...firstPage.transactions],
                            },
                            ...restPages,
                        ],
                    };
                },
            );

            return { previousData };
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
