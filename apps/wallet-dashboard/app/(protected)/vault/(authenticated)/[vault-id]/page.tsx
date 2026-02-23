// Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0
'use client';

import { VaultCoins } from '@/components/coins/VaultCoins';
import { VaultBalance } from '@/components/vault-balance/VaultBalance';
import { VaultOwners } from '@/components/vault-owners';
import { VaultProposedTransactionsOverview } from '@/components/vault-proposed-transactions';
import { VaultTransactionsOverview } from '@/components/vault-transactions';
import { usePersistedNetwork } from '@/hooks';
import { useVaultsByUser } from '@/hooks/useVaultsByUser';
import { Button, Header, LoadingIndicator, Panel, Title } from '@iota/apps-ui-kit';
import { capitalize, useNetwork } from '@iota/core';
import { useCurrentAccount, useCurrentWallet } from '@iota/dapp-kit';
import { getNetwork } from '@iota/iota-sdk/client';

function VaultDetailsPage({ params }: { params: { 'vault-id': string } }): JSX.Element {
    const { connectionStatus } = useCurrentWallet();
    const account = useCurrentAccount();
    const { 'vault-id': vaultId } = params;
    const { data: vaults } = useVaultsByUser(account?.address);
    const currentVault = vaults?.find((vault) => vault.id === Number(vaultId));
    const currentNetwork = getNetwork(useNetwork()).id;
    const { handleNetworkChange } = usePersistedNetwork();

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
                    <Header title={currentVault.vaultName} />
                    <div className="vault-details-grid-container w-full content-start">
                        <div style={{ gridArea: 'balance' }} className="flex grow overflow-hidden">
                            <VaultBalance vault={currentVault} />
                        </div>
                        <div style={{ gridArea: 'owners' }} className="flex grow overflow-hidden">
                            <Panel>
                                <div className="flex h-full w-full flex-col p-2">
                                    <Title title="Vault Owner" />
                                    <VaultOwners vault={currentVault} />
                                </div>
                            </Panel>
                        </div>
                        <div style={{ gridArea: 'coins' }} className="flex grow overflow-hidden">
                            <VaultCoins vault={currentVault} />
                        </div>
                        <div style={{ gridArea: 'activity' }} className="flex grow overflow-hidden">
                            <VaultProposedTransactionsOverview vault={currentVault} />
                        </div>
                        <div style={{ gridArea: 'transactions' }} className="overflow-hidden">
                            <VaultTransactionsOverview address={currentVault.address} />
                        </div>
                    </div>
                </>
            )}
        </main>
    );
}

export default VaultDetailsPage;
