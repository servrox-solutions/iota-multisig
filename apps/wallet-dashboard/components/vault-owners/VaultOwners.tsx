'use client';

import { useVaultById } from '@/hooks/useVaultById';
import { useVaultRespondInvitation } from '@/hooks/useVaultRespondInvitation';
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
import { capitalize, toast } from '@iota/core';
import { useCurrentAccount } from '@iota/dapp-kit';
import { formatAddress } from '@iota/iota-sdk/utils';
import clsx from 'clsx';
import { useRouter } from 'next/navigation';

// import more steps here…

export function VaultOwners({ vaultId }: { vaultId: number }) {
    const { data: vault } = useVaultById(vaultId);
    const account = useCurrentAccount();
    const router = useRouter();
    const { mutate: respond } = useVaultRespondInvitation({
        onSuccess: ({ status, vaultId }) => {
            const otherUsersAccepted = vault?.owners
                .filter((owner) => owner.address !== account?.address)
                .every((owner) => owner.status === 'accepted');

            if (otherUsersAccepted && status === 'accepted') {
                router.push(`/vault/${vaultId}`);
            } else if (otherUsersAccepted && status === 'rejected') {
                router.push(`/vault/overview?invitation=${vaultId}`);
            }
        }
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

    const userActions = (status: 'accepted' | 'rejected' | 'pending') => {
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
            <div className="flex flex-col items-center justify-center gap-1">
                <div
                    className={clsx(
                        'flex items-center justify-center gap-2 rounded-full border-2 px-2 py-1',
                        status === 'rejected' && 'border-iota-error-30 text-iota-error-30',
                        status === 'accepted' && 'border-iota-primary-60 text-iota-primary-60',
                    )}
                >
                    {getStatusIcon(status)}
                    <span className="text-xs">{capitalize(status)}</span>
                </div>
                {/* <CardAction
                    type={CardActionType.Button}
                    title={}
                    icon={}
                    buttonDisabled={true}
                    buttonType={'secondary'}
                /> */}
                <button className="text-xs underline opacity-50" onClick={toggleStatus}>
                    {status === 'accepted' ? 'Reject' : 'Accept'} instead.
                </button>

                {/* <CardAction
                    type={CardActionType.Button}
                    buttonType={'ghost'}
                    icon={
                        <div className="flex flex-col gap-1">
                            <span className="text-xs">{`You ${capitalize(status)}.`}</span>

                            <span className="text-xs underline">
                                {status === 'accepted' ? 'Reject' : 'Accept'} instead.
                            </span>
                        </div>
                    }
                    onClick={() => toggleStatus()}
                />
                <span></span> */}
            </div>
        );
    };

    function handleOnCopySuccess() {
        toast('Address copied');
    }

    return (
        <div className="flex w-full flex-col">
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
                                        onClick={() => {
                                            navigator.clipboard.writeText(owner.address);
                                            handleOnCopySuccess();
                                        }}
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
                                    userActions(owner.status)
                                ) : (
                                    <CardAction
                                        type={CardActionType.Button}
                                        title={capitalize(owner.status)}
                                        icon={getStatusIcon(owner.status)}
                                        buttonDisabled={true}
                                        buttonType={'secondary'}
                                    />
                                )}
                            </div>
                        </div>
                    </Card>
                ))}
        </div>
    );
}
