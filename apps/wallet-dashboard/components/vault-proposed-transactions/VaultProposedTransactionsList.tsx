// Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0
'use client';
import {
    ProposedTransaction,
    ProposedTransactionFilter,
    useQueryVaultProposedTransactions,
} from '@/hooks/useQueryVaultProposedTransactions';
import { Dialog, LoadingIndicator } from '@iota/apps-ui-kit';
import { NoData, VirtualList } from '@iota/core';
import { useEffect, useMemo, useState } from 'react';
import { DialogLayout } from '../dialogs/layout';
import { ProposedTransactionDetailsLayout } from '../dialogs/transaction/ProposedTransactionDetailsLayout';
import { VaultProposedTransactionTile } from './VaultProposedTransactionTile';

interface VaultProposedTransactionsListProps {
    heightClassName?: string;
    displayImage?: boolean;
    vaultId: number;
    filter?: ProposedTransactionFilter;
}

export function VaultProposedTransactionsList({
    heightClassName,
    displayImage,
    vaultId,
    filter = 'pending',
}: VaultProposedTransactionsListProps): JSX.Element {
    const { data, fetchNextPage, hasNextPage, isFetchingNextPage, error, isLoading } =
        useQueryVaultProposedTransactions({
            vaultId,
            limit: 5,
            cursorId: undefined,
            filter,
        });
    const allTransactions = data?.pages.flatMap((page) => page.transactions);
    const [open, setOpen] = useState(false);
    const [openId, setOpenId] = useState<number | null>(null);
    const dialogTransaction = useMemo(() => {
        return allTransactions?.find((x) => x.id === Number(openId));
    }, [allTransactions, openId]);

    useEffect(() => {
        if (!dialogTransaction) {
            setOpenId(null);
        }
    }, [dialogTransaction]);

    if (error) {
        return <div>{error?.message}</div>;
    }

    const virtualItem = (transaction: ProposedTransaction, index: number): JSX.Element => {
        return (
            <VaultProposedTransactionTile
                transaction={transaction}
                idx={index}
                vaultId={vaultId}
                onTileClick={(id) => {
                    setOpenId(id);
                    setOpen(true);
                }}
            />
        );
    };

    if (isLoading) {
        return <LoadingIndicator />;
    }

    if (!allTransactions || allTransactions.length === 0) {
        return (
            <NoData
                message="You can view your IOTA network transactions here once they are available."
                displayImage={displayImage}
            />
        );
    }

    return (
        <>
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
            {dialogTransaction && (
                <Dialog open={open} onOpenChange={setOpen}>
                    <DialogLayout>
                        <ProposedTransactionDetailsLayout
                            transaction={dialogTransaction}
                            vaultId={vaultId}
                            onClose={() => setOpen(false)}
                        />
                    </DialogLayout>
                </Dialog>
            )}
        </>
    );
}
