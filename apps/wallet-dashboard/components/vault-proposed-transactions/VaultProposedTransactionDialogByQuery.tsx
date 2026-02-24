// Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0
'use client';

import { useQueryVaultProposedTransactionById } from '@/hooks/useQueryVaultProposedTransactionById';
import { VaultProposedTransactionsPaginated } from '@/hooks/useQueryVaultProposedTransactions';
import { Vault } from '@/lib/types';
import { Dialog, LoadingIndicator } from '@iota/apps-ui-kit';
import { InfiniteData, useQueryClient } from '@tanstack/react-query';
import { useQueryState } from 'nuqs';
import { useMemo } from 'react';
import { DialogLayout } from '../dialogs/layout';
import { ProposedTransactionDetailsLayout } from '../dialogs/transaction/ProposedTransactionDetailsLayout';

export function VaultProposedTransactionDialogByQuery({ vault }: { vault: Vault }): JSX.Element {
    const [txParam, setTxParam] = useQueryState('tx');
    const queryClient = useQueryClient();
    const openId = useMemo(() => {
        if (!txParam) {
            return null;
        }

        const parsed = Number(txParam);
        return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
    }, [txParam]);

    const { data: transaction, isLoading } = useQueryVaultProposedTransactionById({
        vaultId: vault.id,
        transactionId: openId,
    });
    const cachedTransaction = useMemo(() => {
        if (!openId) {
            return undefined;
        }

        const cacheEntries = queryClient.getQueriesData<
            InfiniteData<VaultProposedTransactionsPaginated>
        >({
            predicate: (query) =>
                Array.isArray(query.queryKey) &&
                query.queryKey[0] === 'vault' &&
                query.queryKey[1] === vault.id &&
                query.queryKey[2] === 'query-proposed-transactions',
        });

        for (const [, data] of cacheEntries) {
            const found = data?.pages
                .flatMap((page) => page.transactions)
                .find((candidate) => candidate.id === openId);
            if (found) {
                return found;
            }
        }
        return undefined;
    }, [openId, queryClient, vault.id]);

    const isOpen = Boolean(openId);
    const transactionToDisplay = transaction ?? cachedTransaction;

    if (!isOpen) {
        return <></>;
    }

    return (
        <Dialog
            open={isOpen}
            onOpenChange={(nextOpen) => {
                if (!nextOpen) {
                    setTxParam(null);
                }
            }}
        >
            <DialogLayout>
                {transactionToDisplay ? (
                    <ProposedTransactionDetailsLayout
                        transaction={transactionToDisplay}
                        vault={vault}
                        onClose={() => setTxParam(null)}
                    />
                ) : (
                    <div className="p-md">
                        {isLoading ? <LoadingIndicator /> : <span>Transaction not found.</span>}
                    </div>
                )}
            </DialogLayout>
        </Dialog>
    );
}
