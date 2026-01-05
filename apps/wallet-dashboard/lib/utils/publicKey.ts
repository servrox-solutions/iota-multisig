export const publicKeyToString = (publicKey: Uint8Array) => btoa(String.fromCharCode(...publicKey));

export const stringToPublicKey = (base64: string): Uint8Array => {
    const binary = atob(base64); // decode base64 -> binary string
    const bytes = new Uint8Array(binary.length);

    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }

    return bytes;
};
