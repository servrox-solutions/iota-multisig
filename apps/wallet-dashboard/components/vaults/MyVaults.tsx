// Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { useVaultsByUser } from '@/hooks/useVaultsByUser';
import { Vault } from '@/lib/types';
import { Info, LockUnlocked } from '@iota/apps-ui-icons';
import { Panel, Title } from '@iota/apps-ui-kit';
import { NoData, VaultItem, VirtualList } from '@iota/core';
import { useCurrentAccount } from '@iota/dapp-kit';
import { useRouter } from 'next/navigation';
import { useQueryState } from 'nuqs';
import { useEffect, useState } from 'react';
import { VaultInvitationDialog } from '../dialogs';

export function MyVaults(): React.JSX.Element {
    const account = useCurrentAccount();
    const [invitationVaultId, setInvitationVaultId] = useQueryState('invitation');
    const { data: vaults } = useVaultsByUser(account?.address);
    const router = useRouter();

    const [vault, setVault] = useState<Vault | null>(
        () => vaults?.find((vault) => vault.id === Number(invitationVaultId)) ?? null,
    );

    useEffect(() => {
        setVault(vaults?.find(vault => vault.id === Number(invitationVaultId)) ?? null);
    }, [invitationVaultId, vaults]);

    const virtualItem = (vault: Vault): JSX.Element => {
        return (
            <VaultItem
                name={vault.vaultName}
                address={vault.address}
                onClick={() => {
                    const vaultIsAccepted =
                        vault.address &&
                        vault.owners.every((approval) => approval.status === 'accepted');
                    if (vaultIsAccepted) {
                        router.push(`/vault/${vault.id}`);
                    } else {
                        setInvitationVaultId(String(vault.id));
                    }
                }}
                icon={
                    !vault.address || vault.owners.some((owner) => owner.status !== 'accepted') ? (
                        <Info />
                    ) : (
                        <LockUnlocked />
                    )
                }
            />
        );
    };
    return (
        <>
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
                                    items={vaults}
                                    estimateSize={() => 60}
                                    render={(vault: Vault) => virtualItem(vault)}
                                    heightClassName="h-full"
                                />
                            </div>
                        </>
                    ) : null}
                </div>
            </Panel>
            <VaultInvitationDialog vault={vault} setOpen={(open) => !open && setInvitationVaultId(null)} />
        </>
    );
}
