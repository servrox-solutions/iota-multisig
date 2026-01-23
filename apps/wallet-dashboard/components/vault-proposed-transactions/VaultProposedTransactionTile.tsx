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
} from '@iota/apps-ui-kit';

import { ProposedTransaction } from '@/hooks/useQueryVaultProposedTransactions';
import { getProposedExtendedTransaction } from '@/lib/utils';
import { Checkmark, CheckmarkFilled } from '@iota/apps-ui-icons';
import { useCurrentAccount, useIotaClient } from '@iota/dapp-kit';
import { DryRunTransactionBlockResponse } from '@iota/iota-sdk/client';
import { useEffect, useState } from 'react';
import { DialogLayout } from '../dialogs/layout';
import { ProposedTransactionDetailsLayout } from '../dialogs/transaction/ProposedTransactionDetailsLayout';

interface VaultProposedTransactionTileProps {
    transaction: ProposedTransaction;
    idx: number;
}

export function VaultProposedTransactionTile({
    idx,
    transaction,
}: VaultProposedTransactionTileProps): JSX.Element {
    const account = useCurrentAccount();
    const address = account?.address;
    const [open, setOpen] = useState(false);
    const client = useIotaClient();
    const [dryRunResponse, setDryRunResponse] = useState<DryRunTransactionBlockResponse | null>(
        null,
    );

    useEffect(() => {
        const dryRun = async () => {
            const transactionBlock = await transaction.raw.build();
            const res = await client.dryRunTransactionBlock({ transactionBlock });
            setDryRunResponse(res);
        };
        dryRun();
    }, [transaction, client]);

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
                        icon={<CheckmarkFilled />}
                        tooltipText="Ready to be executed"
                    />
                </div>
                <div className="flex-grow">
                    <div className="flex flex-col text-xs">
                        <span className="whitespace-wrap max-w-96">{transaction.comment}</span>
                    </div>
                </div>
                <div className="flex flex-shrink-0 flex-col gap-1">
                    <div className="flex flex-shrink-0 items-center gap-2 rounded-full bg-iota-tertiary-70 p-1 px-2 text-xs">
                        2<Checkmark width={18} height={18} />
                    </div>
                    {/* <div className="flex gap-2 flex-shrink-0 px-2 text-xs items-center rounded-full bg-iota-error-30 p-1">
                        2<Close width={18} height={18} />
                    </div> */}
                </div>
            </Card>
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogLayout>
                    {dryRunResponse && address && (
                        <ProposedTransactionDetailsLayout
                            raw={transaction}
                            transaction={getProposedExtendedTransaction(dryRunResponse, address)}
                            onClose={() => setOpen(false)}
                        />
                    )}
                </DialogLayout>
            </Dialog>
        </>
    );
}
