// Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

'use client';

import {
    Card,
    CardBody,
    CardImage,
    CardType,
    Dialog,
    ImageShape,
    ImageType,
    Tooltip,
} from '@iota/apps-ui-kit';

import { ProposedTransaction } from '@/hooks/useQueryVaultProposedTransactions';
import { useVaultsByUser } from '@/hooks/useVaultsByUser';
import { CheckmarkFilled } from '@iota/apps-ui-icons';
import { CircleGauge } from '@iota/core';
import { useCurrentAccount } from '@iota/dapp-kit';
import { useState } from 'react';
import { DialogLayout } from '../dialogs/layout';
import { ProposedTransactionDetailsLayout } from '../dialogs/transaction/ProposedTransactionDetailsLayout';

interface VaultProposedTransactionTileProps {
    transaction: ProposedTransaction;
    idx: number;
    vaultId: number;
}

export function VaultProposedTransactionTile({
    idx,
    transaction,
    vaultId,
}: VaultProposedTransactionTileProps): JSX.Element {
    const account = useCurrentAccount();
    const address = account?.address;
    const [open, setOpen] = useState(false);

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

    function openDetailsDialog() {
        setOpen(true);
    }

    return (
        <>
            <Card
                testId="transaction-tile"
                type={CardType.Default}
                isHoverable
                onClick={openDetailsDialog}
            >
                <CardImage type={ImageType.BgSolid} shape={ImageShape.SquareRounded}>
                    {idx + 1}
                </CardImage>
                <div className="flex-grow-0">
                    <CardBody
                        title={'Transaction'}
                        subtitle={`${transaction.createdAt.toLocaleDateString()} ${transaction.createdAt.toLocaleTimeString()}`}
                        icon={approved >= (vault?.threshold ?? 0) && <CheckmarkFilled />}
                        tooltipText="Ready to be executed"
                    />
                </div>
                <div className="flex-grow">
                    <div className="flex flex-col text-xs">
                        <span className="whitespace-wrap max-w-96">{transaction.comment}</span>
                    </div>
                </div>
                <div className="flex flex-shrink-0 gap-1">
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
            </Card>
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogLayout>
                    {address && (
                        <ProposedTransactionDetailsLayout
                            transaction={transaction}
                            onClose={() => setOpen(false)}
                        />
                    )}
                </DialogLayout>
            </Dialog>
        </>
    );
}
