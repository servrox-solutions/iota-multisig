// Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { getVaultDefaultClient } from './client.js';

export interface ExecuteTransactionDataRow {
    is_executable: boolean;
    network: string;
    owners: unknown;
    signed_weight: number;
    transaction_payload: string;
    vault_threshold: number;
}

export interface VaultWhitelistEntry {
    address: string;
    created_at: string;
}

function requireClient() {
    const client = getVaultDefaultClient();
    if (!client) throw new Error('Supabase client not available.');
    return client;
}

export async function createVaultInvitation(
    params: {
        users: unknown;
        threshold: number;
        name: string;
        networks: string[];
    },
    client = requireClient(),
): Promise<number[]> {
    const res = await client.rpc('create_vault_invitation', {
        p_users: params.users,
        p_threshold: params.threshold,
        p_name: params.name,
        p_networks: params.networks,
    });
    if (res?.error) {
        console.error(res.error);
        throw new Error(res.error.message);
    }
    return res.data as number[];
}

export async function respondToVaultInvitation(
    params: {
        vaultId: number;
        status: string;
    },
    client = requireClient(),
): Promise<void> {
    const res = await client.rpc('respond_to_vault_invitation', {
        p_vault_id: params.vaultId,
        p_status: params.status,
    });
    if (res?.error) {
        console.error(res.error);
        throw new Error('Error storing public key for address.');
    }
}

export async function proposeTransaction(
    params: {
        vaultId: number;
        transactionData: string;
        comment?: string | null;
        signature?: string | null;
    },
    client = requireClient(),
): Promise<number[]> {
    const res = await client.rpc('propose_transaction', {
        p_vault_id: params.vaultId,
        p_transaction_data: params.transactionData,
        p_comment: params.comment ?? null,
        p_signature: params.signature ?? null,
    });
    if (res?.error) {
        console.error(res.error);
        throw new Error(res.error.message);
    }
    return res.data as number[];
}

export async function setApproval(
    params: {
        transactionId: number;
        signature?: string | null;
    },
    client = requireClient(),
): Promise<void> {
    const res = await client.rpc('set_approval', {
        p_transaction_id: params.transactionId,
        p_signature: params.signature ?? null,
    });
    if (res?.error) {
        console.error(res.error);
        throw new Error(res.error.message);
    }
}

export async function getExecuteTransactionData(
    params: {
        proposedTransactionId: number;
    },
    client = requireClient(),
): Promise<ExecuteTransactionDataRow> {
    const { data, error } = await client
        .rpc('get_execute_transaction_data', {
            p_proposed_transaction_id: params.proposedTransactionId,
        })
        .maybeSingle();

    if (error) {
        throw error;
    }
    if (!data) {
        throw new Error('No transaction data available.');
    }

    return data as ExecuteTransactionDataRow;
}

export async function addVaultWhitelistEntry(
    params: {
        vaultId: number;
        address: string;
    },
    client = requireClient(),
): Promise<void> {
    const res = await client.rpc('add_vault_whitelist_address', {
        p_vault_id: params.vaultId,
        p_whitelist_address: params.address,
    });

    if (res?.error) {
        console.error(res.error);
        throw new Error(res.error.message);
    }
}

export async function removeVaultWhitelistEntry(
    params: {
        vaultId: number;
        address: string;
    },
    client = requireClient(),
): Promise<void> {
    const res = await client.rpc('remove_vault_whitelist_address', {
        p_vault_id: params.vaultId,
        p_whitelist_address: params.address,
    });

    if (res?.error) {
        console.error(res.error);
        throw new Error(res.error.message);
    }
}
