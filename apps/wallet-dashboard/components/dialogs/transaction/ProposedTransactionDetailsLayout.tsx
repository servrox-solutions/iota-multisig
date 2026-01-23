// Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { ExplorerLink } from '@/components/ExplorerLink';
import { Header, LoadingIndicator } from '@iota/apps-ui-kit';
import {
    ProposedExtendedTransaction,
    ProposedTransactionReceipt,
    useRecognizedPackages,
    useTransactionSummary,
} from '@iota/core';
import { useCurrentAccount } from '@iota/dapp-kit';
import { DialogLayoutBody } from '../layout';

interface ProposedTransactionDialogDetailsProps {
    transaction: ProposedExtendedTransaction;
    onClose: () => void;
}
export function ProposedTransactionDetailsLayout({
    transaction,
    onClose,
}: ProposedTransactionDialogDetailsProps) {
    const address = useCurrentAccount()?.address ?? '';

    const recognizedPackagesList = useRecognizedPackages();
    const summary = useTransactionSummary({
        transaction: transaction.raw,
        currentAddress: address,
        recognizedPackagesList,
    });

    if (!summary) return <LoadingIndicator />;

    return (
        <>
            <Header title="Proposed Transaction" onClose={onClose} />
            <DialogLayoutBody>
                <ProposedTransactionReceipt
                    txn={transaction.raw}
                    activeAddress={address}
                    summary={summary}
                    renderExplorerLink={ExplorerLink}
                />
            </DialogLayoutBody>
        </>
    );
}
