// Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

'use client';

import { ProposedTransaction } from '@/hooks/useQueryVaultProposedTransactions';
import { useVaultsByUser } from '@/hooks/useVaultsByUser';
import { Checkmark, Clock, Close } from '@iota/apps-ui-icons';
import { StatusBadge, type StatusBadgeTone } from '@/components/badges/StatusBadge';
import { Card, CardImage, CardType, ImageType, Tooltip } from '@iota/apps-ui-kit';
import { useCurrentAccount } from '@iota/dapp-kit';
import { formatAddress } from '@iota/iota-sdk/utils';
import { getProposedTransactionUserStatus } from '@/lib/utils/transaction';

interface VaultProposedTransactionOwnersProps {
    transaction: ProposedTransaction;
    vaultId: number;
}

export function VaultProposedTransactionOwners({
    transaction,
    vaultId,
}: VaultProposedTransactionOwnersProps) {
    const account = useCurrentAccount();
    const address = account?.address;
    const { data: vaults } = useVaultsByUser(address);
    const vault = vaults?.find((x) => x.id === vaultId);
    const threshold = vault?.threshold ?? 0;

    const getStatusIcon = (status: 'Approved' | 'Rejected' | 'Pending') => {
        switch (status) {
            case 'Approved':
                return <Checkmark />;
            case 'Rejected':
                return <Close />;
            case 'Pending':
                return <Clock />;
        }
    };

    const getStatusTone = (status: 'Approved' | 'Rejected' | 'Pending'): StatusBadgeTone => {
        switch (status) {
            case 'Approved':
                return 'success';
            case 'Rejected':
                return 'danger';
            case 'Pending':
                return 'neutral';
        }
    };

    return (
        <div className="flex w-full flex-col gap-1">
            {vault?.owners
                .sort((x, y) => (x.address === address ? 1 : 0))
                .map((owner, idx) => {
                    const status = getProposedTransactionUserStatus(
                        transaction,
                        owner.address,
                    );

                    return (
                        <Card type={CardType.Filled} key={owner.address}>
                            <CardImage type={ImageType.BgSolid}>
                                <span className="text-sm">{idx + 1}</span>
                            </CardImage>
                            <div className="flex w-full items-center gap-2">
                                <div className="w-full">
                                    <div className="flex items-center gap-1">
                                        <Tooltip text={owner.address} maxWidth="auto">
                                            <div className="text-sm">
                                                {owner.address === address
                                                    ? `You (${formatAddress(owner.address)})`
                                                    : formatAddress(owner.address)}
                                            </div>
                                        </Tooltip>
                                    </div>
                                    <div className="text-xs opacity-50">
                                        Weight: {owner.weight}/{threshold}
                                    </div>
                                </div>
                                <div className="flex flex-col gap-2">
                                    <StatusBadge
                                        label={status}
                                        icon={getStatusIcon(status)}
                                        tone={getStatusTone(status)}
                                    />
                                </div>
                            </div>
                        </Card>
                    );
                })}
        </div>
    );
}
