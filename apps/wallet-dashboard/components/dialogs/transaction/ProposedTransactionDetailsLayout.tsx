// Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0
import { submitVaultTransaction } from '@/actions/submitVaultTransaction';
import { ExplorerLink } from '@/components/ExplorerLink';
import { VaultProposedTransactionMetadata } from '@/components/vault-proposed-transactions/VaultProposedTransactionMetadata';
import { useSetApproval } from '@/hooks';
import { ProposedTransaction } from '@/hooks/useQueryVaultProposedTransactions';
import { getSubmitPayload } from '@/lib/utils/supabase/submit.payload';
import { Warning } from '@iota/apps-ui-icons';
import { Header, LoadingIndicator, Panel } from '@iota/apps-ui-kit';
import {
    ProposedTransactionReceipt,
    toast,
    useDryRunTransaction,
    useRecognizedPackages,
    useTransactionSummary,
    VaultProposedTransactionActions,
} from '@iota/core';
import { useCurrentAccount, useSignPersonalMessage, useSignTransaction } from '@iota/dapp-kit';
import { DialogLayoutBody } from '../layout';

interface ProposedTransactionDialogDetailsProps {
    transaction: ProposedTransaction;
    onClose: () => void;
}
export function ProposedTransactionDetailsLayout({
    transaction,
    onClose,
}: ProposedTransactionDialogDetailsProps) {
    const address = useCurrentAccount()?.address ?? '';
    const {
        data: dryRunResponse,
        isLoading: isDryRunning,
        isError,
        error,
    } = useDryRunTransaction(transaction.raw);
    const recognizedPackagesList = useRecognizedPackages();
    const summary = useTransactionSummary({
        transaction: dryRunResponse,
        currentAddress: address,
        recognizedPackagesList,
    });
    const { mutate: signTransaction } = useSignTransaction();
    const { mutate: signMessage } = useSignPersonalMessage();
    const { mutate: setApproval } = useSetApproval();

    const handleTransactionAction = async (action: 'approve' | 'reject' | 'submit') => {
        if (action === 'approve') {
            await signTransaction({ transaction: transaction.raw },
                {
                    onSuccess: async (signatureData) => {
                        setApproval({
                            proposedTransactionId: transaction.id,
                            signature: signatureData.signature,
                        });
                    },
                    onError: (error) => {
                        toast.error('Signing failed.');
                        console.error(error);
                    },
                });
        } else if (action === 'reject') {
            setApproval({
                proposedTransactionId: transaction.id,
                signature: null,
            });
        } else {
            await signMessage(
                { message: getSubmitPayload(transaction.id) },
                {
                    onSuccess: async (signatureData) => {
                        const res = await submitVaultTransaction({
                            transactionId: transaction.id,
                            payloadBase64: signatureData.bytes,
                            signature: signatureData.signature,
                        });

                        toast.success(`Tx ID: `);
                    },
                    onError: (error) => {
                        toast.error('Submit failed.');
                        console.error(error);
                    },
                },
            );
        }
    };

    return (
        <>
            <Header title="Proposed Transaction" onClose={onClose} />
            <DialogLayoutBody>
                <div className="flex w-full flex-col items-center justify-center gap-2">
                    {isError && (
                        <Panel bgColor="bg-iota-error-40 p-4">
                            <span className="flex items-center gap-1 text-white">
                                <Warning />
                                {error.message}
                            </span>
                        </Panel>
                    )}
                    {dryRunResponse && summary && (
                        <>
                            <VaultProposedTransactionMetadata
                                createdAt={transaction.createdAt}
                                comment={transaction.comment}
                                proposedBy={transaction.proposedBy}
                            />
                            <VaultProposedTransactionActions
                                onAction={(action) => handleTransactionAction(action)}
                            />
                            <ProposedTransactionReceipt
                                txn={dryRunResponse}
                                activeAddress={address}
                                summary={summary}
                                renderExplorerLink={ExplorerLink}
                            />
                        </>
                    )}
                    {isDryRunning && <LoadingIndicator />}
                </div>
            </DialogLayoutBody>
        </>
    );
}
