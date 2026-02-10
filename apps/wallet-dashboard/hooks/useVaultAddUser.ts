// Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { useMutation } from '@tanstack/react-query';
import { upsertVaultOwner } from 'iota-vault-sdk';

export interface AddUserData {
    address: string;
    publicKey?: string;
}

export const useAddVaultUser = () => {
    return useMutation({
        mutationFn: (userData: AddUserData) =>
            upsertVaultOwner({ address: userData.address, publicKey: userData.publicKey }),
    });
};
