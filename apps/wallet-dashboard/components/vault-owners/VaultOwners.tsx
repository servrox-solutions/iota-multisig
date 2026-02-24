'use client';

import { StatusBadge, type StatusBadgeTone } from '@/components/badges/StatusBadge';
import { usePersistedNetwork } from '@/hooks';
import { useVaultRespondInvitation } from '@/hooks/useVaultRespondInvitation';
import { Vault } from '@/lib/types';
import { Checkmark, Clock, Close, Copy } from '@iota/apps-ui-icons';
import { Card, CardAction, CardActionType, CardImage, CardType, ImageType, Tooltip } from '@iota/apps-ui-kit';
import { capitalize, toast, useCopyToClipboard, VirtualList } from '@iota/core';
import { useCurrentAccount } from '@iota/dapp-kit';
import { getNetwork } from '@iota/iota-sdk/client';
import { formatAddress } from '@iota/iota-sdk/utils';
import { useRouter } from 'next/navigation';
import { PropsWithChildren } from 'react';

export function VaultOwners({ vault }: { vault: Vault }) {
    const account = useCurrentAccount();
    const router = useRouter();
    const copyToClipboard = useCopyToClipboard();
    const { handleNetworkChange } = usePersistedNetwork();
    const { mutate: respond } = useVaultRespondInvitation({
        onSuccess: ({ status, vaultId }) => {
            handleNetworkChange(getNetwork(vault.network));
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

    const respondToInvitation = (status: 'accepted' | 'rejected') => {
        respond({
            vaultId: vault.id,
            status,
        });
    };

    const toggleStatus = () => {
        respondToInvitation(ownData?.status === 'rejected' ? 'accepted' : 'rejected');
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
                {vault.owners.length > 1 && (
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
                <div className="flex gap-2">
                    <Tooltip text="Accept invitation">
                        <CardAction
                            type={CardActionType.Button}
                            icon={<Checkmark />}
                            onClick={() => respondToInvitation('accepted')}
                        />
                    </Tooltip>
                    <Tooltip text="Reject invitation">
                        <CardAction
                            type={CardActionType.Button}
                            icon={<Close />}
                            buttonType={'destructive'}
                            onClick={() => respondToInvitation('rejected')}
                        />
                    </Tooltip>
                </div>
            );
        }
        return (
            <ActionBadge status={status} onClick={toggleStatus}>
                {status === 'accepted' ? 'Reject' : 'Accept'} instead.
            </ActionBadge>
        );
    };

    async function copy(text: string) {
        const copySuccess = await copyToClipboard(text);
        if (copySuccess) {
            toast('Address copied.');
        }
    }

    return (
        <div className="w-full flex-1 overflow-hidden">
            <VirtualList
                items={vault.owners.sort((x, y) => (x.address === account?.address ? 1 : 0))}
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
                                            onClick={() => copy(owner.address)}
                                        >
                                            <Copy />
                                        </button>
                                    </div>
                                    <div className="text-xs opacity-50">
                                        Weight: {owner.weight}/{vault.threshold}
                                    </div>
                                </div>
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
    );
}
