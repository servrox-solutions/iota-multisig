// Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { GasFees } from '@iota/core/src/components/gas';
import { StakeTransactionDetails } from '@iota/core/src/components/transaction/details';
import { UnstakeTransactionInfo } from '@iota/core/src/components/transaction/info';
import { STAKING_REQUEST_EVENT, UNSTAKING_REQUEST_EVENT } from '@iota/core/src/constants';
import type { useTransactionSummary } from '@iota/core/src/hooks';
import { RenderExplorerLink } from '@iota/core/src/types';
import { DryRunTransactionBlockResponse } from '@iota/iota-sdk/client';
import { VaultProposedTransactionSummary } from './VaultProposedTransactionSummary';

interface ProposedTransactionReceiptProps {
    txn: DryRunTransactionBlockResponse;
    activeAddress: string | null;
    summary: Exclude<ReturnType<typeof useTransactionSummary>, null>;
    renderExplorerLink: RenderExplorerLink;
}

export function ProposedTransactionReceipt({
    txn,
    activeAddress,
    summary,
    renderExplorerLink,
}: ProposedTransactionReceiptProps) {
    const { events } = txn;

    const isSender = txn.input.sender === activeAddress;

    const stakeTypeTransaction = events?.find(({ type }) => type === STAKING_REQUEST_EVENT);
    const unstakeTypeTransaction = events?.find(({ type }) => type === UNSTAKING_REQUEST_EVENT);
    return (
        <div className="flex flex-col gap-md overflow-y-auto overflow-x-hidden">
            {stakeTypeTransaction || unstakeTypeTransaction ? (
                <>
                    {stakeTypeTransaction ? (
                        <StakeTransactionDetails
                            activeAddress={activeAddress}
                            events={events ?? []}
                            gasSummary={summary?.gas}
                            renderExplorerLink={() => <></>}
                        />
                    ) : null}

                    {unstakeTypeTransaction ? (
                        <UnstakeTransactionInfo
                            activeAddress={activeAddress}
                            events={events ?? []}
                            gasSummary={summary?.gas}
                            renderExplorerLink={() => <></>}
                        />
                    ) : null}
                </>
            ) : (
                <>
                    <VaultProposedTransactionSummary
                        summary={summary}
                        renderExplorerLink={renderExplorerLink}
                        activeAddress={activeAddress}
                    />
                    {isSender && (
                        <GasFees
                            gasSummary={summary?.gas}
                            renderExplorerLink={() => <></>}
                            activeAddress={activeAddress}
                        />
                    )}
                </>
            )}
        </div>
    );
}
