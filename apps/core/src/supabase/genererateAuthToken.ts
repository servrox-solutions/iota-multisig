import { sign } from 'jsonwebtoken';

export function generateAuthToken(
    payload: Record<string, string | number>,
    privateKey: string,
): { authToken: string } {
    const authToken = sign(payload, privateKey, {
        expiresIn: '24h',
        algorithm: 'ES256',
    });
    return { authToken };
}
