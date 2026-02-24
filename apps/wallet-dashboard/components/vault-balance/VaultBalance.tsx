// Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { Vault } from '@/lib/types';
import { Button, ButtonSize, ButtonType, LoadingIndicator, Panel } from '@iota/apps-ui-kit';
import {
    NamedAddress,
    toast,
    useBalance,
    useFormatCoin,
    useGetAllBalances,
    useGetFiatBalance,
} from '@iota/core';
import { useIotaClientContext } from '@iota/dapp-kit';
import { getNetwork } from '@iota/iota-sdk/client';
import { useState } from 'react';
import { ReceiveFundsDialog } from '../dialogs';
import { SendTokenVaultDialog } from '../dialogs/send-token-vault';
import { ProposeRawTransactionDialog } from '../dialogs/transaction/ProposeRawTransactionDialog';

export interface VaultBalanceProps {
    vault: Vault;
}

export function VaultBalance({ vault }: VaultBalanceProps) {
    const [isReceiveDialogOpen, setIsReceiveDialogOpen] = useState(false);
    const { network } = useIotaClientContext();
    const { id: networkId, explorer } = getNetwork(network);
    const fiatBalance = useGetFiatBalance(networkId);
    const { data: coinBalance, isPending } = useBalance(vault.address);
    const [formatted, symbol] = useFormatCoin({ balance: coinBalance?.totalBalance });
    const [isSendTokenDialogOpen, setIsSendTokenDialogOpen] = useState(false);
    const [isProposeDialogOpen, setIsProposeDialogOpen] = useState(false);
    const explorerLink = `${explorer}/address/${vault.address}`;
    const { data: coinBalances } = useGetAllBalances(vault.address);

    function openSendTokenDialog(): void {
        setIsSendTokenDialogOpen(true);
    }

    function openReceiveTokenDialog(): void {
        setIsReceiveDialogOpen(true);
    }

    function openProposeDialog(): void {
        setIsProposeDialogOpen(true);
    }

    function handleOnCopySuccess() {
        toast('Address copied');
    }

    const sendTokenCoin = coinBalance?.totalBalance === '0' ? coinBalances?.[0] : coinBalance;

    return (
        <>
            <Panel>
                {isPending ? (
                    <div className="flex h-full w-full items-center justify-center p-2">
                        <LoadingIndicator />
                    </div>
                ) : (
                    <div className="flex h-full flex-col items-center justify-center gap-y-lg p-lg">
                        <div className="flex flex-col items-center gap-y-xs">
                            {vault.address && (
                                <div className="w-full" data-full-address={vault.address}>
                                    <NamedAddress
                                        address={vault.address}
                                        isCopyable
                                        copyText={vault.address}
                                        isExternal
                                        externalLink={explorerLink}
                                        onCopySuccess={handleOnCopySuccess}
                                        addMarginRightToCenter
                                    />
                                </div>
                            )}
                            <span
                                data-testid="balance-amount"
                                className="text-headline-lg text-iota-neutral-10 dark:text-iota-neutral-92"
                            >
                                {formatted} {symbol}
                            </span>
                            {fiatBalance && (
                                <span className="text-body-md text-iota-neutral-10 dark:text-iota-neutral-92">
                                    {fiatBalance}
                                </span>
                            )}
                        </div>
                        <div className="flex w-full flex-col items-center justify-center gap-xs">
                            <div className="flex w-full max-w-80 gap-xs">
                                <Button
                                    onClick={openSendTokenDialog}
                                    text="Send"
                                    size={ButtonSize.Small}
                                    disabled={!vault.address || coinBalances?.length === 0}
                                    testId="send-coin-button"
                                    fullWidth
                                />
                                <Button
                                    onClick={openReceiveTokenDialog}
                                    type={ButtonType.Secondary}
                                    text="Receive"
                                    size={ButtonSize.Small}
                                    fullWidth
                                />
                            </div>
                            <div className="flex items-center justify-center gap-xs text-xs">
                                <button className="underline" onClick={openProposeDialog}>
                                    Propose Pre-Built Transaction
                                </button>
                            </div>
                        </div>
                    </div>
                )}
                {vault.address && (
                    <>
                        {sendTokenCoin && (
                            <SendTokenVaultDialog
                                vault={vault}
                                activeAddress={vault.address}
                                coin={sendTokenCoin}
                                open={isSendTokenDialogOpen}
                                setOpen={setIsSendTokenDialogOpen}
                            />
                        )}
                        <ProposeRawTransactionDialog
                            vault={vault}
                            open={isProposeDialogOpen}
                            setOpen={setIsProposeDialogOpen}
                        />
                        <ReceiveFundsDialog
                            address={vault.address}
                            open={isReceiveDialogOpen}
                            setOpen={setIsReceiveDialogOpen}
                        />
                    </>
                )}
            </Panel>
        </>
    );
}
