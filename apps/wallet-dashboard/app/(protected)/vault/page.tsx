// Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0
'use client';

import { VaultLogin } from '@/components/vaults/VaultLogin';
import { VAULT_ROUTE } from '@/lib/constants/routes.constants';
import { useSupabase } from '@/providers/SupabaseProvider';
import { redirect } from 'next/navigation';
import { useEffect } from 'react';

function VaultPage(): JSX.Element {
    const { isAuthenticated } = useSupabase();

    useEffect(() => {
        if (isAuthenticated()) {
            redirect(VAULT_ROUTE.path + '/overview');
        }
    }, [isAuthenticated]);

    return (
        <main className="flex flex-1 flex-col items-center space-y-8 py-md">
            <VaultLogin />
        </main>
    );
}

export default VaultPage;
