// Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0
import { ProposedTransaction } from '@/hooks/useQueryVaultProposedTransactions';
import { Vault } from '@/lib/types';

import { ExecutedProposedTransactionDetailsLayout } from './ExecutedProposedTransactionDetailsLayout';
import { PendingProposedTransactionDetailsLayout } from './PendingProposedTransactionDetailsLayout';

interface ProposedTransactionDialogDetailsProps {
    transaction: ProposedTransaction;
    vault: Vault;
    onClose: () => void;
}

export function ProposedTransactionDetailsLayout({
    transaction,
    vault,
    onClose,
}: ProposedTransactionDialogDetailsProps) {
    if (transaction.digest) {
        return (
            <ExecutedProposedTransactionDetailsLayout
                transaction={transaction}
                vault={vault}
                onClose={onClose}
            />
        );
    }

    return (
        <PendingProposedTransactionDetailsLayout
            transaction={transaction}
            vault={vault}
            onClose={onClose}
        />
    );
}
