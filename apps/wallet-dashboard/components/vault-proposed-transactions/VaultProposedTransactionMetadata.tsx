// Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { ProposedTransaction } from '@/hooks/useQueryVaultProposedTransactions';
import { Clock, Person } from '@iota/apps-ui-icons';
import { Panel, Tooltip } from '@iota/apps-ui-kit';
import { NamedAddress } from '@iota/core';

export function VaultProposedTransactionMetadata({
    createdAt,
    comment,
    proposedBy,
}: Omit<ProposedTransaction, 'raw' | 'id' | 'status'>) {
    return (
        <div className="flex w-full flex-col gap-1 overflow-y-auto overflow-x-hidden">
            <Panel bgColor="bg-iota-neutral-96 dark:bg-iota-neutral-12">
                <div className="flex flex-col gap-2 p-2">
                    <div className="flex justify-between">
                        <Tooltip text={'Creation Date'}>
                            <div className="flex items-center gap-1">
                                <Clock />
                                <span>
                                    {createdAt.toLocaleDateString()}{' '}
                                    {createdAt.toLocaleTimeString()}
                                </span>
                            </div>
                        </Tooltip>

                        <Tooltip text={'Creator'}>
                            <div className="flex items-center gap-1">
                                <Person width={14} height={14} />
                                <NamedAddress address={proposedBy} />
                            </div>
                        </Tooltip>
                    </div>
                    <div className="dark:text-iota-secondary-90">
                        <span className="font-bold">Comment:</span>{' '}
                        <span>{comment ? comment : '—'}</span>
                    </div>
                </div>
            </Panel>
        </div>
    );
}
