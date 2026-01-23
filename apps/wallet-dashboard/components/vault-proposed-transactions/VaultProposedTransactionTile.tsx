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
    ImageType
} from '@iota/apps-ui-kit';

import { ProposedTransaction } from '@/hooks/useQueryVaultProposedTransactions';
import { getProposedExtendedTransaction } from '@/lib/utils';
import { Checkmark, CheckmarkFilled } from '@iota/apps-ui-icons';
import { useFormatCoin, useTransactionSummary } from '@iota/core/src/hooks';
import {
    checkIfIsTimelockedStaking,
    getTransactionAmountForTimelocked
} from '@iota/core/src/utils';
import { useCurrentAccount, useIotaClient } from '@iota/dapp-kit';
import { DryRunTransactionBlockResponse } from '@iota/iota-sdk/client';
import { IOTA_TYPE_ARG } from '@iota/iota-sdk/utils';
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

    const transactionSummary = useTransactionSummary({
        transaction: dryRunResponse ?? undefined,
        currentAddress: address,
        recognizedPackagesList: [],
    });

    const { isTimelockedStaking, isTimelockedUnstaking } = checkIfIsTimelockedStaking(
        dryRunResponse?.events,
    );

    const balanceChanges = transactionSummary?.balanceChanges;

    const [balance, coinType] = (() => {
        if ((isTimelockedStaking || isTimelockedUnstaking) && dryRunResponse?.events) {
            const balance = getTransactionAmountForTimelocked(
                dryRunResponse.events,
                isTimelockedStaking,
                isTimelockedUnstaking,
            );
            return [balance, IOTA_TYPE_ARG];
        } else {
            // Use any non-iota coin type if found, otherwise simply use IOTA
            const nonIotaCoinType = balanceChanges?.[address || '']
                ?.map((change) => change.coinType)
                .find((coinType) => coinType !== IOTA_TYPE_ARG);
            const coinType = nonIotaCoinType ?? IOTA_TYPE_ARG;
            const balanceChange = balanceChanges?.[address || '']?.find((change) => {
                return change.coinType === coinType;
            });
            const balance = balanceChange ? balanceChange.amount : 0;
            return [balance, coinType];
        }
    })();

    const [formatAmount, symbol] = useFormatCoin({ balance, coinType });

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
                        subtitle={`${transaction.created_at.toLocaleDateString()} ${transaction.created_at.toLocaleTimeString()}`}
                        icon={<CheckmarkFilled />}
                        tooltipText="Ready to be executed"
                    />
                </div>
                <div className="flex-grow">
                    <div className="flex flex-col text-xs">
                        <span className="max-w-96 whitespace-wrap">
                            {transaction.comment}
                        </span>
                    </div>
                </div>
                <div className="flex-shrink-0 flex flex-col gap-1">
                    <div className="flex gap-2 flex-shrink-0 px-2 text-xs items-center rounded-full bg-iota-tertiary-70 p-1">
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
                            transaction={getProposedExtendedTransaction(dryRunResponse, address)}
                            onClose={() => setOpen(false)}
                        />
                    )}
                </DialogLayout>
            </Dialog>
        </>
    );
}
