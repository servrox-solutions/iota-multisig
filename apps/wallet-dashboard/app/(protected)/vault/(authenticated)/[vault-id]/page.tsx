// Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0
'use client';

import { VaultCoins } from '@/components/coins/VaultCoins';
import { VaultEventsList } from '@/components/vault-events/VaultEventsList';
import { VaultBalance } from '@/components/vault-balance/VaultBalance';
import { VaultAccessOverview } from '@/components/vault-owners';
import { VaultProposedTransactionsOverview } from '@/components/vault-proposed-transactions';
import { VaultTransactionsOverview } from '@/components/vault-transactions';
import { usePersistedNetwork } from '@/hooks';
import { useUpdateVaultName } from '@/hooks/useUpdateVaultName';
import { useVaultsByUser } from '@/hooks/useVaultsByUser';
import { Edit, ListViewSmall } from '@iota/apps-ui-icons';
import { Button, ButtonType, Header, LoadingIndicator, Panel, Title } from '@iota/apps-ui-kit';
import { capitalize, toast, useNetwork } from '@iota/core';
import { useCurrentAccount, useCurrentWallet } from '@iota/dapp-kit';
import { getNetwork } from '@iota/iota-sdk/client';
import { useEffect, useRef, useState } from 'react';

function VaultDetailsPage({ params }: { params: { 'vault-id': string } }): JSX.Element {
    const { connectionStatus } = useCurrentWallet();
    const account = useCurrentAccount();
    const { 'vault-id': vaultId } = params;
    const { data: vaults } = useVaultsByUser(account?.address);
    const currentVault = vaults?.find((vault) => vault.id === Number(vaultId));
    const currentNetwork = getNetwork(useNetwork()).id;
    const { handleNetworkChange } = usePersistedNetwork();
    const { mutate: updateVaultName } = useUpdateVaultName();
    const [isEditingTitle, setIsEditingTitle] = useState(false);
    const [showEvents, setShowEvents] = useState(false);
    const titleInputRef = useRef<HTMLInputElement>(null);
    const isWhitelistedUser =
        account?.address && currentVault?.whitelist?.includes(account.address);
    const [vaultName, setVaultName] = useState(() => currentVault?.vaultName);

    const saveTitle = (newTitle: string): void => {
        if (!currentVault || newTitle === currentVault.vaultName) {
            return;
        }

        updateVaultName(
            {
                p_name: newTitle,
                p_vault_id: currentVault.id,
            },
            {
                onSuccess: () => {
                    toast('Vault name updated.');
                },
                onError: () => {
                    toast.error('Failed to update.');
                },
            },
        );
        setVaultName(newTitle);
        setIsEditingTitle(false);
    };

    useEffect(() => {
        setVaultName(currentVault?.vaultName);
    }, [currentVault?.vaultName]);

    useEffect(() => {
        if (!isEditingTitle) {
            return;
        }

        titleInputRef.current?.focus();
        titleInputRef.current?.select();
    }, [isEditingTitle]);

    if (!currentVault) {
        return <LoadingIndicator />;
    }

    if (currentNetwork !== currentVault.network) {
        return (
            <>
                <Header
                    titleCentered={true}
                    title={`This vault is only available on ${capitalize(currentVault.network)}.`}
                />
                <div className="flex w-full items-center justify-center">
                    <Button
                        text={`Switch to ${capitalize(currentVault.network)}`}
                        onClick={() => handleNetworkChange(getNetwork(currentVault.network))}
                    />
                </div>
            </>
        );
    }

    return (
        <main className="flex flex-1 flex-col items-center space-y-8 py-md">
            {currentVault.address && connectionStatus === 'connected' && account && (
                <>
                    <Panel>
                        <div className="flex h-16 items-center justify-between gap-2">
                            {isWhitelistedUser ? (
                                <Title title={currentVault.vaultName} />
                            ) : (
                                <div className="flex min-w-0 flex-1 items-center gap-1">
                                    {isEditingTitle ? (
                                        <input
                                            ref={titleInputRef}
                                            value={vaultName}
                                            onChange={(event) => setVaultName(event.target.value)}
                                            onBlur={(el) => saveTitle(el.target.value)}
                                            maxLength={20}
                                            onKeyDown={(event) => {
                                                if (event.key === 'Enter') {
                                                    event.currentTarget.blur();
                                                }
                                            }}
                                            aria-label="Vault Name"
                                            className="w-full bg-transparent text-title-lg text-iota-neutral-10 outline-none dark:text-iota-neutral-92"
                                        />
                                    ) : (
                                        <>
                                            <Title title={vaultName ?? currentVault.vaultName} />
                                            <button
                                                type="button"
                                                onClick={() => setIsEditingTitle(true)}
                                                aria-label="Edit vault name"
                                                className="rounded p-1 text-iota-neutral-40 transition-colors hover:text-iota-neutral-10 dark:hover:text-iota-neutral-92"
                                            >
                                                <Edit className="h-4 w-4" />
                                            </button>
                                        </>
                                    )}
                                </div>
                            )}
                            {!isWhitelistedUser && (
                                <Button
                                    type={ButtonType.Ghost}
                                    icon={<ListViewSmall />}
                                    text={showEvents ? 'Overview' : 'Events'}
                                    onClick={() => setShowEvents((current) => !current)}
                                />
                            )}
                        </div>
                    </Panel>
                    {showEvents ? (
                        <div className="flex h-[calc(100vh-240px)] w-full flex-col overflow-hidden">
                            <VaultEventsList vaultId={currentVault.id} heightClassName="h-full" />
                        </div>
                    ) : (
                        <div className="vault-details-grid-container w-full content-start">
                            <div
                                style={{ gridArea: 'balance' }}
                                className="flex grow overflow-hidden"
                            >
                                <VaultBalance vault={currentVault} />
                            </div>
                            <div
                                style={{ gridArea: 'owners' }}
                                className="flex grow overflow-hidden"
                            >
                                <Panel>
                                    <div className="flex h-full w-full flex-col p-2">
                                        <Title title="Vault Access" />
                                        <VaultAccessOverview vault={currentVault} />
                                    </div>
                                </Panel>
                            </div>
                            <div
                                style={{ gridArea: 'coins' }}
                                className="flex grow overflow-hidden"
                            >
                                <VaultCoins vault={currentVault} />
                            </div>
                            <div
                                style={{ gridArea: 'activity' }}
                                className="flex grow overflow-hidden"
                            >
                                <VaultProposedTransactionsOverview vault={currentVault} />
                            </div>
                            <div style={{ gridArea: 'transactions' }} className="overflow-hidden">
                                <VaultTransactionsOverview vault={currentVault} />
                            </div>
                        </div>
                    )}
                </>
            )}
        </main>
    );
}

export default VaultDetailsPage;
