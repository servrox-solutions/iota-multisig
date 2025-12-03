// Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { isValidIotaAddress } from '@iota/iota-sdk/utils';
import * as Yup from 'yup';
import { UserService } from '../services';

export interface MultisigSignerInput {
    address: string;
    weight: number;
}

export interface MultisigCreationFormValues {
    vaultName: string;
    owners: MultisigSignerInput[];
    threshold: number;
}

const MIN_VAULT_NAME = 3;
const MAX_VAULT_NAME = 64;

export function createVaultCreationSchemaForm() {
    return Yup.object({
        vaultName: Yup.string()
            .ensure()
            .trim()
            .required('Vault name is required')
            .min(MIN_VAULT_NAME, `Name must be at least ${MIN_VAULT_NAME} characters`)
            .max(MAX_VAULT_NAME, `Name cannot exceed ${MAX_VAULT_NAME} characters`),

        owners: Yup.array()
            .of(
                Yup.object({
                    address: Yup.string()
                        .ensure()
                        .trim()
                        .required('Owner address key is required')
                        .test('is-valid-address', 'Invalid owner address', (value) =>
                            isValidIotaAddress(value),
                        )
                        .test(
                            'unique-address',
                            'Each owner must have a unique address',
                            function (value) {
                                if (!value) return true;

                                const { path } = this;
                                // index of current item in the array
                                const index = Number(path.match(/\[(\d+)\]/)?.[1]);

                                // full array (parent’s parent)
                                const all = (this.options as any).from?.[1]?.value?.publicKeys;
                                if (!Array.isArray(all)) return true;

                                const normalized = value.trim().toLowerCase();

                                return (
                                    all.filter(
                                        (s, i) =>
                                            i !== index &&
                                            s.address?.trim().toLowerCase() === normalized,
                                    ).length === 0
                                );
                            },
                        )
                        .test(
                            'check-get-public-key',
                            'User must login before adding is possible.',
                            function (value) {
                                return UserService.getPublicKeyForAddress(value)
                                    .then((_) => true)
                                    .catch((err) => false);
                            },
                        ),
                    weight: Yup.number()
                        .required('Weight is required')
                        .typeError('Weight must be a number')
                        .integer('Weight must be an integer')
                        .min(1, 'Weight must be at least 1'),
                }),
            )
            .min(1, 'At least one signer is required')
            .required(),

        threshold: Yup.number()
            .required('Threshold is required')
            .typeError('Threshold must be a number')
            .integer('Threshold must be an integer')
            .min(1, 'Threshold must be at least 1')
            .test(
                'threshold-not-too-high',
                'Threshold cannot exceed the total weight of all signers',
                function (value) {
                    const { owners } = this.parent as MultisigCreationFormValues;

                    if (!Array.isArray(owners) || typeof value !== 'number') {
                        return true;
                    }

                    const totalWeight = owners.reduce((sum, s) => sum + (s.weight || 0), 0);

                    return value <= totalWeight;
                },
            ),
    }) satisfies Yup.ObjectSchema<MultisigCreationFormValues>;
}

export type VaultCreationFormValues = Yup.InferType<
    ReturnType<typeof createVaultCreationSchemaForm>
>;
