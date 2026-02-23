'use client';

import { Vault } from '@/lib/types';
import { Add } from '@iota/apps-ui-icons';
import { Button, ButtonType, Chip } from '@iota/apps-ui-kit';
import { useCurrentAccount } from '@iota/dapp-kit';
import { useState } from 'react';
import { VaultOwners } from './VaultOwners';
import { VaultWhitelistUsers } from './VaultWhitelistUsers';

export function VaultAccessOverview({ vault }: { vault: Vault }) {
    const [selectedTab, setSelectedTab] = useState<'owners' | 'whitelist'>('owners');
    const address = useCurrentAccount()?.address;
    const ownData = vault.owners.find((owner) => owner.address === address);
    const canManageWhitelist = ownData?.status === 'accepted';
    const [isAddWhitelistDialogOpen, setIsAddWhitelistDialogOpen] = useState(false);
    return (
        <div className="flex h-full w-full flex-col gap-3">
            <div className="flex h-8 w-full items-center justify-start gap-xs">
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
                {selectedTab === 'whitelist' && (
                    <div className="flex h-8 w-full items-center justify-end">
                        {canManageWhitelist ? (
                            <Button
                                type={ButtonType.Ghost}
                                icon={<Add />}
                                onClick={() => setIsAddWhitelistDialogOpen(true)}
                            />
                        ) : null}
                    </div>
                )}
            </div>
            {selectedTab === 'owners' ? (
                <VaultOwners vault={vault} />
            ) : (
                <VaultWhitelistUsers
                    vault={vault}
                    isAddWhitelistDialogOpen={isAddWhitelistDialogOpen}
                    setIsAddWhitelistDialogOpen={setIsAddWhitelistDialogOpen}
                />
            )}
        </div>
    );
}
