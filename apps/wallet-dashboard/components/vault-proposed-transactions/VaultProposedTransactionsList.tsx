// Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0
'use client';
import {
    ProposedTransaction,
    ProposedTransactionFilter,
    useQueryVaultProposedTransactions,
} from '@/hooks/useQueryVaultProposedTransactions';
import { Vault } from '@/lib/types';
import { LoadingIndicator } from '@iota/apps-ui-kit';
import { NoData, VirtualList } from '@iota/core';
import { useQueryState } from 'nuqs';
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
    const [_, setTxParam] = useQueryState('tx');

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
                }}
            />
        );
    };

    if (isLoading) {
        return <LoadingIndicator />;
    }


    return <>{
        allTransactions?.length ? (
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
        )
    }</>;
}
