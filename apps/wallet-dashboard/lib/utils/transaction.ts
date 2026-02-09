// Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import {
    ExtendedTransaction,
    getProposedTransactionAction,
    getTransactionAction,
    ProposedExtendedTransaction,
    TransactionState,
} from '@iota/core';
import type { ProposedTransaction } from '@/hooks/useQueryVaultProposedTransactions';
import {
    DryRunTransactionBlockResponse,
    IotaTransactionBlockResponse,
} from '@iota/iota-sdk/client';
import { Transaction } from '@iota/iota-sdk/transactions';
import { parseTimestamp } from './time';

const getTransactionTransactionState = (tx: IotaTransactionBlockResponse): TransactionState => {
    const executionStatus = tx.effects?.status.status;
    const isTxFailed = !!tx.effects?.status.error;

    if (executionStatus == 'success') {
        return TransactionState.Successful;
    }

    if (isTxFailed) {
        return TransactionState.Failed;
    }

    return TransactionState.Pending;
};

export const getExtendedTransaction = (
    tx: IotaTransactionBlockResponse,
    address: string,
): ExtendedTransaction => {
    return {
        action: getTransactionAction(tx, address),
        state: getTransactionTransactionState(tx),
        timestamp: tx.timestampMs ? parseTimestamp(tx.timestampMs) : undefined,
        raw: tx,
    };
};

export const getProposedExtendedTransaction = (
    tx: DryRunTransactionBlockResponse,
    address: string,
): ProposedExtendedTransaction => {
    return {
        action: getProposedTransactionAction(tx, address),
        raw: tx,
    };
};

export type ProposedTransactionUserStatus = 'Approved' | 'Rejected' | 'Pending';

export function getProposedTransactionUserStatus(
    transaction: ProposedTransaction,
    address?: string | null,
): ProposedTransactionUserStatus {
    if (!address) return 'Pending';
    if (transaction.status.approved.includes(address)) return 'Approved';
    if (transaction.status.rejected.includes(address)) return 'Rejected';
    return 'Pending';
}

export function getTransactionObjectInputVersions(
    tx: ReturnType<Transaction['getData']>,
): Array<{ objectId: string; version: string }> {
    const entries: Array<{ objectId: string; version: string }> = [];

    if (tx.gasData?.payment) {
        for (const gas of tx.gasData.payment) {
            entries.push({ objectId: gas.objectId, version: String(gas.version) });
        }
    }

    for (const input of tx.inputs) {
        if (input.$kind !== 'Object') continue;

        const obj = input.Object;

        if ('ImmOrOwnedObject' in obj && obj.ImmOrOwnedObject) {
            entries.push({
                objectId: obj.ImmOrOwnedObject.objectId,
                version: String(obj.ImmOrOwnedObject.version),
            });
        }

        if ('Receiving' in obj && obj.Receiving) {
            entries.push({
                objectId: obj.Receiving.objectId,
                version: String(obj.Receiving.version),
            });
        }
    }

    return entries;
}
