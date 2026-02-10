// Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0
import { ProposedTransaction } from '@/hooks/useQueryVaultProposedTransactions';

import { ExecutedProposedTransactionDetailsLayout } from './ExecutedProposedTransactionDetailsLayout';
import { PendingProposedTransactionDetailsLayout } from './PendingProposedTransactionDetailsLayout';

interface ProposedTransactionDialogDetailsProps {
    transaction: ProposedTransaction;
    vaultId: number;
    onClose: () => void;
}

export function ProposedTransactionDetailsLayout({
    transaction,
    vaultId,
    onClose,
}: ProposedTransactionDialogDetailsProps) {
    if (transaction.digest) {
        return (
            <ExecutedProposedTransactionDetailsLayout
                transaction={transaction}
                vaultId={vaultId}
                onClose={onClose}
            />
        );
    }

    return (
        <PendingProposedTransactionDetailsLayout
            transaction={transaction}
            vaultId={vaultId}
            onClose={onClose}
        />
    );
}
