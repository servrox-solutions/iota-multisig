// Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

'use client';

import {
    Card,
    CardBody,
    CardImage,
    CardType,
    ImageShape,
    ImageType,
    Tooltip
} from '@iota/apps-ui-kit';

import { ProposedTransaction } from '@/hooks/useQueryVaultProposedTransactions';
import { useVaultsByUser } from '@/hooks/useVaultsByUser';
import { CheckmarkFilled, CloseFilled } from '@iota/apps-ui-icons';
import { CircleGauge, formatDate } from '@iota/core';
import { useCurrentAccount } from '@iota/dapp-kit';

interface VaultProposedTransactionTileProps {
    transaction: ProposedTransaction;
    idx: number;
    vaultId: number;
    onTileClick: (transactionId: number) => void;
}

export function VaultProposedTransactionTile({
    idx,
    transaction,
    vaultId,
    onTileClick,
}: VaultProposedTransactionTileProps): JSX.Element {
    const account = useCurrentAccount();
    const address = account?.address;

    const { data: vaults } = useVaultsByUser(address);
    const vault = vaults?.find((x) => x.id === vaultId);
    const totalWeight = vault?.owners.reduce((prev, cur) => (prev += cur.weight), 0) ?? 0;
    const approved = transaction.status.approved
        .map((approved) => vault?.owners.find((owner) => owner.address === approved))
        .filter((x) => !!x)
        .reduce((prev, cur) => (prev += cur.weight), 0);
    const rejected = transaction.status.rejected
        .map((rejected) => vault?.owners.find((owner) => owner.address === rejected))
        .filter((x) => !!x)
        .reduce((prev, cur) => (prev += cur.weight), 0);

    return (
        <>
            <Card
                testId="transaction-tile"
                type={CardType.Default}
                isHoverable
                onClick={() => onTileClick(transaction.id)}
            >
                <div className="flex flex-col md:flex-row w-full gap-2">
                    <div className="flex flex-row gap-2">
                        <CardImage type={ImageType.BgSolid} shape={ImageShape.SquareRounded}>
                            {idx + 1}
                        </CardImage>
                        <div className="flex-grow-0">
                            <CardBody
                                title={'Transaction'}
                                subtitle={
                                    formatDate(
                                        transaction.declinedAt ||
                                        transaction.executedAt ||
                                        transaction.createdAt,
                                        ['day', 'month', 'year', 'hour', 'minute']
                                    )

                                }
                                icon={
                                    transaction.declinedAt !== null ? (
                                        <CloseFilled />
                                    ) : (
                                        approved >= (vault?.threshold ?? 0) && <CheckmarkFilled />
                                    )
                                }
                                tooltipText={
                                    transaction.declinedAt !== null
                                        ? 'Transaction declined'
                                        : transaction.digest !== null
                                            ? 'Transaction executed'
                                            : 'Ready to be executed'
                                }
                            />
                        </div>
                    </div>
                    <div className="flex-grow">
                        <div className="flex flex-col text-xs">
                            <span className="max-w-64 md:max-w-96 truncate md:whitespace-normal md:break-words">
                                {transaction.comment}
                            </span>
                        </div>
                    </div>
                    <div className="flex flex-shrink-0 gap-1 justify-center">
                        {transaction.status.rejected.length > 0 && (
                            <Tooltip
                                text={`Rejection Weight: ${rejected}\nThreshold: ${totalWeight - (vault?.threshold ?? 0) + 1}`}
                            >
                                <CircleGauge
                                    size={32}
                                    max={totalWeight - (vault?.threshold ?? 0) + 1}
                                    cur={rejected}
                                    text={`${transaction.status.rejected.length}`}
                                    className="text-iota-error-40"
                                />
                            </Tooltip>
                        )}
                        {transaction.status.approved.length > 0 && (
                            <Tooltip
                                text={`Approval Weight: ${approved}\nThreshold: ${vault?.threshold ?? 0}`}
                            >
                                <CircleGauge
                                    size={32}
                                    max={vault?.threshold ?? 0}
                                    cur={approved}
                                    text={`${transaction.status.approved.length}`}
                                    className="text-iota-primary-50"
                                />
                            </Tooltip>
                        )}
                    </div>
                </div>
            </Card>

        </>
    );
}
