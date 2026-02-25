// Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

'use client';

import {
    CONNECT_ROUTE,
    COOKIE_POLICY_ROUTE,
    SIGN_AUTH_ROUTE,
    SWAGGER_ROUTE,
    VAULT_ROUTE,
} from '@/lib/constants/routes.constants';
import { LoadingIndicator } from '@iota/apps-ui-kit';
import { useAutoConnectWallet, useCurrentWallet } from '@iota/dapp-kit';
import { redirect, usePathname, useSearchParams } from 'next/navigation';
import { PropsWithChildren, useEffect } from 'react';

const PUBLIC_ROUTES = [
    CONNECT_ROUTE.path,
    COOKIE_POLICY_ROUTE.path,
    SWAGGER_ROUTE.path,
    SIGN_AUTH_ROUTE.path,
];

export function ConnectionGuard({ children }: PropsWithChildren) {
    const { isConnected, isDisconnected } = useCurrentWallet();

    const pathname = usePathname();
    const searchParams = useSearchParams();
    const autoConnect = useAutoConnectWallet();

    useEffect(() => {
        if (autoConnect !== 'attempted') return;
        if (isConnected && pathname === CONNECT_ROUTE.path) {
            // Redirect to redirect param or home if on root ("/")
            const redirectPath = searchParams.get('redirect');
            redirect(redirectPath || VAULT_ROUTE.path);
        } else if (isDisconnected && !PUBLIC_ROUTES.includes(pathname)) {
            // Redirect back to "/" if disconnected and trying to access a protected page
            redirect(`${CONNECT_ROUTE.path}?redirect=${pathname}?${searchParams.toString()}`);
        }
    }, [isConnected, isDisconnected, pathname, autoConnect, searchParams]);

    if (autoConnect === 'idle') {
        return (
            <div className="flex h-screen w-full justify-center">
                <LoadingIndicator size="w-16 h-16" />
            </div>
        );
    }

    return autoConnect === 'attempted' ? children : null;
}
