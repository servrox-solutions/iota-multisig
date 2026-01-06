// Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0
'use client';

import { useGetPublicKeyByAddress } from '@/hooks/useGetPublicKeyByAddress';
import { useAddVaultUser } from '@/hooks/useVaultAddUser';
import { VAULT_ROUTE } from '@/lib/constants/routes.constants';
import { publicKeyToString } from '@/lib/utils';
import { useSupabase } from '@/providers/SupabaseProvider';
import { useCurrentAccount } from '@iota/dapp-kit';
import { useRouter } from 'next/navigation';
import { useEffect, type PropsWithChildren } from 'react';

function VaultLayout({ children }: PropsWithChildren): JSX.Element {
    const account = useCurrentAccount();
    const router = useRouter();
    const { data: storedPublicKey } = useGetPublicKeyByAddress(account?.address);
    const { disconnect, authenticatedUser } = useSupabase();
    const { mutate: addUser } = useAddVaultUser();

    useEffect(() => {
        const auth = authenticatedUser();

        // If no account or wrong account → disconnect and redirect
        if (!account || account.address !== auth) {
            disconnect();
            router.push(VAULT_ROUTE.path);
            return;
        }

        // If the user's public key is not yet stored, write it to the DB.
        if (!storedPublicKey) {
            // If the correct account is connected → store user's public key to database
            const publicKey = publicKeyToString(account.publicKey);
            addUser({ address: account.address, publicKey });
        }
    }, [account, addUser, authenticatedUser, disconnect, router, storedPublicKey]);

    return <>{children}</>;
}

export default VaultLayout;
