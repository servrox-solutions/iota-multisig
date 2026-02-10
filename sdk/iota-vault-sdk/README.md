# IOTA Vault SDK

Utilities for authenticating with the IOTA Vault backend and calling Vault RPCs.

This package creates a cached Supabase client for you after initialization.

## Install

```bash
pnpm add iota-vault-sdk
```

## Setup

Initialize the SDK once so it can store auth tokens, create the Supabase client,
and invoke the expired-token callback.

```ts
import { initializeVaultSdk } from 'iota-vault-sdk';

initializeVaultSdk({
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    // optional: pass Supabase client options
    supabaseConfig: {
        auth: {
            persistSession: false,
        },
    },
    onExpiredTokenUsage: () => {
        // e.g. redirect to login or show a modal
    },
    // optional: override storage (defaults to window.localStorage if available)
    storage: {
        getItem: (key) => localStorage.getItem(key),
        setItem: (key, value) => localStorage.setItem(key, value),
        removeItem: (key) => localStorage.removeItem(key),
    },
});
```

## Authenticate

Create a message, have the user sign it, exchange it for a Supabase JWT,
and store it in the SDK.

```ts
import { authenticateWithSignedMessage, getAuthMessage } from 'iota-vault-sdk';

const messageBytes = getAuthMessage();
const signedMessage = {
    payloadBase64: Buffer.from(messageBytes).toString('base64'),
    signature: '0x...',
};

await authenticateWithSignedMessage(signedMessage, async (payload) => {
    // call your backend to mint a Supabase JWT
    const res = await fetch('/api/supabase-jwt', {
        method: 'POST',
        body: JSON.stringify(payload),
    });
    return res.json(); // { authToken: string }
});
```

## Default Supabase Client

Use the SDK's cached client anywhere in your app:

```ts
import { getVaultDefaultClient } from 'iota-vault-sdk';

const client = getVaultDefaultClient();
```

The client is also passed as optional parameter to all functions.
Per defualt it uses the value of `getVaultDefaultClient()`, but can be overwritten if required.

## RPC Examples

```ts
import { createVaultInvitation, proposeTransaction, setApproval } from 'iota-vault-sdk';

// Create vault invitations
const vaultIds = await createVaultInvitation({
    users: [{ address: '0xabc...', weight: 1 }],
    threshold: 2,
    name: 'Main Vault',
    networks: ['iota'],
});

// Propose a transaction
const proposedIds = await proposeTransaction({
    vaultId: vaultIds[0],
    transactionData: '0xdeadbeef',
    comment: 'Test transaction',
});

// Approve / reject a transaction
await setApproval({ transactionId: proposedIds[0], signature: '0xsig...' });
```

## API Surface

- Auth:
  - `initializeVaultSdk(config)`
  - `getAuthMessage(exp?)`
  - `authenticateWithSignedMessage(signedMessage, getAuthTokenFromServer)`
  - `getAuthToken()`
  - `setAuthToken(token)`
  - `clearAuthToken()`
  - `isTokenValid(token)`
  - `isAuthenticated()`
  - `authenticatedUser()`
  - `disconnect()`
  - `handleExpiredToken()`
- RPC:
  - `createVaultInvitation(params)`
  - `respondToVaultInvitation(params)`
  - `proposeTransaction(params)`
  - `setApproval(params)`
  - `getExecuteTransactionData(params)`
  - `addVaultWhitelistEntry(params)`
  - `removeVaultWhitelistEntry(params)`
- Queries:
  - `getPublicKeyByAddress(address)`
  - `upsertVaultOwner(params)`
  - `getVaultsOfCurrentUser()`
  - `getProposedTransactionsOfCurrentUser(params)`
- Client:
  - `getVaultDefaultClient()`
  - `resetVaultSupabaseClient()`
- Types:
  - `SupabaseClientMaybe`

## Notes

- All RPC functions throw if the passed client is null/undefined.
- A custom supabase client can be passed to all RPCs and Queries; the default is `getVaultDefaultClient()`
- Token storage defaults to `window.localStorage` when available.
