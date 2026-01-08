'use client';

import { usePersistedNetwork } from '@/hooks';
import { useVaultRespondInvitation } from '@/hooks/useVaultRespondInvitation';
import { useVaultsByUser } from '@/hooks/useVaultsByUser';
import { Checkmark, Clock, Close, Copy } from '@iota/apps-ui-icons';
import {
    Card,
    CardAction,
    CardActionType,
    CardImage,
    CardType,
    ImageType,
    Tooltip,
} from '@iota/apps-ui-kit';
import { capitalize, toast, useCopyToClipboard } from '@iota/core';
import { useCurrentAccount } from '@iota/dapp-kit';
import { getNetwork } from '@iota/iota-sdk/client';
import { formatAddress } from '@iota/iota-sdk/utils';
import clsx from 'clsx';
import { useRouter } from 'next/navigation';
import { PropsWithChildren } from 'react';

// import more steps here…

export function VaultOwners({ vaultId }: { vaultId: number }) {
    const account = useCurrentAccount();
    const { data: vaults } = useVaultsByUser(account?.address);
    const router = useRouter();
    const copyToClipboard = useCopyToClipboard();
    const vault = vaults?.find((vault) => vault.id === vaultId);
    const { handleNetworkChange } = usePersistedNetwork();
    const { mutate: respond } = useVaultRespondInvitation({
        onSuccess: ({ status, vaultId }) => {
            // Switch to the network of the vault so the user can get started right away.
            if (vault) {
                handleNetworkChange(getNetwork(vault.network));
            }
            const otherUsersAccepted = vault?.owners
                .filter((owner) => owner.address !== account?.address)
                .every((owner) => owner.status === 'accepted');
            if (otherUsersAccepted && status === 'accepted') {
                router.push(`/vault/${vaultId}`);
            } else if (otherUsersAccepted && status === 'rejected') {
                router.push(`/vault/overview?invitation=${vaultId}`);
            }
        },
    });
    const ownData = vault?.owners.find((owner) => owner.address === account?.address);

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

    const StatusBadge = ({ status }: { status: 'accepted' | 'rejected' | 'pending' }) => {
        return (
            <div
                className={clsx(
                    'flex items-center justify-center gap-2 rounded-full border-2 px-2 py-1',
                    status === 'rejected' && 'border-iota-error-30 text-iota-error-30',
                    status === 'accepted' && 'border-iota-primary-60 text-iota-primary-60',
                    status === 'pending' && 'opacity-50',
                )}
            >
                {getStatusIcon(status)}
                <span className="text-xs">{capitalize(status)}</span>
            </div>
        );
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
                <StatusBadge status={status} />
                {vault?.owners && vault.owners.length > 1 && (
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
        <div className="flex w-full flex-col gap-1">
            {vault?.owners
                .sort((x, y) => (x.address === account?.address ? 1 : 0))
                .map((owner, idx) => (
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
                                        onClick={() => copy(owner.address, 'Address copied.')}
                                    >
                                        <Copy />
                                    </button>
                                </div>
                                <div className="text-xs opacity-50">
                                    Weight: {owner.weight}/{vault?.threshold}
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
                                    <StatusBadge status={owner.status} />
                                )}
                            </div>
                        </div>
                    </Card>
                ))}
        </div>
    );
}
