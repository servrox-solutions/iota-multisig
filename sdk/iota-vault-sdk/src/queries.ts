// Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { getVaultDefaultClient } from './client.js';

export interface VaultsOfCurrentUserRow {
    id: number;
    name: string;
    threshold: number | null;
    owners: unknown;
    creator_address: string | null;
    network: string | null;
}

export interface ProposedTransactionsOfCurrentUserRow {
    id: number;
    vault_id: number;
    transaction_payload: string | null;
    created_at: string | null;
    comment: string | null;
    proposed_by: string | null;
    executed_by: string | null;
    transaction_digest: string | null;
    executed_at: string | null;
    declined_at: string | null;
    approvals: string[] | null;
    rejections: string[] | null;
    pending: string[] | null;
}

export type ProposedTransactionFilter = 'pending' | 'executed' | 'declined';

export interface ProposedTransactionsQueryParams {
    vaultId: number;
    cursorId?: number;
    limit?: number;
    filter?: ProposedTransactionFilter;
}

function requireClient() {
    const client = getVaultDefaultClient();
    if (!client) throw new Error('Supabase client not available.');
    return client;
}

export async function getPublicKeyByAddress(address: string): Promise<string | null> {
    const client = requireClient();
    const res = await client.from('owners').select('public_key').eq('address', address).single();
    if (res?.error) {
        throw new Error('Could not fetch public key for address.');
    }
    if (!res?.data) return null;
    return res.data.public_key as string | null;
}

export async function upsertVaultOwner(params: {
    address: string;
    publicKey?: string;
}): Promise<void> {
    const client = requireClient();
    const res = await client.from('owners').upsert({
        address: params.address,
        public_key: params.publicKey,
    });
    if (res?.error) {
        console.error(res.error);
        throw new Error('Error storing public key for address.');
    }
}

export async function getVaultsOfCurrentUser(): Promise<VaultsOfCurrentUserRow[] | null> {
    const client = requireClient();
    // This view automatically filters by the user's address from the JWT
    const res = await client.from('vaults_of_current_user').select('*');
    if (res?.error) {
        throw new Error('Could not fetch vaults for user.');
    }
    return (res.data as VaultsOfCurrentUserRow[] | null) ?? null;
}

export async function getProposedTransactionsOfCurrentUser(
    params: ProposedTransactionsQueryParams,
): Promise<{
    rows: ProposedTransactionsOfCurrentUserRow[];
    hasNext: boolean;
    cursorId: number | null;
}> {
    const client = requireClient();
    const { vaultId, cursorId, limit = 10, filter = 'pending' } = params;

    let query = client
        .from('proposed_transactions_of_current_user')
        .select('*')
        .eq('vault_id', vaultId)
        .limit(limit + 1);

    if (filter === 'executed') {
        query = query.not('transaction_digest', 'is', null).order('executed_at', {
            ascending: false,
        });
    }

    if (filter === 'declined') {
        query = query.not('declined_at', 'is', null).order('declined_at', {
            ascending: false,
        });
    }

    if (filter === 'pending') {
        query = query
            .is('transaction_digest', null)
            .is('declined_at', null)
            .order('created_at', {
                ascending: false,
            });
    }

    if (cursorId !== undefined) {
        query = query.lt('id', cursorId);
    }

    const result = await query;
    if (result?.error) {
        throw new Error(`Could not fetch proposed transactions for vault ${vaultId}.`);
    }

    const rows = (result.data as ProposedTransactionsOfCurrentUserRow[]) ?? [];
    const hasNext = rows.length > limit;
    const limitedRows = hasNext ? rows.slice(0, -1) : rows;
    const newCursorId =
        limitedRows.length > 0 ? limitedRows[limitedRows.length - 1].id : null;

    return {
        rows: limitedRows,
        hasNext,
        cursorId: newCursorId,
    };
}
