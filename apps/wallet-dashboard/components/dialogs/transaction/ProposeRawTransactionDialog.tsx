// Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

'use client';

import { ExplorerLink } from '@/components/ExplorerLink';
import { useDeprecatedTransactionObjects } from '@/hooks';
import { useStoreVaultTransaction } from '@/hooks/useStoreVaultTransaction';
import { Checkmark, Clock, Warning } from '@iota/apps-ui-icons';
import { Button, Dialog, Header, LoadingIndicator, Panel, TextArea } from '@iota/apps-ui-kit';
import {
    Collapsible,
    ProposedTransactionReceipt,
    toast,
    useDryRunTransaction,
    useRecognizedPackages,
    useTransactionSummary,
} from '@iota/core';
import { useCurrentAccount, useSignTransaction } from '@iota/dapp-kit';
import { Transaction } from '@iota/iota-sdk/transactions';
import { fromBase64, fromHex } from '@iota/iota-sdk/utils';
import { useEffect, useMemo, useState } from 'react';
import { DialogLayout, DialogLayoutBody, DialogLayoutFooter } from '../layout';

interface ProposeRawTransactionDialogProps {
    open: boolean;
    setOpen: (isOpen: boolean) => void;
    vaultId: number;
    userType: 'owner' | 'whitelisted';
}

type ParsedTransaction = {
    bytes: Uint8Array | null;
    transaction: Transaction | null;
    error: string | null;
};

function parseTransactionInput(value: string): ParsedTransaction {
    const trimmed = value.trim();
    if (!trimmed) {
        return { bytes: null, transaction: null, error: null };
    }

    const normalized = trimmed.replace(/\s+/g, '');
    const isHexWithPrefix = normalized.startsWith('0x');
    const hexCandidate = isHexWithPrefix ? normalized.slice(2) : normalized;
    const isHex = /^[0-9a-fA-F]+$/.test(hexCandidate);

    const errorObject: ParsedTransaction = {
        bytes: null,
        transaction: null,
        error: 'Invalid transaction bytes.',
    };
    const parsedTransactionFromBytes = (bytes: Uint8Array) => ({
        bytes,
        transaction: Transaction.from(bytes),
        error: null,
    });

    try {
        if (isHex) {
            if (hexCandidate.length % 2 !== 0) {
                return errorObject;
            }
            return parsedTransactionFromBytes(
                fromHex(isHexWithPrefix ? normalized : `0x${normalized}`),
            );
        } else {
            return parsedTransactionFromBytes(fromBase64(normalized));
        }
    } catch (error) {
        return errorObject;
    }
}

export function ProposeRawTransactionDialog({
    open,
    setOpen,
    vaultId,
    userType = 'owner',
}: ProposeRawTransactionDialogProps) {
    const [input, setInput] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [comment, setComment] = useState('');
    const parsed = useMemo(() => parseTransactionInput(input), [input]);
    const address = useCurrentAccount()?.address ?? '';
    const { mutate: signTransaction } = useSignTransaction();
    const { mutate: storeVaultTransaction } = useStoreVaultTransaction();
    const recognizedPackagesList = useRecognizedPackages();
    const { data: dryRunResponse, isLoading, isError } = useDryRunTransaction(parsed.transaction);
    const summary = useTransactionSummary({
        transaction: dryRunResponse,
        currentAddress: address,
        recognizedPackagesList,
    });
    const { deprecatedObjects, isLoading: isDeprecatedLoading } = useDeprecatedTransactionObjects(
        parsed.transaction,
    );

    const status = useMemo(() => {
        if (!parsed.transaction) {
            return {
                icon: <Clock width={18} height={18} />,
                text: 'Paste a transaction to run validations.',
            };
        }
        if (isLoading || isDeprecatedLoading) {
            return {
                icon: <Clock width={18} height={18} />,
                text: 'Running validation checks…',
            };
        }
        if (isError) {
            return {
                icon: <Warning width={18} height={18} />,
                text: 'Dry run failed. This transaction may fail.',
            };
        }
        if (deprecatedObjects.length > 0) {
            return {
                icon: <Warning width={18} height={18} />,
                text: 'Deprecated object versions detected. This transaction is likely to fail.',
            };
        }
        return {
            icon: <Checkmark width={18} height={18} />,
            text: 'Dry run succeeded.',
        };
    }, [parsed.transaction, isLoading, isDeprecatedLoading, isError, deprecatedObjects.length]);

    async function handleSubmit() {
        if (!parsed.transaction) {
            toast.error('Invalid transaction input.');
            return;
        }

        setIsSubmitting(true);
        if (type === 'owner') {
            signTransaction(
                { transaction: parsed.transaction },
                {
                    onSuccess: (signatureData) => {
                        const transactionBinary = fromBase64(signatureData.bytes);
                        const trimmedComment = comment.trim();
                        storeVaultTransaction({
                            vaultId,
                            transactionBinary,
                            signature: signatureData.signature,
                            comment: trimmedComment ? trimmedComment : undefined,
                        });
                        setOpen(false);
                        setInput('');
                        setComment('');
                    },
                    onError: (error) => {
                        toast.error('Signing failed.');
                        console.error(error);
                    },
                    onSettled: () => {
                        setIsSubmitting(false);
                    },
                },
            );
        } else {
            try {
                const transactionBinary = await parsed.transaction.build();
                storeVaultTransaction({
                    vaultId,
                    transactionBinary,
                    signature: undefined,
                    comment: comment.trim(),
                });
            } catch (error) {
                toast.error('Failed to propose transaction.');
                console.error(error);
            } finally {
                setIsSubmitting(false);
            }
        }
    }

    const isSubmitDisabled =
        !parsed.transaction || isLoading || isDeprecatedLoading || isSubmitting;

    useEffect(() => {
        if (!open) {
            setInput('');
            setIsSubmitting(false);
            setComment('');
        }
    }, [open]);

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogLayout>
                <Header title="Propose Transaction" onClose={() => setOpen(false)} />
                <DialogLayoutBody>
                    <div className="flex w-full flex-col gap-md">
                        <TextArea
                            label="Transaction bytes"
                            caption="Paste hex (0x...) or base64 encoded transaction bytes."
                            placeholder="0x..."
                            value={input}
                            onChange={(event) => setInput(event.target.value)}
                            errorMessage={parsed.error ?? undefined}
                            rows={6}
                            isResizeEnabled
                        />
                        <TextArea
                            label="Comment"
                            amountCounter={`${comment.length}/250`}
                            errorMessage={
                                comment.length >= 250 ? '250 character limit reached.' : undefined
                            }
                            placeholder="Add a comment (optional)"
                            value={comment}
                            onChange={(event) => setComment(event.target.value)}
                            rows={3}
                            isResizeEnabled
                            maxLength={250}
                        />
                        {parsed.transaction && (
                            <div className="w-full [&>div]:w-full">
                                <Collapsible title="Transaction Details" defaultOpen={true}>
                                    {dryRunResponse && summary ? (
                                        <ProposedTransactionReceipt
                                            txn={dryRunResponse}
                                            activeAddress={address}
                                            summary={summary}
                                            renderExplorerLink={ExplorerLink}
                                        />
                                    ) : (
                                        <div className="flex w-full justify-center py-4">
                                            {isError ? (
                                                <span className="text-sm text-iota-error-40">
                                                    Failed to dry run this transaction.
                                                </span>
                                            ) : (
                                                <LoadingIndicator />
                                            )}
                                        </div>
                                    )}
                                </Collapsible>
                            </div>
                        )}
                    </div>
                </DialogLayoutBody>
                <DialogLayoutFooter>
                    <Panel hasBorder={true} bgColor={'p-3'}>
                        <div className="flex w-full flex-col gap-2">
                            <div className="flex items-center gap-2 text-sm font-medium">
                                {status.icon}
                                <span>{status.text}</span>
                            </div>
                        </div>
                    </Panel>
                    <div className="mt-sm flex w-full [&_button]:w-full">
                        <Button
                            text={isSubmitting ? 'Proposing…' : 'Propose'}
                            onClick={handleSubmit}
                            disabled={isSubmitDisabled}
                        />
                    </div>
                </DialogLayoutFooter>
            </DialogLayout>
        </Dialog>
    );
}
