'use client';

import { StatusBadge, type StatusBadgeTone } from '@/components/badges/StatusBadge';
import { AddWhitelistUserDialog } from '@/components/dialogs/vault-whitelist/AddWhitelistUserDialog';
import { usePersistedNetwork } from '@/hooks';
import { useVaultRespondInvitation } from '@/hooks/useVaultRespondInvitation';
import { Vault } from '@/lib/types';
import { Add, Checkmark, Clock, Close, Copy, Delete } from '@iota/apps-ui-icons';
import {
    Button,
    ButtonType,
    Card,
    CardAction,
    CardActionType,
    CardImage,
    CardType,
    Chip,
    ImageType,
    Tooltip,
} from '@iota/apps-ui-kit';
import { capitalize, NoData, toast, useCopyToClipboard, VirtualList } from '@iota/core';
import { useCurrentAccount } from '@iota/dapp-kit';
import { getNetwork } from '@iota/iota-sdk/client';
import { formatAddress } from '@iota/iota-sdk/utils';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { addVaultWhitelistEntry, removeVaultWhitelistEntry } from 'iota-vault-sdk';
import { useRouter } from 'next/navigation';
import { PropsWithChildren, useState } from 'react';

export function VaultOwners({ vault }: { vault: Vault }) {
    const account = useCurrentAccount();
    const router = useRouter();
    const copyToClipboard = useCopyToClipboard();
    const [selectedTab, setSelectedTab] = useState<'owners' | 'whitelist'>('owners');
    const [isAddWhitelistDialogOpen, setIsAddWhitelistDialogOpen] = useState(false);
    const queryClient = useQueryClient();
    const { handleNetworkChange } = usePersistedNetwork();
    const { mutate: respond } = useVaultRespondInvitation({
        onSuccess: ({ status, vaultId }) => {
            // Switch to the network of the vault so the user can get started right away.
            if (vault) {
                handleNetworkChange(getNetwork(vault.network));
            }
            const otherUsersAccepted = vault.owners
                .filter((owner) => owner.address !== account?.address)
                .every((owner) => owner.status === 'accepted');
            if (otherUsersAccepted && status === 'accepted') {
                router.push(`/vault/${vaultId}`);
            } else if (otherUsersAccepted && status === 'rejected') {
                router.push(`/vault/overview?invitation=${vaultId}`);
            }
        },
    });
    const ownData = vault.owners.find((owner) => owner.address === account?.address);
    const canManageWhitelist = ownData?.status === 'accepted';
    const vaultsQueryKey = ['vault', 'get-vaults-by-user', account?.address];

    const addMutation = useMutation({
        mutationFn: async (address: string) => {
            if (!vault.id) throw new Error('Vault id missing.');
            return addVaultWhitelistEntry({ vaultId: vault.id, address });
        },
        onMutate: async (address) => {
            if (!vault) return { previousData: undefined };
            await queryClient.cancelQueries({ queryKey: vaultsQueryKey });
            const previousData = queryClient.getQueryData<Vault[] | null>(vaultsQueryKey);

            queryClient.setQueryData<Vault[] | null>(vaultsQueryKey, (current) =>
                (current ?? []).map((entry) => {
                    if (entry.id !== vault.id) return entry;
                    const nextWhitelist = entry.whitelist ?? [];
                    if (nextWhitelist.some((item) => item === address)) {
                        return entry;
                    }
                    return {
                        ...entry,
                        whitelist: [address, ...nextWhitelist],
                    };
                }),
            );

            return { previousData };
        },
        onError: (error, _variables, context) => {
            if (context?.previousData) {
                queryClient.setQueryData(vaultsQueryKey, context.previousData);
            }
            toast.error(error.message);
        },
        onSuccess: () => toast('Whitelist address added.'),
        onSettled: () => queryClient.invalidateQueries({ queryKey: vaultsQueryKey }),
    });

    const removeMutation = useMutation({
        mutationFn: async (address: string) => {
            if (!vault.id) throw new Error('Vault id missing.');
            return removeVaultWhitelistEntry({ vaultId: vault.id, address });
        },
        onMutate: async (address) => {
            if (!vault) return { previousData: undefined };
            await queryClient.cancelQueries({ queryKey: vaultsQueryKey });
            const previousData = queryClient.getQueryData<Vault[] | null>(vaultsQueryKey);

            queryClient.setQueryData<Vault[] | null>(vaultsQueryKey, (current) =>
                (current ?? []).map((entry) => {
                    if (entry.id !== vault.id) return entry;
                    return {
                        ...entry,
                        whitelist: (entry.whitelist ?? []).filter((item) => item !== address),
                    };
                }),
            );

            return { previousData };
        },
        onError: (error, _variables, context) => {
            if (context?.previousData) {
                queryClient.setQueryData(vaultsQueryKey, context.previousData);
            }
            toast.error(error.message);
        },
        onSuccess: () => toast('Whitelist address removed.'),
        onSettled: () => queryClient.invalidateQueries({ queryKey: vaultsQueryKey }),
    });

    const getStatusIcon = (status: 'pending' | 'accepted' | 'rejected') => {
        switch (status) {
            case 'accepted':
                return <Checkmark />;
            case 'pending':
                return <Clock />;
            case 'rejected':
                return <Close />;
        }
    };

    const respondToInvitation = (status: 'accepted' | 'rejected') => {
        if (!vault) return;
        respond({
            vaultId: vault.id,
            status,
        });
    };

    const toggleStatus = () => {
        respondToInvitation(ownData?.status === 'rejected' ? 'accepted' : 'rejected');
    };

    const getStatusTone = (status: 'accepted' | 'rejected' | 'pending'): StatusBadgeTone => {
        switch (status) {
            case 'accepted':
                return 'success';
            case 'rejected':
                return 'danger';
            case 'pending':
                return 'neutral';
        }
    };

    const ActionBadge = ({
        children,
        status,
        onClick,
    }: PropsWithChildren<{
        onClick: () => void;
        status: 'accepted' | 'rejected' | 'pending';
    }>) => {
        return (
            <div className="flex flex-col items-center justify-center gap-1">
                <StatusBadge
                    label={capitalize(status)}
                    icon={getStatusIcon(status)}
                    tone={getStatusTone(status)}
                />
                {vault.owners && vault.owners.length > 1 && (
                    <button
                        className="flex items-center justify-center text-xs underline opacity-50"
                        onClick={onClick}
                    >
                        {children}
                    </button>
                )}
            </div>
        );
    };

    const UserActions = ({ status }: { status: 'accepted' | 'rejected' | 'pending' }) => {
        if (status === 'pending') {
            return (
                <>
                    <CardAction
                        type={CardActionType.Button}
                        title="Accept"
                        onClick={() => respondToInvitation('accepted')}
                    />
                    <CardAction
                        type={CardActionType.Button}
                        title="Reject"
                        buttonType={'destructive'}
                        onClick={() => respondToInvitation('rejected')}
                    />
                </>
            );
        }
        return (
            <ActionBadge status={status} onClick={toggleStatus}>
                {status === 'accepted' ? 'Reject' : 'Accept'} instead.
            </ActionBadge>
        );
    };

    async function copy(text: string, toastMsg: string) {
        const copySuccess = await copyToClipboard(text);
        if (copySuccess) {
            toast(toastMsg);
        }
    }

    return (
        <div className="flex w-full flex-col gap-3">
            <div className="flex h-8 w-full items-center justify-between gap-xs">
                <div className="flex flex-row gap-xs">
                    <Chip
                        label="Owners"
                        selected={selectedTab === 'owners'}
                        onClick={() => setSelectedTab('owners')}
                    />
                    <Chip
                        label="Whitelist"
                        selected={selectedTab === 'whitelist'}
                        onClick={() => setSelectedTab('whitelist')}
                    />
                </div>
                {canManageWhitelist && selectedTab === 'whitelist' ? (
                    <Button
                        type={ButtonType.Ghost}
                        icon={<Add />}
                        onClick={() => setIsAddWhitelistDialogOpen(true)}
                    />
                ) : null}
            </div>
            {selectedTab === 'owners' ? (
                <div className="w-full flex-1 overflow-hidden">
                    <VirtualList
                        items={
                            vault.owners.sort((x, y) =>
                                x.address === account?.address ? 1 : 0,
                            ) ?? []
                        }
                        estimateSize={() => 88}
                        heightClassName="h-full max-h-[150px] pb-[10px]"
                        render={(owner, idx) => (
                            <div className="mb-2 [&>*]:h-14 [&>*]:max-h-14">
                                <Card type={CardType.Filled} key={owner.address}>
                                    <CardImage type={ImageType.BgSolid}>
                                        <span className="text-sm">{idx + 1}</span>
                                    </CardImage>
                                    <div className="flex w-full items-center gap-2">
                                        <div className="w-full">
                                            <div className="flex items-center gap-1">
                                                <Tooltip text={owner.address} maxWidth="auto">
                                                    <div className="text-sm">
                                                        {owner.address === account?.address
                                                            ? `You (${formatAddress(owner.address)})`
                                                            : formatAddress(owner.address)}
                                                    </div>
                                                </Tooltip>
                                                <button
                                                    className="opacity-50 transition-all hover:opacity-100"
                                                    onClick={() =>
                                                        copy(owner.address, 'Address copied.')
                                                    }
                                                >
                                                    <Copy />
                                                </button>
                                            </div>
                                            <div className="text-xs opacity-50">
                                                Weight: {owner.weight}/{vault.threshold}
                                            </div>
                                        </div>
                                        {/* <CardBody
                                                title={

                                                }
                                                subtitle={
                                                    <div className="flex items-center">

                                                    </div>
                                                }
                                            /> */}
                                        <div className="flex flex-col gap-2">
                                            {owner.address === account?.address ? (
                                                <UserActions status={owner.status} />
                                            ) : (
                                                <StatusBadge
                                                    label={capitalize(owner.status)}
                                                    icon={getStatusIcon(owner.status)}
                                                    tone={getStatusTone(owner.status)}
                                                />
                                            )}
                                        </div>
                                    </div>
                                </Card>
                            </div>
                        )}
                    />
                </div>
            ) : (
                <div className="flex w-full flex-1 flex-col gap-2 overflow-hidden">
                    {vault.whitelist.length ? (
                        <div className="w-full flex-1 overflow-hidden">
                            <VirtualList
                                items={vault.whitelist}
                                estimateSize={() => 72}
                                heightClassName="h-full max-h-[150px] pb-[10px]"
                                render={(address, idx) => (
                                    <div className="mb-2 [&>*]:h-14 [&>*]:max-h-14">
                                        <Card type={CardType.Filled} key={address}>
                                            <CardImage type={ImageType.BgSolid}>
                                                <span className="text-sm">{idx + 1}</span>
                                            </CardImage>
                                            <div className="flex w-full items-center gap-2">
                                                <div className="w-full">
                                                    <div className="flex items-center gap-1">
                                                        <Tooltip text={address} maxWidth="auto">
                                                            <div className="text-sm">
                                                                {formatAddress(address)}
                                                            </div>
                                                        </Tooltip>
                                                        <button
                                                            className="opacity-50 transition-all hover:opacity-100"
                                                            onClick={() =>
                                                                copy(address, 'Address copied.')
                                                            }
                                                        >
                                                            <Copy />
                                                        </button>
                                                    </div>
                                                </div>
                                                {canManageWhitelist ? (
                                                    <CardAction
                                                        type={CardActionType.Button}
                                                        title="Remove"
                                                        icon={<Delete />}
                                                        buttonType={ButtonType.Destructive}
                                                        buttonDisabled={removeMutation.isPending}
                                                        onClick={() =>
                                                            removeMutation.mutateAsync(address)
                                                        }
                                                    />
                                                ) : null}
                                            </div>
                                        </Card>
                                    </div>
                                )}
                            />
                        </div>
                    ) : (
                        <div className="flex w-full items-center justify-center text-xs opacity-50">
                            <NoData message={'No users whitelisted.'} />
                        </div>
                    )}
                    {canManageWhitelist ? (
                        <AddWhitelistUserDialog
                            open={isAddWhitelistDialogOpen}
                            setOpen={setIsAddWhitelistDialogOpen}
                            existingAddresses={vault.whitelist ?? []}
                            isSubmitting={addMutation.isPending}
                            onSubmit={addMutation.mutateAsync}
                        />
                    ) : null}
                </div>
            )}
        </div>
    );
}
