// Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { Ed25519PublicKey } from '@iota/iota-sdk/keypairs/ed25519';
import * as Yup from 'yup';

export interface MultisigSignerInput {
    publicKey: string;
    weight: number;
}

export interface MultisigCreationFormValues {
    vaultName: string;
    publicKeys: MultisigSignerInput[];
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

        publicKeys: Yup.array()
            .of(
                Yup.object({
                    publicKey: Yup.string()
                        .ensure()
                        .trim()
                        .required('Owner public key is required')
                        .test('is-valid-publickey', 'Invalid signer public key', (value) => {
                            try {
                                new Ed25519PublicKey(value);
                                return true;
                            } catch (_) {
                                return false;
                            }
                        })
                        .test(
                            'unique-publicKey',
                            'Each signer must have a unique address',
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
                                            s.publicKey?.trim().toLowerCase() === normalized,
                                    ).length === 0
                                );
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
                    const { publicKeys } = this.parent as MultisigCreationFormValues;

                    if (!Array.isArray(publicKeys) || typeof value !== 'number') {
                        return true;
                    }

                    const totalWeight = publicKeys.reduce((sum, s) => sum + (s.weight || 0), 0);

                    return value <= totalWeight;
                },
            ),
    }) satisfies Yup.ObjectSchema<MultisigCreationFormValues>;
}

export type VaultCreationFormValues = Yup.InferType<
    ReturnType<typeof createVaultCreationSchemaForm>
>;
