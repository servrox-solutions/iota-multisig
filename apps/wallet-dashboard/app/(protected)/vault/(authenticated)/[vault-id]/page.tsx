// Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0
'use client';

import { VaultCoins } from '@/components/coins/VaultCoins';
import { VaultBalance } from '@/components/vault-balance/VaultBalance';
import { VaultOwners } from '@/components/vault-owners';
import { VaultTransactionsOverview } from '@/components/vault-transactions';
import { useVaultsByUser } from '@/hooks/useVaultsByUser';
import { Header, InfoBox, InfoBoxType, Panel, Title } from '@iota/apps-ui-kit';
import { useCurrentAccount, useCurrentWallet } from '@iota/dapp-kit';

function VaultDetailsPage({ params }: { params: { 'vault-id': string } }): JSX.Element {
    const { connectionStatus } = useCurrentWallet();
    const account = useCurrentAccount();
    const { 'vault-id': vaultId } = params;
    const { data: vaults } = useVaultsByUser(account?.address);
    const currentVault = vaults?.find((vault) => vault.id === Number(vaultId));

    return (
        <main className="flex flex-1 flex-col items-center space-y-8 py-md">
            {!currentVault && <InfoBox type={InfoBoxType.Error} title="Vault cannot be loaded." />}
            {currentVault?.address && connectionStatus === 'connected' && account && (
                <>
                    <Header title={currentVault?.vaultName} />
                    <div className="home-page-grid-container w-full content-start">
                        <div style={{ gridArea: 'balance' }} className="flex grow overflow-hidden">
                            <VaultBalance vaultAddress={currentVault.address} />
                        </div>
                        <div style={{ gridArea: 'staking' }} className="flex grow overflow-hidden">
                            <Panel>
                                <div className="flex h-full w-full flex-col p-2">
                                    <Title title="Vault Owner" />
                                    <VaultOwners vaultId={Number(vaultId)} />
                                </div>
                            </Panel>
                        </div>
                        <div style={{ gridArea: 'coins' }} className="flex grow overflow-hidden">
                            <VaultCoins vaultAddress={currentVault.address} />
                        </div>
                        <div style={{ gridArea: 'activity' }} className="flex grow overflow-hidden">
                            <VaultTransactionsOverview vaultAddress={currentVault.address} />
                        </div>
                    </div>
                </>
            )}
        </main>
    );
}

export default VaultDetailsPage;
