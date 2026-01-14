// Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { Owner } from '@/supabase/json-types';
import { Network } from '@iota/iota-sdk/client';
import { isValidIotaAddress } from '@iota/iota-sdk/utils';
import * as Yup from 'yup';
import { NonEmptyArray } from '../types';

export interface MultisigSignerInput {
    address: string;
    weight: number;
    publicKey?: string;
}

export interface MultisigCreationFormValues {
    vaultName: string;
    owners: MultisigSignerInput[];
    threshold: number;
    networks: Network[];
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

        creatorAddress: Yup.string()
            .ensure()
            .trim()
            .test('is-valid-address', 'Invalid owner address', (value) => isValidIotaAddress(value))
            .required('Creator Address is required'),

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
                                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                const all = (this.options as any).from?.[1]?.value?.owners?.map(
                                    (owner: Owner) => owner?.address?.trim()?.toLowerCase(),
                                );
                                if (!Array.isArray(all)) return true;

                                const normalized = value.trim().toLowerCase();

                                return (
                                    all.filter(
                                        (s, i) =>
                                            i !== index && s?.trim().toLowerCase() === normalized,
                                    ).length === 0
                                );
                            },
                        ),
                    weight: Yup.number()
                        .required('Weight is required')
                        .typeError('Weight must be a number')
                        .integer('Weight must be an integer')
                        .min(1, 'Weight must be at least 1'),
                    publicKey: Yup.string().typeError('Public Key must be a string'),
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
        networks: Yup.array()
            .of(
                Yup.mixed<Network>()
                    .oneOf(Object.values(Network), 'Invalid network')
                    .defined('Network is required'),
            )
            .min(1, 'At least one network must be selected')
            .transform((value) => value as NonEmptyArray<Network>)
            .defined(),
    }) satisfies Yup.ObjectSchema<MultisigCreationFormValues>;
}

export type VaultCreationFormValues = Yup.InferType<
    ReturnType<typeof createVaultCreationSchemaForm>
>;

export const createVaultImportSchemaForm = () => {
    return createVaultCreationSchemaForm().shape({
        vaultAddress: Yup.string()
            .ensure()
            .trim()
            .test('is-valid-address', 'Invalid vault address', (value) => isValidIotaAddress(value))
            .required('Vault Address is required'),
    });
};

export type VaultImportFormValues = Yup.InferType<ReturnType<typeof createVaultImportSchemaForm>>;
