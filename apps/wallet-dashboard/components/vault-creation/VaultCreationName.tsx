// Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0
'use client';

import { Input, InputType, Panel } from '@iota/apps-ui-kit';
import { useField } from 'formik';

export interface VaultCreationNameProps {
    onNext?: (evt: React.MouseEvent<HTMLButtonElement>) => void;
    fields: {
        vaultName: string;
    };
}

export function VaultCreationName({ onNext, fields }: VaultCreationNameProps) {
    const [nameField, meta] = useField(fields.vaultName);

    return (
        <Panel>
            <div
                className="flex flex-1 flex-col items-center justify-center gap-4 px-sm pb-md pt-sm"
                data-testid="home-page-activity-section"
            >
                <Input
                    label="Vault Name"
                    type={InputType.Text}
                    placeholder={'e.g. Personal Vault'}
                    errorMessage={meta.touched ? meta.error : undefined}
                    {...nameField}
                />
            </div>
        </Panel>
    );
}
