// Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { ProposedTransaction } from '@/hooks/useQueryVaultProposedTransactions';
import { CheckmarkFilled, Clock, Person } from '@iota/apps-ui-icons';
import { Panel, Tooltip } from '@iota/apps-ui-kit';
import { formatDate, NamedAddress } from '@iota/core';

export type UserStatus = 'Approved' | 'Rejected' | 'Pending';

export function VaultProposedTransactionMetadata({
    createdAt,
    comment,
    proposedBy,
    executedBy,
    executedAt,
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
                                    {formatDate(Number(createdAt), [
                                        'day',
                                        'month',
                                        'year',
                                        'hour',
                                        'minute',
                                    ])}
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
                    {executedBy && executedAt && (
                        <div className="flex justify-between">
                            <Tooltip text={'Executing owner'}>
                                <div className="flex items-center gap-1">
                                    <CheckmarkFilled width={14} height={14} />
                                    <NamedAddress address={executedBy} />
                                </div>
                            </Tooltip>
                            <Tooltip text={'Execution date'}>
                                <div>
                                    {formatDate(Number(executedAt), [
                                        'day',
                                        'month',
                                        'year',
                                        'hour',
                                        'minute',
                                    ])}
                                </div>
                            </Tooltip>
                        </div>
                    )}

                    <div className="dark:text-iota-secondary-90">
                        <span className="font-bold">Comment:</span>{' '}
                        <span className="inline-block max-w-full whitespace-normal break-words">
                            {comment ? comment : '—'}
                        </span>
                    </div>
                </div>
            </Panel>
        </div>
    );
}
