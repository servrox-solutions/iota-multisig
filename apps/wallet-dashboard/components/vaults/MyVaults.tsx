// Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { useVaultsByUser } from '@/hooks/useVaultsByUser';
import { Vault } from '@/lib/types';
import { Info, ListViewSmall, LockUnlocked } from '@iota/apps-ui-icons';
import { LoadingIndicator, Panel, Title } from '@iota/apps-ui-kit';
import { NoData, useNetwork, VaultItem, VirtualList } from '@iota/core';
import { useCurrentAccount } from '@iota/dapp-kit';
import { getNetwork } from '@iota/iota-sdk/client';
import { useRouter } from 'next/navigation';
import { useQueryState } from 'nuqs';
import { useEffect, useState } from 'react';
import { VaultInvitationDialog } from '../dialogs';

export function MyVaults(): React.JSX.Element {
    const account = useCurrentAccount();
    const [invitationVaultId, setInvitationVaultId] = useQueryState('invitation');
    const network = getNetwork(useNetwork()).id;
    const { data: vaults, isLoading } = useVaultsByUser(account?.address);
    const currentNetworkVaults = vaults?.filter((vault) => vault.network === network);
    const router = useRouter();
    const [open, setOpen] = useState(false);

    const [vault, setVault] = useState<Vault | null>(
        () => vaults?.find((vault) => vault.id === Number(invitationVaultId)) ?? null,
    );

    useEffect(() => {
        setVault(vaults?.find((vault) => vault.id === Number(invitationVaultId)) ?? null);
        if (invitationVaultId !== null) {
            setOpen(true);
        }
    }, [invitationVaultId, vaults]);

    useEffect(() => {
        if (vault) {
            setOpen(true);
        }
    }, [vault]);

    const itemIcon = (vault: Vault): React.ReactNode => {
        if (!account?.address || vault.owners.some((owner) => owner.status !== 'accepted')) {
            return <Info />;
        }
        if (vault.whitelist.includes(account.address)) {
            return <ListViewSmall />;
        }
        return <LockUnlocked />;
    };

    const itemTooltip = (vault: Vault): string | undefined => {
        if (!account?.address || vault.owners.some((owner) => owner.status !== 'accepted')) {
            return 'Pending invitation';
        }
        if (vault.whitelist.includes(account.address)) {
            return 'Whitelist access';
        }
        return 'Vault is ready';
    };

    const virtualItem = (vault: Vault): JSX.Element => {

        return (
            <VaultItem
                tooltip={itemTooltip(vault)}
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
                icon={itemIcon(vault)}
            />
        );
    };
    return (
        <>
            <Panel>
                <div className="flex h-full w-full flex-col items-center p-lg">
                    <Title title="My Vaults" />
                    {isLoading && <LoadingIndicator />}
                    {!isLoading && !currentNetworkVaults?.length ? (
                        <div className="py-2xl">
                            <NoData message="Start by adding a vault." />
                        </div>
                    ) : null}
                    {currentNetworkVaults?.length ? (
                        <>
                            <div className="w-full flex-1 px-sm pb-md pt-sm sm:max-h-none">
                                <VirtualList
                                    items={currentNetworkVaults}
                                    estimateSize={() => 60}
                                    render={(vault: Vault) => virtualItem(vault)}
                                    heightClassName="h-full"
                                />
                            </div>
                        </>
                    ) : null}
                </div>
            </Panel>
            <VaultInvitationDialog
                vault={vault}
                open={open}
                setOpen={(open) => {
                    if (!open) {
                        setInvitationVaultId(null);
                    }
                    setOpen(open);
                }}
            />
        </>
    );
}
