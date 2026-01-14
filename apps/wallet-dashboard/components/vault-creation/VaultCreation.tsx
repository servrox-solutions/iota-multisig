'use client';

import { useState } from 'react';

import { CreateVaultDialog } from '../dialogs/create-vault';
import { ImportVaultDialog } from '../dialogs/import-vault';
import { VaultCreationWelcome } from './VaultCreationWelcome';

// import more steps here…

export function VaultCreation() {
    const [createVaultDialogOpen, setCreateVaultDialogOpen] = useState(false);
    const [importVaultDialogOpen, setImportVaultDialogOpen] = useState(false);

    return (
        <div className="relative h-full w-full overflow-hidden">
            <VaultCreationWelcome
                key="vault-creation-welcome"
                onAddVaultOpen={() => setCreateVaultDialogOpen(true)}
                onImportVaultOpen={() => setImportVaultDialogOpen(true)}
            />
            <CreateVaultDialog
                open={createVaultDialogOpen}
                setOpen={(open) => setCreateVaultDialogOpen(open)}
            />
            <ImportVaultDialog
                open={importVaultDialogOpen}
                setOpen={(open) => setImportVaultDialogOpen(open)}
            />
        </div>
    );
}
