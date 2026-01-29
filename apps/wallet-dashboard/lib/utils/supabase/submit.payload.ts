export interface SubmitPayload {
    iss: 'vault-submit';
    exp: number;
    transactionId: number;
}

export const getSubmitPayload = (transactionId: number, exp = Date.now() + 10 * 60 * 1000) => {
    const message = {
        iss: 'vault-submit',
        exp,
        transactionId,
    } satisfies SubmitPayload;
    return new TextEncoder().encode(JSON.stringify(message));
};
