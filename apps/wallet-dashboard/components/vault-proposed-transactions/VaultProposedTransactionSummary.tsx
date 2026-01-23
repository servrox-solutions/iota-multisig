// Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { BalanceChanges, ObjectChanges } from '@iota/core/src/components/cards';
import { GasSummary } from '@iota/core/src/components/gas';
import { RenderExplorerLink, TransactionSummaryType } from '@iota/core/src/types';

interface VaultTransactionSummaryProps {
    summary: TransactionSummaryType;
    activeAddress: string | null | undefined;
    isLoading?: boolean;
    isError?: boolean;
    showGasSummary?: boolean;
    renderExplorerLink: RenderExplorerLink;
}

export function VaultProposedTransactionSummary({
    summary,
    isLoading,
    isError,
    showGasSummary = false,
    activeAddress,
    renderExplorerLink,
}: VaultTransactionSummaryProps) {
    if (isError) return null;
    if (isLoading) return <div>Loading...</div>;
    if (!summary || (!summary.balanceChanges && !summary.objectSummary && !summary.gas))
        return null;

    return (
        <div className="flex flex-col gap-4">
            {summary.balanceChanges && (
                <div className="rounded-md border border-gray-600 p-2">
                    <h4 className="text-center font-semibold">Balance Changes</h4>
                    <BalanceChanges
                        changes={summary.balanceChanges}
                        renderExplorerLink={renderExplorerLink}
                    />
                </div>
            )}
            {summary.objectSummary && (
                <div className="rounded-md border border-gray-600 p-2">
                    <h4 className="text-center font-semibold">Changes</h4>
                    <ObjectChanges
                        changes={summary.objectSummary}
                        renderExplorerLink={renderExplorerLink}
                    />
                </div>
            )}
            {showGasSummary && summary.gas && (
                <GasSummary
                    gasSummary={summary.gas}
                    renderExplorerLink={renderExplorerLink}
                    activeAddress={activeAddress}
                />
            )}
        </div>
    );
}
