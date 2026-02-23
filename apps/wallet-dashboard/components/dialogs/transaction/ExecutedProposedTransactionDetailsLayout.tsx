// Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { ExplorerLink } from '@/components/ExplorerLink';
import { VaultProposedTransactionMetadata } from '@/components/vault-proposed-transactions/VaultProposedTransactionMetadata';
import { VaultProposedTransactionOwners } from '@/components/vault-proposed-transactions/VaultProposedTransactionOwners';
import { ProposedTransaction } from '@/hooks/useQueryVaultProposedTransactions';
import { Vault } from '@/lib/types';
import { Button, Header, LoadingIndicator } from '@iota/apps-ui-kit';
import {
    Collapsible,
    ExplorerLinkType,
    TransactionReceipt,
    useGetTransactionWithSummary,
    useRecognizedPackages,
} from '@iota/core';
import { useCurrentAccount } from '@iota/dapp-kit';
import { DialogLayoutBody } from '../layout';

interface ExecutedProposedTransactionDialogDetailsProps {
    transaction: ProposedTransaction;
    vault: Vault;
    onClose: () => void;
}

export function ExecutedProposedTransactionDetailsLayout({
    transaction,
    vault,
    onClose,
}: ExecutedProposedTransactionDialogDetailsProps) {
    const address = useCurrentAccount()?.address ?? '';
    const recognizedPackagesList = useRecognizedPackages();
    const digest = transaction.digest ?? '';
    const {
        data: executedTransaction,
        summary,
        isError,
    } = useGetTransactionWithSummary(digest, address, undefined, recognizedPackagesList);
    return (
        <>
            <Header title="Executed Transaction" onClose={onClose} />
            <DialogLayoutBody>
                <div className="flex w-full flex-col items-center justify-center gap-2">
                    <VaultProposedTransactionMetadata {...transaction} />
                    <div className="w-full [&>*]:w-full">
                        <ExplorerLink
                            type={ExplorerLinkType.Transaction}
                            isExternal={true}
                            transactionID={digest}
                        >
                            <div className="w-full [&>*]:w-full">
                                <Button text="View on Explorer" />
                            </div>
                        </ExplorerLink>
                    </div>
                    <div className="w-full [&>div]:w-full">
                        <Collapsible title="Owner Signatures">
                            <VaultProposedTransactionOwners
                                transaction={transaction}
                                vault={vault}
                            />
                        </Collapsible>
                    </div>
                    <div className="w-full [&>div]:w-full">
                        <Collapsible title="Transaction Details">
                            {executedTransaction && summary ? (
                                <TransactionReceipt
                                    txn={executedTransaction}
                                    activeAddress={address}
                                    summary={summary}
                                    renderExplorerLink={ExplorerLink}
                                />
                            ) : (
                                <div className="flex w-full justify-center py-4">
                                    {isError ? (
                                        <span className="text-sm text-iota-error-40">
                                            Failed to load transaction details.
                                        </span>
                                    ) : (
                                        <LoadingIndicator />
                                    )}
                                </div>
                            )}
                        </Collapsible>
                    </div>
                </div>
            </DialogLayoutBody>
        </>
    );
}
