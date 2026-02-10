// Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0
import { ExplorerLink } from '@/components/ExplorerLink';
import { VaultProposedTransactionActions } from '@/components/vault-proposed-transactions/VaultProposedTransactionActions';
import { VaultProposedTransactionMetadata } from '@/components/vault-proposed-transactions/VaultProposedTransactionMetadata';
import { VaultProposedTransactionOwners } from '@/components/vault-proposed-transactions/VaultProposedTransactionOwners';
import { ProposedTransaction } from '@/hooks/useQueryVaultProposedTransactions';
import { useVaultsByUser } from '@/hooks/useVaultsByUser';

import { Header, LoadingIndicator } from '@iota/apps-ui-kit';
import {
    Collapsible,
    ProposedTransactionReceipt,
    useDryRunTransaction,
    useRecognizedPackages,
    useTransactionSummary,
} from '@iota/core';
import { useCurrentAccount } from '@iota/dapp-kit';
import { DialogLayoutBody } from '../layout';

interface ProposedTransactionDialogDetailsProps {
    transaction: ProposedTransaction;
    vaultId: number;
    onClose: () => void;
}

export function PendingProposedTransactionDetailsLayout({
    transaction,
    vaultId,
    onClose,
}: ProposedTransactionDialogDetailsProps) {
    const address = useCurrentAccount()?.address ?? '';
    const {
        data: dryRunResponse,
        isLoading: isDryRunning,
        isError,
    } = useDryRunTransaction(transaction.raw);
    const recognizedPackagesList = useRecognizedPackages();
    const summary = useTransactionSummary({
        transaction: dryRunResponse,
        currentAddress: address,
        recognizedPackagesList,
    });
    const { data: vaults } = useVaultsByUser(address);
    const vault = vaults?.find((x) => x.id === vaultId);
    return (
        <>
            <Header title="Proposed Transaction" onClose={onClose} />
            <DialogLayoutBody>
                <div className="flex w-full flex-col items-center justify-center gap-2">
                    <>
                        <VaultProposedTransactionMetadata {...transaction} />
                        {vault && (
                            <VaultProposedTransactionActions
                                transaction={transaction}
                                vault={vault}
                                isDryRunError={isError}
                            />
                        )}

                        <div className="w-full [&>div]:w-full">
                            <Collapsible title="Owner Signatures">
                                <div className="pt-2">
                                    <VaultProposedTransactionOwners
                                        transaction={transaction}
                                        vaultId={vaultId}
                                    />
                                </div>
                            </Collapsible>
                        </div>

                        <div className="w-full [&>div]:w-full">
                            <Collapsible title="Transaction Details">
                                <div className="pt-2">
                                    {dryRunResponse && summary && (
                                        <ProposedTransactionReceipt
                                            txn={dryRunResponse}
                                            activeAddress={address}
                                            summary={summary}
                                            renderExplorerLink={ExplorerLink}
                                        />
                                    )}
                                </div>
                                {isDryRunning && <LoadingIndicator />}
                            </Collapsible>
                        </div>
                    </>
                </div>
            </DialogLayoutBody>
        </>
    );
}
