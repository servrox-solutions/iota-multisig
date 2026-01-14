// Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0
'use client';

import { Input, InputType, Panel } from '@iota/apps-ui-kit';
import { useField } from 'formik';

export interface VaultCreationAddressProps {
    fields: {
        vaultName: string;
    };
}

export function VaultCreationAddress({ fields }: VaultCreationAddressProps) {
    const [nameField, meta] = useField(fields.vaultName);

    return (
        <Panel>
            <div className="flex flex-1 flex-col items-center justify-center gap-4 px-sm pb-md pt-sm">
                <Input
                    label="Vault Address"
                    type={InputType.Text}
                    placeholder={'0x0...'}
                    errorMessage={meta.touched ? meta.error : undefined}
                    {...nameField}
                />
            </div>
        </Panel>
    );
}
