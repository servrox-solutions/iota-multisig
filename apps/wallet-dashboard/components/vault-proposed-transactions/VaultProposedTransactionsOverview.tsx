// Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0
'use client';

import { ProposedTransactionFilter } from '@/hooks/useQueryVaultProposedTransactions';
import { Vault } from '@/lib/types';
import { Chip, Panel, Title } from '@iota/apps-ui-kit';
import { useState } from 'react';
import { VaultProposedTransactionsList } from './VaultProposedTransactionsList';

export interface VaultTransactionsOverviewProps {
    vault: Vault;
}

export function VaultProposedTransactionsOverview({ vault }: VaultTransactionsOverviewProps) {
    const [filter, setFilter] = useState<ProposedTransactionFilter>('pending');

    return (
        <Panel>
            <Title title="Proposed" />
            <div className="flex flex-row gap-xs px-sm pt-sm">
                <Chip
                    label="Pending"
                    selected={filter === 'pending'}
                    onClick={() => setFilter('pending')}
                />
                <Chip
                    label="Executed"
                    selected={filter === 'executed'}
                    onClick={() => setFilter('executed')}
                />
                <Chip
                    label="Declined"
                    selected={filter === 'declined'}
                    onClick={() => setFilter('declined')}
                />
            </div>
            <div
                className="h-full max-h-[400px] flex-1 overflow-y-auto px-sm pb-md  pt-sm sm:max-h-none"
                data-testid="home-page-activity-section"
            >
                <VaultProposedTransactionsList
                    vault={vault}
                    heightClassName="h-full"
                    filter={filter}
                />
            </div>
        </Panel>
    );
}
