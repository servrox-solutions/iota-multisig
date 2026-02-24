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
    Tooltip,
} from '@iota/apps-ui-kit';

import { ProposedTransaction } from '@/hooks/useQueryVaultProposedTransactions';
import { Vault } from '@/lib/types';
import { CheckmarkFilled, CloseFilled } from '@iota/apps-ui-icons';
import { CircleGauge, formatDate } from '@iota/core';

interface VaultProposedTransactionTileProps {
    transaction: ProposedTransaction;
    idx: number;
    vault: Vault;
    onTileClick: (transactionId: number) => void;
}

export function VaultProposedTransactionTile({
    idx,
    transaction,
    vault,
    onTileClick,
}: VaultProposedTransactionTileProps): JSX.Element {
    const totalWeight = vault.owners.reduce((prev, cur) => (prev += cur.weight), 0) ?? 0;
    const approved = transaction.status.approved
        .map((approved) => vault.owners.find((owner) => owner.address === approved))
        .filter((x) => !!x)
        .reduce((prev, cur) => (prev += cur.weight), 0);
    const rejected = transaction.status.rejected
        .map((rejected) => vault.owners.find((owner) => owner.address === rejected))
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
                <div className="flex w-full flex-col gap-2 md:flex-row">
                    <div className="flex flex-row gap-2">
                        <CardImage type={ImageType.BgSolid} shape={ImageShape.SquareRounded}>
                            {idx + 1}
                        </CardImage>
                        <div className="flex-grow-0">
                            <CardBody
                                title={'Transaction'}
                                subtitle={formatDate(
                                    transaction.declinedAt ||
                                        transaction.executedAt ||
                                        transaction.createdAt,
                                    ['day', 'month', 'year', 'hour', 'minute'],
                                )}
                                icon={
                                    transaction.declinedAt !== null ? (
                                        <CloseFilled />
                                    ) : (
                                        approved >= (vault.threshold ?? 0) && <CheckmarkFilled />
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
                            <span className="max-w-64 truncate md:max-w-96 md:whitespace-normal md:break-words">
                                {transaction.comment}
                            </span>
                        </div>
                    </div>
                    <div className="flex flex-shrink-0 justify-center gap-1">
                        {transaction.status.rejected.length > 0 && (
                            <Tooltip
                                text={`Rejection Weight: ${rejected}\nThreshold: ${totalWeight - (vault.threshold ?? 0) + 1}`}
                            >
                                <CircleGauge
                                    size={32}
                                    max={totalWeight - (vault.threshold ?? 0) + 1}
                                    cur={rejected}
                                    text={`${transaction.status.rejected.length}`}
                                    className="text-iota-error-40"
                                />
                            </Tooltip>
                        )}
                        {transaction.status.approved.length > 0 && (
                            <Tooltip
                                text={`Approval Weight: ${approved}\nThreshold: ${vault.threshold ?? 0}`}
                            >
                                <CircleGauge
                                    size={32}
                                    max={vault.threshold ?? 0}
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
