// Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0
'use client';
import { useQueryVaultProposedTransactionById } from '@/hooks/useQueryVaultProposedTransactionById';
import {
    ProposedTransaction,
    ProposedTransactionFilter,
    useQueryVaultProposedTransactions,
} from '@/hooks/useQueryVaultProposedTransactions';
import { Vault } from '@/lib/types';
import { Dialog, LoadingIndicator } from '@iota/apps-ui-kit';
import { NoData, VirtualList } from '@iota/core';
import { useQueryState } from 'nuqs';
import { useMemo, useState } from 'react';
import { DialogLayout } from '../dialogs/layout';
import { ProposedTransactionDetailsLayout } from '../dialogs/transaction/ProposedTransactionDetailsLayout';
import { VaultProposedTransactionTile } from './VaultProposedTransactionTile';

interface VaultProposedTransactionsListProps {
    heightClassName?: string;
    displayImage?: boolean;
    vault: Vault;
    filter?: ProposedTransactionFilter;
}

export function VaultProposedTransactionsList({
    heightClassName,
    displayImage,
    vault,
    filter = 'pending',
}: VaultProposedTransactionsListProps): JSX.Element {
    const vaultId = vault.id;
    const { data, fetchNextPage, hasNextPage, isFetchingNextPage, error, isLoading } =
        useQueryVaultProposedTransactions({
            vaultId,
            limit: 5,
            cursorId: undefined,
            filter,
        });
    const allTransactions = data?.pages.flatMap((page) => page.transactions);
    const [txParam, setTxParam] = useQueryState('tx');
    const [open, setOpen] = useState(false);
    const openId = useMemo(() => {
        if (!txParam) {
            return null;
        }

        const parsed = Number(txParam);
        return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
    }, [txParam]);

    const { data: deepLinkedTransaction, isLoading: isLoadingDeepLinkedTransaction } =
        useQueryVaultProposedTransactionById({
            vaultId,
            transactionId: openId,
        });

    const dialogTransaction = useMemo(() => {
        if (!openId) {
            return undefined;
        }
        return allTransactions?.find((x) => x.id === openId) ?? deepLinkedTransaction ?? undefined;
    }, [allTransactions, deepLinkedTransaction, openId]);
    const closeDialog = () => {
        setOpen(false);
        setTxParam(null);
    };

    if (error) {
        return <div>{error?.message}</div>;
    }

    const virtualItem = (transaction: ProposedTransaction, index: number): JSX.Element => {
        return (
            <VaultProposedTransactionTile
                transaction={transaction}
                idx={index}
                vault={vault}
                onTileClick={(id) => {
                    setTxParam(String(id));
                    setOpen(true);
                }}
            />
        );
    };

    if (isLoading) {
        return <LoadingIndicator />;
    }

    const content = allTransactions?.length ? (
        <VirtualList
            items={allTransactions}
            getItemKey={(tx) => JSON.stringify(tx)} // TODO
            estimateSize={() => 60}
            render={virtualItem}
            fetchNextPage={fetchNextPage}
            hasNextPage={hasNextPage}
            isFetchingNextPage={isFetchingNextPage}
            heightClassName={heightClassName}
        />
    ) : (
        <NoData
            message="You can view your IOTA network transactions here once they are available."
            displayImage={displayImage}
        />
    );

    return (
        <>
            {content}
            {openId && isLoadingDeepLinkedTransaction && <LoadingIndicator />}
            {dialogTransaction && (
                <Dialog
                    open={open || Boolean(openId)}
                    onOpenChange={(nextOpen) => {
                        setOpen(nextOpen);
                        if (!nextOpen) {
                            setTxParam(null);
                        }
                    }}
                >
                    <DialogLayout>
                        <ProposedTransactionDetailsLayout
                            transaction={dialogTransaction}
                            vault={vault}
                            onClose={closeDialog}
                        />
                    </DialogLayout>
                </Dialog>
            )}
        </>
    );
}
