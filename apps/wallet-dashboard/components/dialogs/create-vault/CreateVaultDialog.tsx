'use client';

import { VaultCreationName } from '@/components/vault-creation/VaultCreationName';
import { VaultCreationSigners } from '@/components/vault-creation/VaultCreationSigners';
import { publicKeyToString } from '@/lib/utils';
import * as createVaultCreationSchema from '@/lib/validation/createVaultCreationSchema';
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

import { useAddVault } from '@/hooks/useAddVault';
import { useFetchPublicKeyByAddress } from '@/hooks/useGetPublicKeyByAddress';
import { Vault } from '@/lib/types';

export interface CreateVaultDialogProps {
    open: boolean;
    setOpen: (open: boolean) => void;
}

const deriveVaultInvitationFromForm = (
    newVault: createVaultCreationSchema.VaultCreationFormValues,
): Vault => ({
    ...newVault,
    id: 0, // id will be overwritten on refetch
    // address: MultiSigPublicKey.fromPublicKeys({
    //     threshold: newVault.threshold,
    //     publicKeys: newVault.owners.map((owner) => ({
    //         publicKey: new Ed25519PublicKey(owner.publicKey),
    //         weight: owner.weight,
    //     })),
    // }).toIotaAddress(),
    owners: newVault.owners.map((owner) => ({
        address: owner.address,
        weight: owner.weight,
        publicKey: owner.publicKey,
        status: owner.address === newVault.creatorAddress ? 'accepted' : 'pending',
    })),
    creatorAddress: newVault.creatorAddress,
});

export function CreateVaultDialog({ open, setOpen }: CreateVaultDialogProps) {
    const account = useCurrentAccount();
    const fetchPublicKeyByAddress = useFetchPublicKeyByAddress();
    const { mutate: addVault } = useAddVault();

    const formik = useFormik<createVaultCreationSchema.VaultCreationFormValues>({
        validationSchema: () =>
            createVaultCreationSchema.createVaultCreationSchemaForm(fetchPublicKeyByAddress),
        initialValues: {
            vaultName: 'My IOTA Vault',
            owners: [
                {
                    weight: 1,
                    address: account?.address ?? '',
                    publicKey: account ? publicKeyToString(account?.publicKey) : '',
                },
            ],
            threshold: 1,
            creatorAddress: account?.address ?? '',
        },
        onSubmit: (data) => handleCreateVault(data),
        validateOnChange: false,
        validateOnBlur: true,
    });

    async function handleCreateVault(data: createVaultCreationSchema.VaultCreationFormValues) {
        try {
            const vaultInvitation = deriveVaultInvitationFromForm(data);
            await addVault(vaultInvitation);
            // VaultService.storePersistedVault();
            // router.push(`${VAULT_ROUTE.path}/${newVault.address}`);
            toast('Vault successfully added.');
        } catch (err: unknown) {
            // if (err instanceof VaultAlreadyAddedError) {
            //     toast('Vault already added.');
            //     setOpen(false);
            // }
            toast('Could not add vault. Please try again later.');
            console.error(err);
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
