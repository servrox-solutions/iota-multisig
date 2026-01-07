'use client';

import { VaultOwners } from '@/components/vault-owners';
import { VAULT_ROUTE } from '@/lib/constants/routes.constants';
import { Vault } from '@/lib/types';
import { Copy } from '@iota/apps-ui-icons';
import { Dialog, DialogContent, DialogPosition, Header } from '@iota/apps-ui-kit';
import { toast, useCopyToClipboard } from '@iota/core';
import { useSearchParams } from 'next/navigation';

export interface VaultInvitationDialogProps {
    setOpen: (open: boolean) => void;
    vault: Vault | null;
}

export function VaultInvitationDialog({ setOpen, vault }: VaultInvitationDialogProps) {

    const copyToClipboard = useCopyToClipboard();
    const searchParams = useSearchParams();

    async function copy(text: string, toastMsg: string) {
        const copySuccess = await copyToClipboard(text);
        if (copySuccess) {
            toast(toastMsg);
        }
    }

    return (
        vault && (
            <Dialog open={!!vault} onOpenChange={setOpen}>
                <DialogContent
                    containerId="overlay-portal-container"
                    position={DialogPosition.Right}
                >
                    <div className="h-full overflow-auto">
                        <div className="flex flex-1 flex-col items-center justify-center gap-4 px-sm pb-md pt-sm">
                            <div className="flex w-full flex-col gap-5">
                                <div className="flex flex-col items-center justify-center">
                                    <Header
                                        title={'Vault Invitation: ' + vault?.vaultName}
                                        titleCentered={true}
                                    />
                                    <span className="max-w-sm text-center text-label-lg text-iota-neutral-60">
                                        You can get started once all owners have accepted.
                                    </span>
                                </div>
                                <VaultOwners vaultId={vault.id} />
                                <button className="text-xs underline opacity-50 flex justify-center items-center gap-1" onClick={() => copy(`${window.location.host}${VAULT_ROUTE.path}?redirect=${VAULT_ROUTE.path}/overview?invitation=${searchParams.get("invitation")}`, 'Invitation link copied.')}>
                                    Copy Invitation Link <Copy />
                                </button>
                            </div>
                        </div>
                    </div>
                </DialogContent>
            </Dialog >
        )
    );
}
