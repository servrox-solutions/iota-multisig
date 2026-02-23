// Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { submitVaultTransaction } from '@/actions/submitVaultTransaction';
import { useDeprecatedTransactionObjects } from '@/hooks';
import type { ProposedTransaction } from '@/hooks/useQueryVaultProposedTransactions';
import { useSetApproval } from '@/hooks/useSetApproval';
import { Vault } from '@/lib/types';
import { getProposedTransactionUserStatus } from '@/lib/utils';
import { getSubmitPayload } from '@/lib/utils/supabase/submit.payload';
import { Checkmark, Clock, Close, Warning } from '@iota/apps-ui-icons';
import { Button, ButtonType, Panel } from '@iota/apps-ui-kit';
import { toast } from '@iota/core';
import { useCurrentAccount, useSignPersonalMessage, useSignTransaction } from '@iota/dapp-kit';
import { useQueryClient } from '@tanstack/react-query';
import clsx from 'clsx';
import { useMemo, useTransition } from 'react';
import { StatusBadge, StatusBadgeTone } from '../badges/StatusBadge';
import { UserStatus } from './VaultProposedTransactionMetadata';

export type TransactionStaus = 'success' | 'warn' | 'pending';

export function VaultProposedTransactionActions({
    transaction,
    vault,
    isDryRunError,
}: {
    transaction: ProposedTransaction;
    vault: Vault;
    isDryRunError: boolean;
}) {
    const { mutate: signTransaction } = useSignTransaction();
    const { mutate: signMessage } = useSignPersonalMessage();
    const { mutate: setApproval } = useSetApproval();
    const queryClient = useQueryClient();
    const { deprecatedObjects } = useDeprecatedTransactionObjects(transaction.raw);
    const address = useCurrentAccount()?.address;
    const userStatus = getProposedTransactionUserStatus(transaction, address);
    const isWhitelisted = vault.whitelist.includes(address ?? '');

    const approvedWeight = transaction.status.approved
        .map((approved) => vault?.owners.find((owner) => owner.address === approved))
        .filter((x) => !!x)
        .reduce((prev, cur) => (prev += cur.weight), 0);
    const threshold = vault?.threshold ?? 0;
    const showSubmit = approvedWeight >= threshold;

    const [isSubmitting, startSubmit] = useTransition();
    const [isApproving, startApprove] = useTransition();
    console.log(isApproving);

    const approve = async () => {
        startApprove(
            () =>
                new Promise((resolve, reject) => {
                    signTransaction(
                        { transaction: transaction.raw },
                        {
                            onSuccess: async (signatureData) => {
                                setApproval({
                                    proposedTransactionId: transaction.id,
                                    signature: signatureData.signature,
                                    vaultId: vault.id,
                                });
                                resolve();
                            },
                            onError: (error) => {
                                toast.error('Signing failed.');
                                console.error(error);
                                resolve();
                            },
                        },
                    );
                }),
        );
    };

    const reject = async () =>
        setApproval({
            proposedTransactionId: transaction.id,
            signature: null,
            vaultId: vault.id,
        });

    const submit = async () =>
        signMessage(
            { message: getSubmitPayload(transaction.id) },
            {
                onSuccess: async (signatureData) => {
                    startSubmit(async () => {
                        try {
                            await submitVaultTransaction({
                                transactionId: transaction.id,
                                payloadBase64: signatureData.bytes,
                                signature: signatureData.signature,
                            });
                            queryClient.invalidateQueries({
                                queryKey: ['vault', vault.id, 'query-proposed-transactions'],
                            });
                            toast.success(`Transaction submitted.`);
                        } catch (err) {
                            console.error(err);
                            toast.error('Transaction failed.');
                        }
                    });
                },
                onError: (error) => {
                    toast.error('Signing failed.');
                    console.error(error);
                },
            },
        );

    const getStatusIcon = (status: UserStatus) => {
        switch (status) {
            case 'Approved':
                return <Checkmark />;
            case 'Rejected':
                return <Close />;
            case 'Pending':
                return <Clock />;
        }
    };

    const getStatusTone = (status: 'Approved' | 'Rejected' | 'Pending'): StatusBadgeTone => {
        switch (status) {
            case 'Approved':
                return 'success';
            case 'Rejected':
                return 'danger';
            case 'Pending':
                return 'neutral';
        }
    };

    const panelIcon: Record<TransactionStaus, React.ReactNode> = {
        ['warn']: <Warning width={18} height={18} />,
        ['success']: <Checkmark width={18} height={18} />,
        ['pending']: <Clock width={18} height={18} />,
    };

    const panelText = useMemo(() => {
        if (isDryRunError) {
            return 'Dry run failed. This transaction may fail.';
        }
        if (deprecatedObjects.length > 0) {
            return 'Deprecated object versions detected. This transaction is likely to fail.';
        }
        if (showSubmit) {
            return 'Ready to submit.';
        }
        return 'Awaiting approvals.';
    }, [isDryRunError, deprecatedObjects.length, showSubmit]);

    const transactionStatus: TransactionStaus = useMemo(() => {
        if (isDryRunError || deprecatedObjects.length > 0) {
            return 'warn';
        }
        if (showSubmit) {
            return 'success';
        }
        return 'pending';
    }, [isDryRunError, deprecatedObjects.length, showSubmit]);

    return (
        <Panel hasBorder={true} bgColor={'p-3'}>
            <div className={'flex w-full flex-col gap-3'}>
                <div className="flex items-center gap-2 text-sm font-medium">
                    {panelIcon[transactionStatus]}
                    <span>{panelText}</span>
                </div>
                {!isWhitelisted && showSubmit && (
                    <div className="flex w-full flex-col items-center justify-stretch gap-2">
                        <Button
                            text={isSubmitting ? 'Submitting…' : 'Submit'}
                            fullWidth={true}
                            type={ButtonType.Primary}
                            onClick={submit}
                            disabled={isSubmitting}
                        />
                    </div>
                )}
                {!isWhitelisted && !userStatus && (
                    <div className="flex w-full justify-stretch gap-2">
                        <>
                            <Button
                                text="Approve"
                                fullWidth={true}
                                type={ButtonType.Secondary}
                                onClick={approve}
                            />
                            <Button
                                text="Reject"
                                fullWidth={true}
                                type={ButtonType.Destructive}
                                onClick={reject}
                            />
                        </>
                    </div>
                )}
                {!isWhitelisted && (
                    <div className="flex items-center justify-between dark:text-iota-secondary-90">
                        <StatusBadge
                            label={userStatus}
                            icon={getStatusIcon(userStatus)}
                            tone={getStatusTone(userStatus)}
                        />
                        {transaction.declinedAt === null && (
                            <button
                                className={clsx('underline', isApproving && 'animate-pulse')}
                                disabled={isApproving}
                                onClick={userStatus === 'Approved' ? reject : approve}
                            >
                                {userStatus === 'Approved' ? 'Reject' : 'Approve'} instead
                            </button>
                        )}
                    </div>
                )}
            </div>
        </Panel>
    );
}
