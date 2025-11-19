// Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { PersistedVault } from '@/lib/types/vaults';
import { usePersistedVaults } from '@/providers/VaultsContext';
import { Panel, Title } from '@iota/apps-ui-kit';
import { NoData, VaultItem, VirtualList } from '@iota/core';
import { useRouter } from 'next/navigation';

export function MyVaults(): React.JSX.Element {
    const { persistedVaults } = usePersistedVaults();
    const router = useRouter();

    const virtualItem = (vault: PersistedVault): JSX.Element => {
        return (
            <VaultItem
                name={vault.vaultName}
                address={vault.address}
                onClick={() => {
                    router.push(`/vault/${vault.address}`);
                }}
                icon={null}
            />
        );
    };
    return (
        <Panel>
            <div className="flex h-full w-full flex-col items-center p-lg">
                <Title title="My Vaults" />
                {!persistedVaults?.length ? (
                    <div className="py-2xl">
                        <NoData message="Start by adding a vault." />
                    </div>
                ) : null}
                {persistedVaults?.length ? (
                    <>
                        <div className="w-full flex-1 px-sm pb-md pt-sm sm:max-h-none">
                            <VirtualList
                                items={persistedVaults}
                                estimateSize={() => 60}
                                render={(vault: PersistedVault) => {
                                    return virtualItem(vault);
                                }}
                                heightClassName="h-full"
                            />
                        </div>
                    </>
                ) : null}
            </div>
        </Panel>
    );
}
