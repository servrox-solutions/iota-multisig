export interface AuthPayload {
    iss: 'vault-login';
    exp: number;
}

export const getAuthMessage = (exp = Date.now() + 10 * 60 * 1000) => {
    const message = {
        iss: 'vault-login',
        exp,
    } satisfies AuthPayload;
    return new TextEncoder().encode(JSON.stringify(message));
};
