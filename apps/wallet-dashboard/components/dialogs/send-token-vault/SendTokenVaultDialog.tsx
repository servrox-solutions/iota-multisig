// Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { useProposeTransaction } from '@/hooks/useProposeTransaction';
import { Vault } from '@/lib/types';
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
} from '@iota/core';
import { useNetwork } from '@iota/core/src/hooks/useNetwork';
import { shouldResolveInputAsName } from '@iota/core/utils/validation/names';
import { CoinBalance, getNetwork } from '@iota/iota-sdk/client';
import { IOTA_TYPE_ARG } from '@iota/iota-sdk/utils';
import { FormikProvider, useFormik } from 'formik';
import { useMemo, useState } from 'react';
import { INITIAL_VALUES } from './constants';
import { EnterValuesFormView, ReviewValuesFormView } from './views';

interface SendTokenVaultDialogProps {
    coin: CoinBalance;
    activeAddress: string;
    setOpen: (bool: boolean) => void;
    open: boolean;
    vault: Vault;
}

enum FormStep {
    EnterValues,
    ReviewValues,
}

function SendTokenVaultDialogBody({
    vault,
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
    const coinDecimals = selectedCoinMetadata.data?.decimals ?? 0;
    const coinSymbol = selectedCoinMetadata.data?.symbol ?? '';
    const { isProposing, proposeTransaction } = useProposeTransaction({ vault });

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

    const formik = useFormik<SendTokenFormValues & { comment?: string }>({
        initialValues: INITIAL_VALUES,
        validationSchema: validationSchemaStepOne,
        onSubmit: () => {
            void 0;
        },
        validateOnChange: false,
        validateOnBlur: false,
    });

    const isNameInput = shouldResolveInputAsName(formik.values.to);
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

        await proposeTransaction({
            transaction: transactionData.transaction,
            comment: formik.values.comment,
            onSuccess: () => setOpen(false),
            onError: (error) => {
                toast.error('Failed to propose transaction.');
                console.error(error);
            },
        });
    }

    function onNext(): void {
        setStep(FormStep.ReviewValues);
    }

    function onBack(): void {
        setStep(FormStep.EnterValues);
    }

    return (
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
                    isPending={isProposing}
                    coinType={selectedCoin.coinType}
                    isPayAllIota={isPayAllIota}
                    onClose={() => setOpen(false)}
                    onBack={onBack}
                    totalGas={transactionData?.gasSummary?.totalGas}
                />
            )}
        </FormikProvider>
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
