// Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0
'use client';

import { Button, ButtonType, Header, Panel } from '@iota/apps-ui-kit';

export interface VaultCreationWelcomeProps {
    onOpen: (evt: React.MouseEvent<HTMLButtonElement>) => void;
}

export function VaultCreationWelcome({ onOpen }: VaultCreationWelcomeProps) {
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
                <div className="flex items-center justify-center">
                    <Button
                        type={ButtonType.Primary}
                        text="Add Vault"
                        fullWidth={false}
                        onClick={onOpen}
                    />
                </div>
            </div>
        </Panel>
    );
}
