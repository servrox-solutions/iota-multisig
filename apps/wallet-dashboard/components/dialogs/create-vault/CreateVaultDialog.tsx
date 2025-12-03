'use client';

import { VaultCreationName } from '@/components/vault-creation/VaultCreationName';
import { VaultCreationSigners } from '@/components/vault-creation/VaultCreationSigners';
import * as createVaultCreationSchema from '@/lib/validation/createVaultCreationSchema';
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
import { toast } from '@iota/core';
import { useCurrentAccount } from '@iota/dapp-kit';
import { FormikProvider, useFormik } from 'formik';

import { usePathname, useRouter } from 'next/navigation';

export interface CreateVaultDialogProps {
    open: boolean;
    setOpen: (open: boolean) => void;
}

export function CreateVaultDialog({ open, setOpen }: CreateVaultDialogProps) {
    const account = useCurrentAccount();
    const address = account?.address;

    const { addPersistedVault } = usePersistedVaults();
    const router = useRouter();
    const pathname = usePathname();

    const formik = useFormik<createVaultCreationSchema.VaultCreationFormValues>({
        validationSchema: () => createVaultCreationSchema.createVaultCreationSchemaForm(),
        initialValues: {
            vaultName: 'My IOTA Vault',
            owners: [{ weight: 1, address: address ?? '' }],
            threshold: 1,
        },
        onSubmit: (data) => handleCreateVault(data),
        validateOnChange: false,
        validateOnBlur: true,
    });

    async function handleCreateVault(data: createVaultCreationSchema.VaultCreationFormValues) {
        try {
            const persistedVault = addPersistedVault(data);
            // VaultService.storePersistedVault();
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
                                                    owners: 'owners',
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
