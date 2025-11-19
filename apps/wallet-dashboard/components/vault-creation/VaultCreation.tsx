'use client';

import { useState } from 'react';

import { CreateVaultDialog } from '../dialogs/create-vault';
import { VaultCreationWelcome } from './VaultCreationWelcome';

// import more steps here…

export function VaultCreation() {
    const [dialogOpen, setDialogOpen] = useState(false);

    return (
        <div className="relative h-full w-full overflow-hidden">
            <VaultCreationWelcome key="vault-creation-welcome" onOpen={() => setDialogOpen(true)} />
            <CreateVaultDialog open={dialogOpen} setOpen={(open) => setDialogOpen(open)} />
        </div>
    );
}
