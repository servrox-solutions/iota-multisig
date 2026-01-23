// Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0
'use client';

import { Panel, Title } from '@iota/apps-ui-kit';
import { VaultProposedTransactionsList } from './VaultProposedTransactionsList';

export interface VaultTransactionsOverviewProps {
    vaultId: number;
}

export function VaultProposedTransactionsOverview({ vaultId }: VaultTransactionsOverviewProps) {
    return (
        <Panel>
            <Title title="Proposed" />
            <div
                className="h-full max-h-[400px] flex-1 overflow-y-auto px-sm pb-md  pt-sm sm:max-h-none"
                data-testid="home-page-activity-section"
            >
                <VaultProposedTransactionsList vaultId={vaultId} heightClassName="h-full" />
            </div>
        </Panel>
    );
}
