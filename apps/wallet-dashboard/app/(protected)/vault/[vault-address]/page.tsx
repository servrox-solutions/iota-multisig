// Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0
'use client';

import { VaultCoins } from '@/components/coins/VaultCoins';
import { VaultBalance } from '@/components/vault-balance/VaultBalance';
import { VaultTransactionsOverview } from '@/components/vault-transactions';
import { usePersistedVaults } from '@/providers/VaultsContext';
import { Header, InfoBox, InfoBoxType } from '@iota/apps-ui-kit';
import { useCurrentAccount, useCurrentWallet } from '@iota/dapp-kit';

function VaultDetailsPage({ params }: { params: { 'vault-address': string } }): JSX.Element {
    const { connectionStatus } = useCurrentWallet();
    const account = useCurrentAccount();
    const { 'vault-address': vaultAddress } = params;
    const { getVault } = usePersistedVaults();
    const currentVault = getVault(vaultAddress);

    return (
        <main className="flex flex-1 flex-col items-center space-y-8 py-md">
            {!currentVault && <InfoBox type={InfoBoxType.Error} title="Vault cannot be loaded." />}
            {currentVault && connectionStatus === 'connected' && account && (
                <>
                    <Header title={currentVault?.vaultName} />
                    <div className="home-page-grid-container w-full content-start">
                        <div style={{ gridArea: 'balance' }} className="flex grow overflow-hidden">
                            <VaultBalance vaultAddress={vaultAddress} />
                        </div>
                        <div style={{ gridArea: 'staking' }} className="flex grow overflow-hidden">
                            {/* <StakingOverview accountAddress={vaultAddress} /> */}
                        </div>
                        <div style={{ gridArea: 'coins' }} className="flex grow overflow-hidden">
                            <VaultCoins vaultAddress={vaultAddress} />
                        </div>
                        <div style={{ gridArea: 'activity' }} className="flex grow overflow-hidden">
                            <VaultTransactionsOverview vaultAddress={vaultAddress} />
                        </div>
                    </div>
                </>
            )}
        </main>
    );
}

export default VaultDetailsPage;
