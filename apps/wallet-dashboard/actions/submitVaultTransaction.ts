'use server';

import { signatureFromSupabaseHex, transactionFromSupabaseHex } from '@/supabase';
import { Database } from '@/supabase/database.types';
import {
    getNetwork,
    IotaClient,
    IotaHTTPTransport,
    IotaTransactionBlockResponse,
} from '@iota/iota-sdk/client';
import { Ed25519PublicKey } from '@iota/iota-sdk/keypairs/ed25519';
import { fromBase64 } from '@iota/iota-sdk/utils';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { MultiSigPublicKey } from '../../../sdk/typescript/dist/esm/multisig/publickey';
import { verifyPersonalMessageSignature } from '../../../sdk/typescript/dist/esm/verify/verify';

const supabaseAdmin: SupabaseClient<Database> = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
        auth: {
            persistSession: false,
            autoRefreshToken: false,
        },
    },
);

interface OwnerJson {
    status: string;
    weight: number;
    signature?: string;
    public_key: string;
    owner_address: string;
}

function isDefined<T>(value: T | null | undefined): value is T {
    return value !== null && value !== undefined;
}

export async function submitVaultTransaction({
    transactionId,
    payloadBase64,
    signature,
}: {
    transactionId: number;
    payloadBase64: string;
    signature: string;
}): Promise<IotaTransactionBlockResponse> {
    const payload = fromBase64(payloadBase64);
    const { iss, exp } = JSON.parse(new TextDecoder().decode(payload));
    if (!iss || !exp) throw new Error('Invalid payload');

    const publicKey = await verifyPersonalMessageSignature(payload, signature);
    const isValid = await new Ed25519PublicKey(publicKey.toBase64()).verifyPersonalMessage(
        payload,
        signature,
    );
    if (!isValid) {
        throw new Error('Provided signature is invalid.');
    }
    const submitAddress = publicKey.toIotaAddress();

    const { data, error } = await supabaseAdmin
        .rpc('get_execute_transaction_data', {
            p_proposed_transaction_id: transactionId,
        })
        .maybeSingle();

    if (error) {
        throw error;
    }
    if (!data) {
        throw new Error('No transaction data available.');
    }
    const owners = data.owners as unknown as OwnerJson[];
    const isOwner =
        owners.find((owner: OwnerJson) => owner.owner_address === submitAddress) !== undefined;

    if (!isOwner) {
        throw new Error("Cannot execute transaction from a vault you're no owner.");
    }

    if (!data.is_executable) {
        throw new Error('Cannot execute transaction: Threshold not reached.');
    }

    const multiSigPublicKey = MultiSigPublicKey.fromPublicKeys({
        threshold: data.vault_threshold,
        publicKeys: owners.map((owner) => ({
            publicKey: new Ed25519PublicKey(owner.public_key),
            weight: owner.weight,
        })),
    });

    const transaction = transactionFromSupabaseHex(data.transaction_payload);

    const signatures = owners
        .map((owner) => owner.signature)
        .filter(isDefined)
        .map((signature) => {
            return signatureFromSupabaseHex(signature);
        });

    const combinedSignature = multiSigPublicKey.combinePartialSignatures(signatures);

    const network = getNetwork(data.network);
    const client = new IotaClient({
        transport: new IotaHTTPTransport({ url: network.url }),
    });
    // transaction.setSender(multiSigPublicKey.toIotaAddress());
    const txBinary = await transaction.build({
        client,
    });

    // TODO: remove signatures from table after execution
    const res = await client.executeTransactionBlock({
        transactionBlock: txBinary,
        signature: combinedSignature,
    });
    await supabaseAdmin.from('proposed_transactions').update({
        id: transactionId,
        executed_by: submitAddress,
        transaction_digest: res.digest,
    });
    return res;
}
