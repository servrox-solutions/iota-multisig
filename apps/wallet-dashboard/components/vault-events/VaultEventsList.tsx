// Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

'use client';

import { VaultAuditEvent, useQueryVaultEvents } from '@/hooks/useQueryVaultEvents';
import { LoadingIndicator, Panel } from '@iota/apps-ui-kit';
import { NoData, VirtualList } from '@iota/core';

interface VaultEventsListProps {
    vaultId: number;
    heightClassName?: string;
}

const EVENT_TYPE_LABELS: Record<string, string> = {
    TX_APPROVED: 'Transaction Approved',
    WHITELIST_ADDED: 'Whitelist Address Added',
    VAULT_CREATED: 'Vault Created',
    TX_PROPOSED: 'Transaction Proposed',
    OWNER_REJECTED: 'Owner Rejected Invitation',
    WHITELIST_REMOVED: 'Whitelist Address Removed',
    TX_REJECTED: 'Transaction Rejected',
    OWNER_ACCEPTED: 'Owner Accepted Invitation',
    VAULT_NAME_UPDATED: 'Vault Name Updated',
    TX_EXECUTED: 'Transaction Executed',
};

function toEventTypeLabel(eventType: string): string {
    return EVENT_TYPE_LABELS[eventType] ?? eventType;
}

function VaultEventTile({ event }: { event: VaultAuditEvent }): JSX.Element {
    const hasActor = !!event.actorAddress;
    const hasSubject = !!event.subjectAddress;
    const hasTransactionId = event.transactionId !== null;
    const hasMetadata = event.metadata !== null;

    return (
        <div className="mb-2">
            <Panel hasBorder={true} bgColor="bg-iota-neutral-100 p-2 dark:bg-iota-neutral-12">
                <div className="flex w-full flex-col gap-2">
                    <div className="flex items-center justify-between gap-2">
                        <span className="text-label-md text-iota-neutral-10 dark:text-iota-neutral-92">
                            {toEventTypeLabel(event.eventType)}
                        </span>
                        <span className="text-body-sm text-iota-neutral-40">
                            {event.createdAt.toLocaleString()}
                        </span>
                    </div>
                    {hasActor && (
                        <span className="truncate text-body-sm text-iota-neutral-40">
                            Actor: {event.actorAddress}
                        </span>
                    )}
                    {hasSubject && (
                        <span className="truncate text-body-sm text-iota-neutral-40">
                            Subject: {event.subjectAddress}
                        </span>
                    )}
                    {hasTransactionId && (
                        <span className="text-body-sm text-iota-neutral-40">
                            Transaction ID: {event.transactionId}
                        </span>
                    )}
                    {hasMetadata && (
                        <div className="flex flex-col gap-1">
                            <span className="text-body-sm text-iota-neutral-40">Metadata:</span>
                            <pre className="max-h-28 overflow-auto whitespace-pre-wrap break-words rounded bg-iota-neutral-92 px-2 py-1 text-[11px] leading-4 dark:bg-iota-neutral-20">
                                {JSON.stringify(event.metadata, null, 2)}
                            </pre>
                        </div>
                    )}
                </div>
            </Panel>
        </div>
    );
}

export function VaultEventsList({ vaultId, heightClassName }: VaultEventsListProps): JSX.Element {
    const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, error } =
        useQueryVaultEvents({
            vaultId,
            limit: 20,
            cursorId: undefined,
        });

    const events = data?.pages.flatMap((page) => page.events);

    if (error) {
        return <div>{error.message}</div>;
    }

    if (isLoading) {
        return <LoadingIndicator />;
    }

    if (!events || events.length === 0) {
        return <NoData message="No audit events found for this vault." />;
    }

    return (
        <div className={`${heightClassName ?? 'h-[520px]'} p-2`}>
            <VirtualList
                items={events}
                getItemKey={(event) => event.id}
                estimateSize={() => 150}
                render={(event) => <VaultEventTile event={event} />}
                fetchNextPage={fetchNextPage}
                hasNextPage={hasNextPage}
                isFetchingNextPage={isFetchingNextPage}
                heightClassName="h-full"
            />
        </div>
    );
}
