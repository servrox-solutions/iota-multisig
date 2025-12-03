'use client';

import { VaultCreationName } from '@/components/vault-creation/VaultCreationName';
import { VaultCreationSigners } from '@/components/vault-creation/VaultCreationSigners';
import { Vault, VaultService } from '@/lib/services/vault.service';
import { publicKeyToString } from '@/lib/utils';
import * as createVaultCreationSchema from '@/lib/validation/createVaultCreationSchema';
import { VaultAlreadyAddedError } from '@/providers/VaultsContext';
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
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { FormikProvider, useFormik } from 'formik';

import { Ed25519PublicKey } from '@iota/iota-sdk/keypairs/ed25519';
import { usePathname, useRouter } from 'next/navigation';
import { MultiSigPublicKey } from '../../../../../sdk/typescript/dist/esm/multisig/publickey';

export interface CreateVaultDialogProps {
    open: boolean;
    setOpen: (open: boolean) => void;
}

const deriveVaultFromForm = (
    newVault: createVaultCreationSchema.VaultCreationFormValues,
): Vault => ({
    ...newVault,
    address: MultiSigPublicKey.fromPublicKeys({
        threshold: newVault.threshold,
        publicKeys: newVault.owners.map((owner) => ({
            publicKey: new Ed25519PublicKey(owner.publicKey),
            weight: owner.weight,
        })),
    }).toIotaAddress(),
});

export function CreateVaultDialog({ open, setOpen }: CreateVaultDialogProps) {
    const account = useCurrentAccount();

    const queryClient = useQueryClient();

    const { mutate: addVault } = useMutation({
        mutationFn: async (newVault: Vault) => {
            // Cancel any outgoing refetches
            // (so they don't overwrite our optimistic update)
            await queryClient.cancelQueries({ queryKey: ['vaults', account?.address] });

            // Optimistically update to the new value
            queryClient.setQueryData(
                ['vaults', account?.address],
                (old: Vault[]) => [...old, newVault] as Vault[],
            );

            // Create the new vault
            await VaultService.createVault(newVault);
        },
        // Always refetch after error or success. This also overwrites the optimistic update with the final values.
        onSettled: () => queryClient.invalidateQueries({ queryKey: ['vaults'] })
    });
    const router = useRouter();
    const pathname = usePathname();

    const formik = useFormik<createVaultCreationSchema.VaultCreationFormValues>({
        validationSchema: () =>
            createVaultCreationSchema.createVaultCreationSchemaForm(queryClient),
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
        },
        onSubmit: (data) => handleCreateVault(data),
        validateOnChange: false,
        validateOnBlur: true,
    });

    async function handleCreateVault(data: createVaultCreationSchema.VaultCreationFormValues) {
        try {
            console.log(data);
            const newVault = deriveVaultFromForm(data);
            addVault(newVault);
            console.log(newVault);
            // VaultService.storePersistedVault();
            router.push(`${pathname}/${newVault.address}`);
            toast('Vault successfully added.');
        } catch (err: unknown) {
            if (err instanceof VaultAlreadyAddedError) {
                toast('Vault already added.');
                setOpen(false);
            }
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
                                        Errors:{JSON.stringify(formik.errors.owners)}

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
