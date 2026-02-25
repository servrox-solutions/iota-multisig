// Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { getExtendedTransaction } from '@/lib/utils/transaction';
import { NoData, VirtualList, useQueryTransactionsByAddress } from '@iota/core';
import { IotaTransactionBlockResponse } from '@iota/iota-sdk/client';
import { VaultTransactionTile } from './VaultTransactionTile';

interface VaultTransactionsListProps {
    heightClassName?: string;
    displayImage?: boolean;
    address?: string;
}

export function VaultTransactionsList({
    heightClassName,
    displayImage,
    address,
}: VaultTransactionsListProps): JSX.Element {
    const { allTransactions, fetchNextPage, hasNextPage, isFetchingNextPage, error } =
        useQueryTransactionsByAddress(address);

    if (error) {
        return <div>{error?.message}</div>;
    }

    const virtualItem = (rawTransaction: IotaTransactionBlockResponse): JSX.Element => {
        const transaction = getExtendedTransaction(rawTransaction, address || '');
        return <VaultTransactionTile transaction={transaction} vaultAddress={address} />;
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
            getItemKey={(tx) => tx?.digest}
            estimateSize={() => 60}
            render={virtualItem}
            fetchNextPage={fetchNextPage}
            hasNextPage={hasNextPage}
            isFetchingNextPage={isFetchingNextPage}
            heightClassName={heightClassName}
        />
    );
}
