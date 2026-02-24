// Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0
'use client';

import { useQueryVaultProposedTransactionById } from '@/hooks/useQueryVaultProposedTransactionById';
import { Vault } from '@/lib/types';
import { Dialog, LoadingIndicator } from '@iota/apps-ui-kit';
import { useQueryState } from 'nuqs';
import { useMemo } from 'react';
import { DialogLayout } from '../dialogs/layout';
import { ProposedTransactionDetailsLayout } from '../dialogs/transaction/ProposedTransactionDetailsLayout';

export function VaultProposedTransactionDialogByQuery({ vault }: { vault: Vault }): JSX.Element {
    const [txParam, setTxParam] = useQueryState('tx');
    const openId = useMemo(() => {
        if (!txParam) {
            return null;
        }

        const parsed = Number(txParam);
        return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
    }, [txParam]);

    const { data: transaction, isLoading } = useQueryVaultProposedTransactionById({
        vaultId: vault.id,
        transactionId: openId,
    });

    const isOpen = Boolean(openId);

    if (!isOpen) {
        return <></>;
    }

    return (
        <Dialog
            open={isOpen}
            onOpenChange={(nextOpen) => {
                if (!nextOpen) {
                    setTxParam(null);
                }
            }}
        >
            <DialogLayout>
                {transaction ? (
                    <ProposedTransactionDetailsLayout
                        transaction={transaction}
                        vault={vault}
                        onClose={() => setTxParam(null)}
                    />
                ) : (
                    <div className="p-md">
                        {isLoading ? <LoadingIndicator /> : <span>Transaction not found.</span>}
                    </div>
                )}
            </DialogLayout>
        </Dialog>
    );
}
