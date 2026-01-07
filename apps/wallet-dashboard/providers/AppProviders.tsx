// Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

'use client';

import { CookieDisclaimer } from '@/components/disclaimer/CookieDisclaimer';
import { VAULT_ROUTE } from '@/lib/constants/routes.constants';
import { growthbook } from '@/lib/utils';
import { createIotaClient } from '@/lib/utils/defaultRpcClient';
import { CookieManagerProvider } from '@boxfish-studio/react-cookie-manager';
import { GrowthBookProvider } from '@growthbook/growthbook-react';
import {
    ClipboardPasteSafetyWrapper,
    IotaGraphQLClientProvider,
    IotaNamesClientProvider,
    KioskClientProvider,
    StardustIndexerClientProvider,
    ThemeProvider,
    Toaster,
    useLocalStorage,
} from '@iota/core';
import { darkTheme, IotaClientProvider, lightTheme, WalletProvider } from '@iota/dapp-kit';
import { getAllNetworks, getDefaultNetwork, getNetwork } from '@iota/iota-sdk/client';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { persistQueryClient } from '@tanstack/react-query-persist-client';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { NuqsAdapter } from 'nuqs/adapters/next/app';
import { useEffect, useState } from 'react';
import { SupabaseProvider } from './SupabaseProvider';

growthbook.init();

export function AppProviders({ children }: React.PropsWithChildren) {
    const [queryClient] = useState(() => new QueryClient());
    const allNetworks = getAllNetworks();
    const defaultNetworkId = getDefaultNetwork();
    const router = useRouter();
    const [persistedNetworkId] = useLocalStorage<string>(
        'network_iota-dashboard',
        defaultNetworkId,
    );
    const persistedNetwork = getNetwork(persistedNetworkId);
    const path = usePathname();
    const searchParams = useSearchParams();

    useEffect(() => {
        persistQueryClient({
            queryClient,
            persister: createAsyncStoragePersister({
                storage: window.localStorage,
            }),
            dehydrateOptions: {
                shouldDehydrateQuery: (query) => query.meta?.persist === true,
            },
        });
    }, [queryClient]);

    function handleNetworkChange() {
        queryClient.resetQueries();
        queryClient.clear();
    }

    return (
        <GrowthBookProvider growthbook={growthbook}>
            <QueryClientProvider client={queryClient}>
                <SupabaseProvider onExpiredTokenUsage={() => path !== VAULT_ROUTE.path && router.push(`${VAULT_ROUTE.path}?redirect=${path}?${searchParams.toString()}`)}>
                    <IotaClientProvider
                        networks={allNetworks}
                        createClient={createIotaClient}
                        defaultNetwork={persistedNetworkId}
                        onNetworkChange={handleNetworkChange}
                    >
                        <StardustIndexerClientProvider>
                            <IotaGraphQLClientProvider>
                                <IotaNamesClientProvider>
                                    <NuqsAdapter>
                                        <KioskClientProvider>
                                            <WalletProvider
                                                autoConnect={true}
                                                theme={[
                                                    {
                                                        variables: lightTheme,
                                                    },
                                                    {
                                                        selector: '.dark',
                                                        variables: darkTheme,
                                                    },
                                                ]}
                                                chain={persistedNetwork.chain}
                                            >
                                                <ClipboardPasteSafetyWrapper>
                                                    <ThemeProvider appId="iota-dashboard">
                                                        <CookieManagerProvider>
                                                            {children}
                                                            <Toaster containerClassName="!right-8" />
                                                            <CookieDisclaimer />
                                                        </CookieManagerProvider>
                                                    </ThemeProvider>
                                                </ClipboardPasteSafetyWrapper>
                                            </WalletProvider>
                                        </KioskClientProvider>
                                    </NuqsAdapter>
                                </IotaNamesClientProvider>
                            </IotaGraphQLClientProvider>
                        </StardustIndexerClientProvider>
                    </IotaClientProvider>
                    <ReactQueryDevtools initialIsOpen={false} />
                </SupabaseProvider>
            </QueryClientProvider>
        </GrowthBookProvider>
    );
}
