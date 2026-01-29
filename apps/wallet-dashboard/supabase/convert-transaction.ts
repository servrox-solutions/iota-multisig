import { Transaction } from '@iota/iota-sdk/transactions';
import { fromHex } from '@iota/iota-sdk/utils';

/**
 * Convert the hexadecimal representation of an IOTA Transaction from supabase back to it's native representation.
 * @param hex hexadecimals representation of the transaction as given by supabase
 * @returns an IOTA Transaction Object
 */
export const transactionFromSupabaseHex = (hex: string): Transaction => {
    const hexWithoutPrefix = hex.startsWith('\\x') ? hex.slice(2) : hex;
    return Transaction.from(
        fromHex(String.fromCharCode.apply(null, [...fromHex(hexWithoutPrefix)])),
    );
};

/**
 * Convert the hexadecimal representation of a signature from supabase back to it's native representation.
 * @param hex hexadecimals representation of the signature as given by supabase
 * @returns a user's signature
 */
export const signatureFromSupabaseHex = (hex: string): string => {
    const hexWithoutPrefix = hex.startsWith('\\x') ? hex.slice(2) : hex;
    return String.fromCharCode.apply(null, [...fromHex(hexWithoutPrefix)]);
};
