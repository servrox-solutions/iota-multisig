'use client';

import { MyVaults } from '@/components/vaults';
import { useCurrentAccount, useCurrentWallet } from '@iota/dapp-kit';
import { PropsWithChildren } from 'react';
// import { useSupabaseUser } from '@/hooks/useSupabaseUser';

function VaultLayout({ children }: PropsWithChildren): JSX.Element {

    const { connectionStatus } = useCurrentWallet();
    const account = useCurrentAccount();

    return (
        <main className="flex flex-1 flex-col items-center space-y-8 py-md">
            {connectionStatus === 'connected' && account && (
                <>
                    <div className="grid w-full grid-cols-1 gap-lg lg:grid-cols-3">
                        <div className="flex">
                            <MyVaults />
                        </div>
                        <div className="col-span-2 flex h-[500px] grow">{children}</div>
                    </div>
                </>
            )}
        </main>
    );
}

export default VaultLayout;
