'use client';

import { VaultOwners } from '@/components/vault-owners';
import { Vault } from '@/lib/types';
import { Dialog, DialogContent, DialogPosition, Header } from '@iota/apps-ui-kit';

export interface VaultInvitationDialogProps {
    setOpen: (open: boolean) => void;
    vault: Vault | null;
}

export function VaultInvitationDialog({ setOpen, vault }: VaultInvitationDialogProps) {
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
                            </div>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        )
    );
}
