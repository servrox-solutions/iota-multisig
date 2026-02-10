// Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { Dialog, DialogContent, DialogPosition } from '@iota/apps-ui-kit';
import {
    createValidationSchemaSendTokenForm,
    Feature,
    SendTokenFormValues,
    sumCoinBalances,
    toast,
    useCoinMetadata,
    useFeatureEnabledByNetwork,
    useGetAllCoins,
    useSendCoinTransaction,
    useStoreVaultTransaction,
} from '@iota/core';
import { useNetwork } from '@iota/core/src/hooks/useNetwork';
import { shouldResolveInputAsName } from '@iota/core/utils/validation/names';
import { useSignTransaction } from '@iota/dapp-kit';
import { CoinBalance, getNetwork } from '@iota/iota-sdk/client';
import { fromBase64, IOTA_TYPE_ARG, toHex } from '@iota/iota-sdk/utils';
import { useQueryClient } from '@tanstack/react-query';
import { FormikProvider, useFormik } from 'formik';
import { useMemo, useState } from 'react';
import { INITIAL_VALUES } from './constants';
import { EnterValuesFormView, ReviewValuesFormView } from './views';

interface SendTokenVaultDialogProps {
    coin: CoinBalance;
    activeAddress: string;
    setOpen: (bool: boolean) => void;
    open: boolean;
    vaultId: number;
}

enum FormStep {
    EnterValues,
    ReviewValues,
}

function SendTokenVaultDialogBody({
    vaultId,
    coin,
    activeAddress,
    setOpen,
}: SendTokenVaultDialogProps): React.JSX.Element {
    const [step, setStep] = useState<FormStep>(FormStep.EnterValues);
    const [selectedCoin, setSelectedCoin] = useState<CoinBalance>(coin);
    const { data: coins = [], isLoading: isLoadingCoins } = useGetAllCoins(
        selectedCoin.coinType,
        activeAddress,
    );
    const { data: iotaCoins = [], isLoading: isLoadingIotaCoins } = useGetAllCoins(
        IOTA_TYPE_ARG,
        activeAddress,
    );

    const coinBalance = sumCoinBalances(coins);
    const iotaBalance = sumCoinBalances(iotaCoins);
    const selectedCoinMetadata = useCoinMetadata(selectedCoin.coinType);
    const { mutate: storeVaultTransaction } = useStoreVaultTransaction();
    const { mutate: signTransaction } = useSignTransaction();
    const coinDecimals = selectedCoinMetadata.data?.decimals ?? 0;
    const coinSymbol = selectedCoinMetadata.data?.symbol ?? '';

    const networkId = useNetwork();
    const network = getNetwork(networkId).id;

    const isFeatureEnabled = useFeatureEnabledByNetwork(Feature.IotaNames, network);

    const validationSchemaStepOne = useMemo(
        () =>
            createValidationSchemaSendTokenForm(
                isFeatureEnabled,
                coinBalance,
                coinSymbol,
                coinDecimals,
            ),
        [isFeatureEnabled, coinBalance, coinSymbol, coinDecimals],
    );

    const formik = useFormik<SendTokenFormValues>({
        initialValues: INITIAL_VALUES,
        validationSchema: validationSchemaStepOne,
        onSubmit: () => { },
        validateOnChange: false,
        validateOnBlur: false,
    });

    const isNameInput = shouldResolveInputAsName(formik.values.to);
    const queryClient = useQueryClient();

    const sendCoinQuery = useSendCoinTransaction({
        coins,
        coinType: selectedCoin.coinType,
        senderAddress: activeAddress,
        recipientAddress: isNameInput ? (formik.values.resolvedAddress ?? '') : formik.values.to,
        amount: formik.values.amount,
    });

    const { data: transactionData } = sendCoinQuery;

    const isPayAllIota =
        selectedCoin.totalBalance === formik.values.amount &&
        selectedCoin.coinType === IOTA_TYPE_ARG;

    async function handleProposition() {
        if (!transactionData?.transaction) {
            toast.error('There was an error with the transaction');
            return;
        }
        console.log(toHex(await transactionData.transaction.build()));

        signTransaction(
            { transaction: transactionData.transaction },
            {
                onSuccess: async (signatureData) => {
                    const transactionBinary = fromBase64(signatureData.bytes);
                    const signature = signatureData.signature;

                    const comment = formik.values.comment?.trim();
                    storeVaultTransaction({
                        vaultId,
                        transactionBinary,
                        signature,
                        comment: comment ? comment : undefined,
                    });

                    queryClient.invalidateQueries({
                        queryKey: ['vault', vaultId, 'query-proposed-transactions'],
                    });
                    setOpen(false);
                },
                onError: (error) => {
                    toast.error('Signing failed.');
                    console.error(error);
                },
            },
        );
    }

    function onNext(): void {
        setStep(FormStep.ReviewValues);
    }

    function onBack(): void {
        setStep(FormStep.EnterValues);
    }

    return (
        <>
            <FormikProvider value={formik}>
                {step === FormStep.EnterValues && (
                    <EnterValuesFormView
                        coin={selectedCoin}
                        activeAddress={activeAddress}
                        onCoinSelect={(newCoin) => {
                            if (newCoin !== selectedCoin) {
                                setSelectedCoin(newCoin);
                                formik.resetForm();
                            }
                        }}
                        onNext={onNext}
                        onClose={() => setOpen(false)}
                        sendCoinTransactionQuery={sendCoinQuery}
                        coinBalance={coinBalance}
                        iotaBalance={iotaBalance}
                        showLoading={isLoadingCoins || isLoadingIotaCoins}
                    />
                )}
                {step === FormStep.ReviewValues && (
                    <ReviewValuesFormView
                        formData={formik.values}
                        executeTransfer={handleProposition}
                        senderAddress={activeAddress}
                        isPending={false}
                        coinType={selectedCoin.coinType}
                        isPayAllIota={isPayAllIota}
                        onClose={() => setOpen(false)}
                        onBack={onBack}
                        totalGas={transactionData?.gasSummary?.totalGas}
                    />
                )}
            </FormikProvider>
        </>
    );
}

export function SendTokenVaultDialog(props: SendTokenVaultDialogProps) {
    return (
        <Dialog open={props.open} onOpenChange={props.setOpen}>
            <DialogContent containerId="overlay-portal-container" position={DialogPosition.Right}>
                <SendTokenVaultDialogBody {...props} />
            </DialogContent>
        </Dialog>
    );
}
