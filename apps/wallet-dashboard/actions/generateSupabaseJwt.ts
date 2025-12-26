'use server';

import { generateAuthToken } from '@iota/core/supabase/genererateAuthToken';
import { Ed25519PublicKey } from '@iota/iota-sdk/keypairs/ed25519';
import { fromBase64 } from '@iota/iota-sdk/utils';
import { verifyPersonalMessageSignature } from '../../../sdk/typescript/dist/esm/verify/verify';
export async function generateSupabaseJwt({
    payloadBase64,
    signature,
}: {
    payloadBase64: string;
    signature: string;
}): Promise<{ authToken: string }> {
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
    const address = publicKey.toIotaAddress();

    const privateKey = process.env.SUPABASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
    if (!privateKey) {
        throw new Error('Supabase private key missing.');
    }

    // process.env.SUPABASE_PRIVATE_KEY;
    return await generateAuthToken({ sub: address, role: 'authenticated' }, privateKey);
}
