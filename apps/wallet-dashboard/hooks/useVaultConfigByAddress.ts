// Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { Vault } from '@/lib/types';
import { useCurrentAccount, useIotaClient } from '@iota/dapp-kit';
import { bcs } from '@iota/iota-sdk/bcs';
import { IotaClient } from '@iota/iota-sdk/client';
import { parseSerializedSignature } from '@iota/iota-sdk/cryptography';
import { fromBase64, isValidIotaAddress } from '@iota/iota-sdk/utils';
import { skipToken, useQuery } from '@tanstack/react-query';
import { MultiSigPublicKey } from '../../../sdk/typescript/dist/esm/multisig/publickey';

export interface VaultInvitationResponse {
    vaultId: number;
    status: 'accepted' | 'rejected';
}

const getVaultConfigViaTransactionBlocks = async (
    client: IotaClient,
    vaultAddress: string,
    accountAddress: string,
): Promise<Pick<Vault, 'owners' | 'threshold'> | null> => {
    const resp = await client.queryTransactionBlocks({
        filter: {
            FromAddress: vaultAddress,
        },
        limit: 1,
        options: { showRawInput: true },
    });
    if (!resp.data) {
        throw new Error('could not query transaction blocks.');
    }
    if (resp.data.length === 0 || !resp.data[0].rawTransaction) {
        return null;
    }
    const signed_data = bcs.SenderSignedData.parse(fromBase64(resp.data[0].rawTransaction));

    if (!signed_data || signed_data.length === 0) {
        return null;
    }
    const multisigSignature = signed_data[0].txSignatures
        .map((txSignature) => parseSerializedSignature(txSignature))
        .find((parsed) => parsed.signatureScheme === 'MultiSig');

    if (!multisigSignature) {
        return null;
    }
    const multisig = new MultiSigPublicKey(multisigSignature.multisig.multisig_pk);

    return {
        threshold: multisig.getThreshold(),
        owners: multisig.getPublicKeys().map((pk) => ({
            address: pk.publicKey.toIotaAddress(),
            weight: pk.weight,
            status: pk.publicKey.toIotaAddress() === accountAddress ? 'accepted' : 'pending',
            publicKey: pk.publicKey.toIotaPublicKey(),
        })),
    } as Pick<Vault, 'threshold' | 'owners'>;
};

export const useVaultConfigByAddress = (vaultAddress: string) => {
    const client = useIotaClient();
    const account = useCurrentAccount();

    return useQuery({
        // eslint-disable-next-line @tanstack/query/exhaustive-deps
        queryKey: ['vault', 'get-vault-config-by-address', vaultAddress],
        queryFn:
            vaultAddress && account && isValidIotaAddress(vaultAddress)
                ? () => getVaultConfigViaTransactionBlocks(client, vaultAddress, account.address)
                : skipToken,
        meta: { persist: true },
        // If no data was found, refetch every time. Otherwise, invalidate after 10 minutes
        staleTime: (x) => (!x.state.data ? 0 : 10 * 60 * 1000),
        enabled:
            !!vaultAddress &&
            !!account &&
            isValidIotaAddress(vaultAddress) &&
            isValidIotaAddress(account.address),
        // Never refetch automatically
        refetchInterval: false,
    });
};
