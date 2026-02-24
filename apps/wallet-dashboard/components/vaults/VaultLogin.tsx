// Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { VAULT_ROUTE } from '@/lib/constants/routes.constants';
import { useSupabase } from '@/providers/SupabaseProvider';
import { Mail } from '@iota/apps-ui-icons';
import { Button, ButtonType, LoadingIndicator, Panel, Title } from '@iota/apps-ui-kit';
import { NoData, toast } from '@iota/core';
import { useSignPersonalMessage } from '@iota/dapp-kit';
import { useMutation } from '@tanstack/react-query';
import { getAuthMessage } from 'iota-vault-sdk';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';

export function VaultLogin(): React.JSX.Element {
    const { mutate: signPersonalMessage } = useSignPersonalMessage();
    const { authenticate } = useSupabase();
    const router = useRouter();
    const searchParams = useSearchParams();
    const [isLoggingIn, setIsLoggingIn] = useState(false);

    const { mutate: generateJwt, isPending } = useMutation({
        mutationFn: authenticate,
        onSuccess: async (client) => {
            if (client === null) throw new Error('Authentication failed; client is null.');
            toast('Login successfull.');
            const redirectPath = searchParams.get('redirect');
            router.push(redirectPath || `${VAULT_ROUTE.path}/overview`);
        },
        onError: (err) => {
            console.error(err);
            toast('Login failed.');
        },
        onSettled: () => {
            setIsLoggingIn(false);
        },
    });

    const supabaseLogin = async () => {
        setIsLoggingIn(true);
        return signPersonalMessage(
            { message: getAuthMessage() },
            {
                onSuccess: (result) => {
                    generateJwt({ payloadBase64: result.bytes, signature: result.signature });
                },
                onError: (err) => {
                    toast('Login failed.');
                    setIsLoggingIn(false);
                },
            },
        );
    };

    const isInvitation =
        new URL(
            decodeURIComponent(searchParams.get('redirect') ?? ''),
            'http://example.com',
        ).searchParams.get('invitation') !== null;

    return (
        <Panel>
            <div className="flex h-full w-full flex-col items-center gap-5 p-lg">
                <div className="flex flex-col items-center justify-center">
                    <Title title="IOTA Vaults" />
                    <div className="flex flex-col gap-2">
                        {isInvitation && (
                            <div className="flex items-center gap-1">
                                <Mail /> You have been invited to join an IOTA Vault.
                            </div>
                        )}
                        <NoData message="Sign a message to get started with IOTA Vaults." />
                    </div>
                </div>

                {!isLoggingIn && !isPending ? (
                    <Button
                        type={ButtonType.Primary}
                        text="Sign Now"
                        fullWidth={false}
                        onClick={() => supabaseLogin()}
                    />
                ) : (
                    <LoadingIndicator />
                )}
            </div>
        </Panel>
    );
}
