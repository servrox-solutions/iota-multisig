// Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { Vault } from '@/lib/types';
import { useCurrentAccount, useSignTransaction } from '@iota/dapp-kit';
import { Transaction } from '@iota/iota-sdk/transactions';
import { fromBase64 } from '@iota/iota-sdk/utils';
import { useCallback, useState } from 'react';
import { useStoreVaultTransaction } from './useStoreVaultTransaction';

interface ProposeTransactionParams {
    transaction: Transaction;
    comment?: string;
    onSuccess?: () => void;
    onError?: (error: unknown) => void;
}

interface UseProposeTransactionParams {
    vault: Vault;
}

export function useProposeTransaction({ vault }: UseProposeTransactionParams) {
    const currentAddress = useCurrentAccount()?.address;
    const { mutate: signTransaction } = useSignTransaction();
    const { mutateAsync: storeVaultTransaction } = useStoreVaultTransaction();
    const [isProposing, setIsProposing] = useState(false);
    const isWhitelistedUser = vault.whitelist.includes(currentAddress ?? '');

    const proposeTransaction = useCallback(
        async ({
            transaction,
            comment,
            onSuccess,
            onError,
        }: ProposeTransactionParams): Promise<boolean> => {
            if (isProposing) {
                return false;
            }

            setIsProposing(true);
            const trimmedComment = comment?.trim();

            try {
                if (isWhitelistedUser) {
                    const transactionBinary = await transaction.build();
                    await storeVaultTransaction({
                        vaultId: vault.id,
                        transactionBinary,
                        signature: undefined,
                        comment: trimmedComment,
                    });
                    onSuccess?.();
                    return true;
                }

                const signatureData = await new Promise<{ bytes: string; signature: string }>(
                    (resolve, reject) => {
                        signTransaction(
                            { transaction },
                            {
                                onSuccess: (data) =>
                                    resolve({
                                        bytes: data.bytes,
                                        signature: data.signature,
                                    }),
                                onError: (error) => reject(error),
                            },
                        );
                    },
                );

                await storeVaultTransaction({
                    vaultId: vault.id,
                    transactionBinary: fromBase64(signatureData.bytes),
                    signature: signatureData.signature,
                    comment: trimmedComment,
                });
                onSuccess?.();
                return true;
            } catch (error) {
                onError?.(error);
                return false;
            } finally {
                setIsProposing(false);
            }
        },
        [isProposing, isWhitelistedUser, signTransaction, storeVaultTransaction, vault.id],
    );

    return {
        isProposing,
        isWhitelistedUser,
        proposeTransaction,
    };
}
