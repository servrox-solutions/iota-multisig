// Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { useVaultsByUser } from '@/hooks/useVaultsByUser';
import { Vault } from '@/lib/types';
import { Close, Info, ListViewSmall, LockUnlocked } from '@iota/apps-ui-icons';
import { LoadingIndicator, Panel, Select, SelectSize, Title, Tooltip } from '@iota/apps-ui-kit';
import { NoData, useNetwork, VaultItem, VirtualList } from '@iota/core';
import { useCurrentAccount } from '@iota/dapp-kit';
import { getNetwork } from '@iota/iota-sdk/client';
import { useRouter } from 'next/navigation';
import { useQueryState } from 'nuqs';
import { useEffect, useState } from 'react';
import { VaultInvitationDialog } from '../dialogs';

type VaultFilter = 'accepted' | 'pending' | 'rejected' | 'whitelisted';

export function MyVaults(): React.JSX.Element {
    const account = useCurrentAccount();
    const [invitationVaultId, setInvitationVaultId] = useQueryState('invitation');
    const network = getNetwork(useNetwork()).id;
    const { data: vaults, isLoading } = useVaultsByUser(account?.address);
    const currentNetworkVaults = vaults?.filter((vault) => vault.network === network);
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const [selectedFilter, setSelectedFilter] = useState<VaultFilter>('accepted');

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

    const getVaultStatus = (vault: Vault): VaultFilter => {
        if (!account?.address) {
            return 'pending';
        }

        if (vault.whitelist.includes(account.address)) {
            return 'whitelisted';
        }

        const ownOwnerRecord = vault.owners.find((owner) => owner.address === account.address);

        if (ownOwnerRecord?.status === 'rejected') {
            return 'rejected';
        }

        if (vault.owners.every((owner) => owner.status === 'accepted')) {
            return 'accepted';
        }

        return 'pending';
    };

    const filteredVaults = currentNetworkVaults?.filter(
        (vault) => getVaultStatus(vault) === selectedFilter,
    );
    const filterCounts: Record<VaultFilter, number> = {
        accepted: 0,
        pending: 0,
        rejected: 0,
        whitelisted: 0,
    };

    currentNetworkVaults?.forEach((vault) => {
        const status = getVaultStatus(vault);
        filterCounts[status] += 1;
    });

    const itemIcon = (vault: Vault): React.ReactNode => {
        const status = getVaultStatus(vault);
        if (status === 'rejected') {
            return <Close />;
        }
        if (status === 'pending') {
            return <Info />;
        }
        if (vault.whitelist.includes(account?.address ?? '')) {
            return <ListViewSmall />;
        }
        return <LockUnlocked />;
    };

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
                icon={itemIcon(vault)}
            />
        );
    };
    return (
        <>
            <Panel>
                <div className="flex h-full w-full flex-col items-center p-lg">
                    <Title title="My Vaults" />
                    <div className="flex w-full flex-row items-center gap-xs px-sm pt-sm">
                        <div className="relative inline-flex w-full">
                            <Select
                                value={selectedFilter}
                                options={[
                                    {
                                        id: 'accepted',
                                        label: `Accepted (${filterCounts.accepted})`,
                                    },
                                    { id: 'pending', label: `Pending (${filterCounts.pending})` },
                                    {
                                        id: 'rejected',
                                        label: `Rejected (${filterCounts.rejected})`,
                                    },
                                    {
                                        id: 'whitelisted',
                                        label: `Whitelisted (${filterCounts.whitelisted})`,
                                    },
                                ]}
                                size={SelectSize.Small}
                                onValueChange={(value) => setSelectedFilter(value as VaultFilter)}
                            />
                            {filterCounts.pending > 0 ? (
                                <Tooltip text={`${filterCounts.pending} pending`}>
                                    <span
                                        className="text-label-xs absolute -right-2 -top-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-iota-primary-30 px-1.5 text-white"
                                        onClick={() => setSelectedFilter('pending')}
                                    >
                                        {filterCounts.pending}
                                    </span>
                                </Tooltip>
                            ) : null}
                        </div>
                    </div>
                    {isLoading && <LoadingIndicator />}
                    {!isLoading && !filteredVaults?.length ? (
                        <div className="py-2xl">
                            <NoData message={`No ${selectedFilter} vaults found.`} />
                        </div>
                    ) : null}
                    {filteredVaults?.length ? (
                        <>
                            <div className="w-full flex-1 px-sm pb-md pt-sm sm:max-h-none">
                                <VirtualList
                                    items={filteredVaults}
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
