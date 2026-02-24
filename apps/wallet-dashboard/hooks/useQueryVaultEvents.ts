// Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { Database } from '@/supabase/database.types';
import { useInfiniteQuery } from '@tanstack/react-query';
import { getVaultDefaultClient } from 'iota-vault-sdk';

export interface VaultAuditEvent {
    id: number;
    createdAt: Date;
    eventType: string;
    actorAddress: string | null;
    subjectAddress: string | null;
    transactionId: number | null;
    vaultId: number | null;
    metadata: Database['public']['Tables']['audit_events']['Row']['metadata'];
}

export interface VaultEventsPaginated {
    events: VaultAuditEvent[];
    hasNext: boolean;
    cursorId: number | null;
}

export interface VaultEventsQueryParam {
    vaultId: number;
    cursorId?: number;
    limit?: number;
}

const fetchVaultEvents = async ({
    vaultId,
    cursorId,
    limit = 20,
}: VaultEventsQueryParam): Promise<VaultEventsPaginated> => {
    const client = getVaultDefaultClient();
    if (!client) {
        throw new Error('Supabase client not available.');
    }

    let query = client
        .from('audit_events')
        .select('*')
        .eq('vault_id', vaultId)
        .order('id', { ascending: false })
        .limit(limit + 1);

    if (cursorId !== undefined) {
        query = query.lt('id', cursorId);
    }

    const { data, error } = await query;
    if (error) {
        throw new Error(`Could not fetch audit events for vault ${vaultId}.`);
    }

    const rows = (data as Database['public']['Tables']['audit_events']['Row'][] | null) ?? [];
    const hasNext = rows.length > limit;
    const limitedRows = hasNext ? rows.slice(0, -1) : rows;
    const newCursorId = limitedRows.length > 0 ? limitedRows[limitedRows.length - 1].id : null;

    return {
        events: limitedRows.map((row) => ({
            id: row.id,
            createdAt: new Date(row.created_at),
            eventType: row.event_type,
            actorAddress: row.actor_address,
            subjectAddress: row.subject_address,
            transactionId: row.transaction_id,
            vaultId: row.vault_id,
            metadata: row.metadata,
        })),
        hasNext,
        cursorId: newCursorId,
    };
};

export function useQueryVaultEvents({ vaultId, cursorId, limit }: VaultEventsQueryParam) {
    return useInfiniteQuery<VaultEventsPaginated>({
        initialPageParam: { vaultId, cursorId, limit },
        queryKey: ['vault', vaultId, 'query-events', limit],
        queryFn: async ({ pageParam }): Promise<VaultEventsPaginated> => {
            return fetchVaultEvents(pageParam as VaultEventsQueryParam);
        },
        staleTime: 1000,
        refetchInterval: 1000 * 60,
        getNextPageParam: (lastPage, _, lastPageParam) => {
            if (!lastPageParam) return undefined;
            return lastPage.hasNext
                ? {
                      vaultId: (lastPageParam as VaultEventsQueryParam).vaultId,
                      cursorId: lastPage.cursorId ?? undefined,
                      limit: (lastPageParam as VaultEventsQueryParam).limit,
                  }
                : undefined;
        },
    });
}
