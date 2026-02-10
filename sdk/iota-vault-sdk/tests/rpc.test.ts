// Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it, vi } from 'vitest';

const { getVaultDefaultClientMock } = vi.hoisted(() => ({
    getVaultDefaultClientMock: vi.fn(),
}));

vi.mock('../src/client.js', () => ({
    getVaultDefaultClient: getVaultDefaultClientMock,
}));

import {
    addVaultWhitelistEntry,
    createVaultInvitation,
    getExecuteTransactionData,
    getVaultWhitelist,
    proposeTransaction,
    removeVaultWhitelistEntry,
    respondToVaultInvitation,
    setApproval,
} from '../src/rpc.js';

describe('rpc', () => {
    it('throws when supabase client is missing', async () => {
        getVaultDefaultClientMock.mockReturnValue(null);
        await expect(
            createVaultInvitation({ users: [], threshold: 1, name: 'vault', networks: [] }),
        ).rejects.toThrow('Supabase client not available');
    });

    it('calls create_vault_invitation with expected params', async () => {
        const rpcMock = vi.fn().mockResolvedValue({ data: [1, 2], error: null });
        getVaultDefaultClientMock.mockReturnValue({ rpc: rpcMock });

        const data = await createVaultInvitation({
            users: ['user-1'],
            threshold: 2,
            name: 'My Vault',
            networks: ['iota'],
        });

        expect(data).toEqual([1, 2]);
        expect(rpcMock).toHaveBeenCalledWith('create_vault_invitation', {
            p_users: ['user-1'],
            p_threshold: 2,
            p_name: 'My Vault',
            p_networks: ['iota'],
        });
    });

    it('handles rpc errors for invitation response', async () => {
        const rpcMock = vi.fn().mockResolvedValue({ data: null, error: new Error('nope') });
        getVaultDefaultClientMock.mockReturnValue({ rpc: rpcMock });

        await expect(respondToVaultInvitation({ vaultId: 5, status: 'accepted' })).rejects.toThrow(
            'Error storing public key for address.',
        );
    });

    it('proposes a transaction with optional fields', async () => {
        const rpcMock = vi.fn().mockResolvedValue({ data: [10], error: null });
        getVaultDefaultClientMock.mockReturnValue({ rpc: rpcMock });

        const data = await proposeTransaction({
            vaultId: 1,
            transactionData: 'payload',
        });

        expect(data).toEqual([10]);
        expect(rpcMock).toHaveBeenCalledWith('propose_transaction', {
            p_vault_id: 1,
            p_transaction_data: 'payload',
            p_comment: null,
            p_signature: null,
        });
    });

    it('throws when set_approval fails', async () => {
        const rpcMock = vi.fn().mockResolvedValue({ data: null, error: new Error('bad') });
        getVaultDefaultClientMock.mockReturnValue({ rpc: rpcMock });

        await expect(setApproval({ transactionId: 1 })).rejects.toThrow('bad');
    });

    it('returns execute transaction data', async () => {
        const maybeSingle = vi.fn().mockResolvedValue({
            data: {
                is_executable: true,
                network: 'iota',
                owners: [],
                signed_weight: 2,
                transaction_payload: 'payload',
                vault_threshold: 2,
            },
            error: null,
        });
        const rpcMock = vi.fn().mockReturnValue({ maybeSingle });
        getVaultDefaultClientMock.mockReturnValue({ rpc: rpcMock });

        const data = await getExecuteTransactionData({ proposedTransactionId: 12 });

        expect(data.network).toBe('iota');
        expect(rpcMock).toHaveBeenCalledWith('get_execute_transaction_data', {
            p_proposed_transaction_id: 12,
        });
    });

    it('throws when execute transaction data is missing', async () => {
        const maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
        const rpcMock = vi.fn().mockReturnValue({ maybeSingle });
        getVaultDefaultClientMock.mockReturnValue({ rpc: rpcMock });

        await expect(getExecuteTransactionData({ proposedTransactionId: 12 })).rejects.toThrow(
            'No transaction data available.',
        );
    });

    it('returns an empty whitelist when data is missing', async () => {
        const rpcMock = vi.fn().mockResolvedValue({ data: null, error: null });
        getVaultDefaultClientMock.mockReturnValue({ rpc: rpcMock });

        const data = await getVaultWhitelist({ vaultId: 4 });
        expect(data).toEqual([]);
    });

    it('throws on whitelist mutations when rpc fails', async () => {
        const rpcMock = vi.fn().mockResolvedValue({ data: null, error: new Error('nope') });
        getVaultDefaultClientMock.mockReturnValue({ rpc: rpcMock });

        await expect(addVaultWhitelistEntry({ vaultId: 1, address: 'addr' })).rejects.toThrow(
            'nope',
        );
        await expect(removeVaultWhitelistEntry({ vaultId: 1, address: 'addr' })).rejects.toThrow(
            'nope',
        );
    });
});
