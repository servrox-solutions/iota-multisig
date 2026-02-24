'use client';

import { AddWhitelistUserDialog } from '@/components/dialogs/vault-whitelist/AddWhitelistUserDialog';
import { Vault } from '@/lib/types';
import { Copy, Delete } from '@iota/apps-ui-icons';
import {
    ButtonType,
    Card,
    CardAction,
    CardActionType,
    CardImage,
    CardType,
    ImageType,
    Tooltip
} from '@iota/apps-ui-kit';
import { NoData, toast, useCopyToClipboard, VirtualList } from '@iota/core';
import { useCurrentAccount } from '@iota/dapp-kit';
import { formatAddress } from '@iota/iota-sdk/utils';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { addVaultWhitelistEntry, removeVaultWhitelistEntry } from 'iota-vault-sdk';

export function VaultWhitelistUsers({
    vault,
    isAddWhitelistDialogOpen,
    setIsAddWhitelistDialogOpen,
}: {
    vault: Vault;
    isAddWhitelistDialogOpen: boolean;
    setIsAddWhitelistDialogOpen: (open: boolean) => void;
}) {
    const account = useCurrentAccount();
    const copyToClipboard = useCopyToClipboard();
    const queryClient = useQueryClient();
    const vaultsQueryKey = ['vault', 'get-vaults-by-user', account?.address];
    const ownData = vault.owners.find((owner) => owner.address === account?.address);
    const canManageWhitelist = ownData?.status === 'accepted';

    const addMutation = useMutation({
        mutationFn: async (address: string) => {
            return addVaultWhitelistEntry({ vaultId: vault.id, address });
        },
        onMutate: async (address) => {
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

    async function copy(text: string) {
        const copySuccess = await copyToClipboard(text);
        if (copySuccess) {
            toast('Address copied.');
        }
    }

    return (
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
                                                        {account?.address === address
                                                            ? `You (${formatAddress(address)})`
                                                            : formatAddress(address)}
                                                    </div>
                                                </Tooltip>
                                                <button
                                                    className="opacity-50 transition-all hover:opacity-100"
                                                    onClick={() => copy(address)}
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
                                                onClick={() => removeMutation.mutateAsync(address)}
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
                    existingAddresses={[
                        ...vault.owners.map((owner) => owner.address),
                        ...vault.whitelist,
                    ]}
                    isSubmitting={addMutation.isPending}
                    onSubmit={addMutation.mutateAsync}
                />
            ) : null}
        </div>
    );
}
