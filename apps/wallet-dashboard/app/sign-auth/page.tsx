// Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0
'use client';

import { Button, ButtonType, Panel, Title } from '@iota/apps-ui-kit';
import { toast } from '@iota/core';
import { useSignPersonalMessage } from '@iota/dapp-kit';
import { useState } from 'react';
import { getAuthMessage } from 'iota-vault-sdk';

interface SignedAuthPayload {
    payloadBase64: string;
    signature: string;
}

export default function SignAuthPage(): JSX.Element {
    const { mutate: signPersonalMessage } = useSignPersonalMessage();
    const [isSigning, setIsSigning] = useState(false);
    const [signedPayload, setSignedPayload] = useState<SignedAuthPayload | null>(null);

    const signAuthPayload = () => {
        setIsSigning(true);
        signPersonalMessage(
            { message: getAuthMessage() },
            {
                onSuccess: (result) => {
                    setSignedPayload({
                        payloadBase64: result.bytes,
                        signature: result.signature,
                    });
                    toast('Auth payload signed.');
                    setIsSigning(false);
                },
                onError: (error) => {
                    console.error(error);
                    toast.error('Failed to sign auth payload.');
                    setIsSigning(false);
                },
            },
        );
    };

    return (
        <main className="flex min-h-screen items-start justify-center p-md">
            <Panel>
                <div className="flex w-full max-w-3xl flex-col gap-4 p-lg">
                    <Title title="Sign Auth Payload" />
                    <Button
                        type={ButtonType.Primary}
                        text={isSigning ? 'Signing…' : 'Sign Login Message'}
                        onClick={signAuthPayload}
                        disabled={isSigning}
                    />

                    {signedPayload && (
                        <pre className="overflow-auto rounded bg-iota-neutral-92 p-3 text-body-sm dark:bg-iota-neutral-20">
                            {JSON.stringify(signedPayload, null, 2)}
                        </pre>
                    )}
                </div>
            </Panel>
        </main>
    );
}
