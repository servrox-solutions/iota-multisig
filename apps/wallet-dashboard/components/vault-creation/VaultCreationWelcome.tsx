// Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0
'use client';

import { Button, ButtonType, Header, Panel } from '@iota/apps-ui-kit';

export interface VaultCreationWelcomeProps {
    onAddVaultOpen: (evt: React.MouseEvent<HTMLButtonElement>) => void;
    onImportVaultOpen: (evt: React.MouseEvent<HTMLButtonElement>) => void;
}

export function VaultCreationWelcome({
    onAddVaultOpen,
    onImportVaultOpen,
}: VaultCreationWelcomeProps) {
    return (
        <Panel>
            <div className="flex flex-1 flex-col items-center justify-center gap-4 px-sm pb-md pt-sm">
                <div className="flex flex-col">
                    <Header title="What is a vault?" titleCentered={true} />
                    <span className="max-w-sm text-center text-label-lg text-iota-neutral-60">
                        A Vault is a multisig wallet that requires multiple signatures to execute
                        transactions.
                    </span>
                </div>
                <div className="flex flex-col items-center justify-center gap-1">
                    <Button
                        type={ButtonType.Primary}
                        text="Add Vault"
                        fullWidth={false}
                        onClick={onAddVaultOpen}
                    />
                    <span className="text-xs text-iota-neutral-60">
                        <button className="underline" onClick={onImportVaultOpen}>
                            or import Vault
                        </button>
                    </span>
                </div>
            </div>
        </Panel>
    );
}
