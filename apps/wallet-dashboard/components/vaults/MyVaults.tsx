// Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { useVaultsByUser } from '@/hooks/useVaultsByUser';
import { Vault } from '@/lib/types';
import { Panel, Title } from '@iota/apps-ui-kit';
import { NoData, VaultItem, VirtualList } from '@iota/core';
import { useCurrentAccount } from '@iota/dapp-kit';
import { useRouter } from 'next/navigation';

export function MyVaults(): React.JSX.Element {
    const account = useCurrentAccount();

    const { data: vaults } = useVaultsByUser(account?.address);
    const router = useRouter();

    const virtualItem = (vaultData: { name: string; address: string }): JSX.Element => {
        return (
            <VaultItem
                name={vaultData.name}
                address={vaultData.address}
                onClick={() => {
                    router.push(`/vault/${vaultData.address}`);
                }}
                icon={null}
            />
        );
    };
    return (
        <Panel>
            <div className="flex h-full w-full flex-col items-center p-lg">
                <Title title="My Vaults" />
                {!vaults?.length ? (
                    <div className="py-2xl">
                        <NoData message="Start by adding a vault." />
                    </div>
                ) : null}
                {vaults?.length ? (
                    <>
                        <div className="w-full flex-1 px-sm pb-md pt-sm sm:max-h-none">
                            <VirtualList
                                items={vaults.map((vault) => ({
                                    vaultName: vault.name,
                                    threshold: vault.threshold,
                                    address: vault.vault_address,
                                    owners: vault.owners as any,
                                }) as Vault,
                                )}
                                estimateSize={() => 60}
                                render={(vault: Vault) => {
                                    return virtualItem({
                                        name: vault.vaultName,
                                        address: vault.address,
                                    });
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
