// Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import {
    ProposedTransaction,
    useQueryVaultProposedTransactions,
} from '@/hooks/useQueryVaultProposedTransactions';
import { NoData, VirtualList } from '@iota/core';
import { VaultProposedTransactionTile } from './VaultProposedTransactionTile';

interface VaultProposedTransactionsListProps {
    heightClassName?: string;
    displayImage?: boolean;
    vaultId: number;
}

export function VaultProposedTransactionsList({
    heightClassName,
    displayImage,
    vaultId,
}: VaultProposedTransactionsListProps): JSX.Element {
    const { data, fetchNextPage, hasNextPage, isFetchingNextPage, error } =
        useQueryVaultProposedTransactions({
            vaultId,
            limit: 5,
            cursorId: undefined,
        });
    const allTransactions = data?.pages.flatMap((page) => page.transactions);

    if (error) {
        return <div>{error?.message}</div>;
    }

    const virtualItem = (transaction: ProposedTransaction, index: number): JSX.Element => {
        return <VaultProposedTransactionTile transaction={transaction} idx={index} />;
    };

    if (!allTransactions || allTransactions.length === 0) {
        return (
            <NoData
                message="You can view your IOTA network transactions here once they are available."
                displayImage={displayImage}
            />
        );
    }

    return (
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
    );
}
