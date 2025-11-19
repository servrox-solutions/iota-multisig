'use client';

import { VaultCreationName } from '@/components/vault-creation/VaultCreationName';
import { VaultCreationSigners } from '@/components/vault-creation/VaultCreationSigners';
import { usePersistedVaults, VaultAlreadyAddedError } from '@/providers/VaultsContext';
import {
    Button,
    ButtonHtmlType,
    ButtonType,
    Dialog,
    DialogContent,
    DialogPosition,
    Header,
    Panel,
} from '@iota/apps-ui-kit';
import { createVaultCreationSchemaForm, toast, VaultCreationFormValues } from '@iota/core';
import { useCurrentAccount } from '@iota/dapp-kit';
import { FormikProvider, useFormik } from 'formik';

import { usePathname, useRouter } from 'next/navigation';

export interface CreateVaultDialogProps {
    open: boolean;
    setOpen: (open: boolean) => void;
}

export function CreateVaultDialog({ open, setOpen }: CreateVaultDialogProps) {
    const account = useCurrentAccount();
    const publicKey = btoa(String.fromCharCode(...(account?.publicKey ?? [])));

    const { addPersistedVault } = usePersistedVaults();
    const router = useRouter();
    const pathname = usePathname();

    const formik = useFormik<VaultCreationFormValues>({
        validationSchema: () => createVaultCreationSchemaForm(),
        initialValues: {
            vaultName: 'My IOTA Vault',
            publicKeys: [{ publicKey: publicKey ?? '', weight: 1 }],
            threshold: 1,
        },
        onSubmit: (data) => handleCreateVault(data),
        validateOnChange: false,
        validateOnBlur: true,
    });

    async function handleCreateVault(data: VaultCreationFormValues) {
        if (!account) {
            console.log('no account');
            return;
        }

        try {
            const persistedVault = addPersistedVault(data);
            router.push(`${pathname}/${persistedVault.address}`);
            toast('Vault successfully added.');
        } catch (err: unknown) {
            if (err instanceof VaultAlreadyAddedError) {
                toast('Vault already added.');
                setOpen(false);
            }
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent containerId="overlay-portal-container" position={DialogPosition.Right}>
                <div className="h-full overflow-auto">
                    <FormikProvider value={formik}>
                        <form className="flex h-full flex-grow" onSubmit={formik.handleSubmit}>
                            <Panel>
                                <div className="sticky right-0 top-0 z-40 w-full">
                                    <Header title={'Add Vault'} onClose={() => setOpen(false)} />
                                </div>

                                <div className="h-full overflow-y-auto">
                                    <div className="w-full max-w-3xl px-sm pb-md pt-sm">
                                        <div className="flex flex-col gap-8">
                                            <VaultCreationName
                                                fields={{ vaultName: 'vaultName' }}
                                            />
                                            <VaultCreationSigners
                                                fields={{
                                                    publicKeys: 'publicKeys',
                                                    threshold: 'threshold',
                                                }}
                                            />
                                        </div>

                                        <div className="px-sm">
                                            <Button
                                                text="Add Vault"
                                                fullWidth
                                                disabled={!formik.isValid}
                                                type={ButtonType.Primary}
                                                htmlType={ButtonHtmlType.Submit}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </Panel>
                        </form>
                    </FormikProvider>
                </div>
            </DialogContent>
        </Dialog>
    );
}
