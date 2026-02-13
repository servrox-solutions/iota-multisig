'use client';

import { VaultCreationName } from '@/components/vault-creation/VaultCreationName';
import { VaultCreationSigners } from '@/components/vault-creation/VaultCreationSigners';
import { publicKeyToString } from '@/lib/utils';
import * as createVaultCreationSchema from '@/lib/validation/createVaultSchemas';
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
import { useCurrentAccount } from '@iota/dapp-kit';
import { FormikProvider, useFormik } from 'formik';

import { VaultNetworks } from '@/components/vault-creation/VaultNetworks';
import { useAddVault } from '@/hooks/useAddVault';
import { useVaultsByUser } from '@/hooks/useVaultsByUser';
import { VAULT_ROUTE } from '@/lib/constants/routes.constants';
import { NonEmptyArray, Vault } from '@/lib/types';
import { toast, useNetwork } from '@iota/core';
import { getNetwork, Network } from '@iota/iota-sdk/client';
import { useRouter } from 'next/navigation';
import { useQueryState } from 'nuqs';

export interface CreateVaultDialogProps {
    open: boolean;
    setOpen: (open: boolean) => void;
}

const deriveVaultInvitationFromForm = (
    newVault: createVaultCreationSchema.VaultCreationFormValues,
): Omit<Vault, 'network'> => ({
    ...newVault,
    id: 0, // id will be overwritten on refetch
    owners: newVault.owners.map((owner) => ({
        address: owner.address,
        weight: owner.weight,
        publicKey: owner.publicKey,
        status: owner.address === newVault.creatorAddress ? 'accepted' : 'pending',
    })),
    whitelist: [],
    creatorAddress: newVault.creatorAddress,
});

export function CreateVaultDialog({ open, setOpen }: CreateVaultDialogProps) {
    const account = useCurrentAccount();
    const router = useRouter();
    const [_, setInvitationVaultId] = useQueryState('invitation');
    const network = getNetwork(useNetwork()).id;
    const { data: vaults } = useVaultsByUser(account?.address);
    const { mutate: addVault } = useAddVault({
        onSuccess: (createdVaults: Vault[]) => {
            // createdVaults is a list of the same vault configuration, with only different networks and ids.
            const createdVaultCurrentNetwork = createdVaults.find((x) => x.network === network);
            if (!createdVaultCurrentNetwork) {
                toast.error('Could not open vault');
                return;
            }

            const vaultExistsAndAccepted = vaults
                ?.find((existingVault) => existingVault.id === createdVaultCurrentNetwork.id)
                ?.owners.every((owner) => owner.status === 'accepted');
            if (createdVaultCurrentNetwork.owners.length >= 2 && !vaultExistsAndAccepted) {
                setOpen(false);
                setInvitationVaultId(String(createdVaultCurrentNetwork.id));
            } else {
                router.push(`${VAULT_ROUTE.path}/${createdVaultCurrentNetwork.id}`);
            }
        },
    });

    const formik = useFormik<createVaultCreationSchema.VaultCreationFormValues>({
        validationSchema: () => createVaultCreationSchema.createVaultCreationSchemaForm(),
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
            networks: [network],
        },
        onSubmit: (data) =>
            addVault({
                networks: data.networks as NonEmptyArray<Network>,
                vault: deriveVaultInvitationFromForm(data),
            }),
        validateOnChange: false,
        validateOnBlur: true,
    });

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent
                showCloseOnOverlay={true}
                containerId="overlay-portal-container"
                position={DialogPosition.Right}
            >
                <div className="h-full overflow-auto">
                    <FormikProvider value={formik}>
                        <form className="flex h-full flex-grow" onSubmit={formik.handleSubmit}>
                            <Panel>
                                <div className="sticky right-0 top-0 z-40 w-full">
                                    <Header title={'Add Vault'} onClose={() => setOpen(false)} />
                                </div>

                                <div className="h-full overflow-y-auto">
                                    <div className="w-full max-w-3xl px-sm pb-md pt-sm">
                                        <div className="flex flex-col gap-1">
                                            <VaultCreationName
                                                fields={{ vaultName: 'vaultName' }}
                                            />
                                            <VaultCreationSigners
                                                fields={{
                                                    owners: 'owners',
                                                    threshold: 'threshold',
                                                }}
                                            />
                                            <VaultNetworks field={'networks'} />
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
