'use client';

import { VaultCreationName } from '@/components/vault-creation/VaultCreationName';
import { VaultCreationSigners } from '@/components/vault-creation/VaultCreationSigners';
import { publicKeyToString } from '@/lib/utils';
import {
    createVaultImportSchemaForm,
    VaultImportFormValues,
} from '@/lib/validation/createVaultSchemas';
import {
    Button,
    ButtonHtmlType,
    ButtonType,
    Dialog,
    DialogContent,
    DialogPosition,
    Header,
    InfoBox,
    InfoBoxType,
    LoadingIndicator,
    Panel,
} from '@iota/apps-ui-kit';
import { useCurrentAccount } from '@iota/dapp-kit';
import { FormikProvider, useFormik } from 'formik';

import { VaultCreationAddress } from '@/components/vault-creation/VaultCreationAddress';
import { useAddVault } from '@/hooks/useAddVault';
import { useVaultConfigByAddress } from '@/hooks/useVaultConfigByAddress';
import { useVaultsByUser } from '@/hooks/useVaultsByUser';
import { VAULT_ROUTE } from '@/lib/constants/routes.constants';
import { NonEmptyArray, Vault } from '@/lib/types';
import { Info } from '@iota/apps-ui-icons';
import { toast, useNetwork } from '@iota/core';
import { getNetwork, Network } from '@iota/iota-sdk/client';
import { useRouter } from 'next/navigation';
import { useQueryState } from 'nuqs';
import { useEffect } from 'react';

export interface CreateVaultDialogProps {
    open: boolean;
    setOpen: (open: boolean) => void;
}

const deriveVaultInvitationFromForm = (
    newVault: VaultImportFormValues,
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

export function ImportVaultDialog({ open, setOpen }: CreateVaultDialogProps) {
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

    const initialValues = {
        vaultAddress: '',
        vaultName: 'Imported IOTA Vault',
        owners: [
            {
                weight: 1,
                address: '',
                publicKey: account ? publicKeyToString(account?.publicKey) : '',
            },
        ],
        threshold: 1,
        creatorAddress: account?.address ?? '',
        networks: [network],
    };

    const formik = useFormik<VaultImportFormValues>({
        validationSchema: () => createVaultImportSchemaForm(),
        initialValues,
        onSubmit: (data) =>
            addVault({
                networks: data.networks as NonEmptyArray<Network>,
                vault: deriveVaultInvitationFromForm(data),
            }),
        validateOnChange: false,
        validateOnBlur: true,
    });

    const {
        data: vaultConfig,
        isFetching: vaultConfigIsFetching,
        isFetched: vaultConfigIsFetched,
    } = useVaultConfigByAddress(formik.values.vaultAddress);

    const isVaultOwner =
        vaultConfig &&
        vaultConfig.owners.find((owner) => owner.address === account?.address) !== undefined;
    const isAlreadyOwnedVault = Boolean(
        vaults?.some(
            (vault) => vault.network === network && vault.address === formik.values.vaultAddress,
        ),
    );

    useEffect(() => {
        if (!vaultConfig) {
            return;
        }
        formik.setFieldValue('owners', vaultConfig.owners, false);
        formik.setFieldValue('threshold', vaultConfig.threshold, false);
        // formik must not be part of the dependency array to prevent infinite callbacks
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [vaultConfig]);

    // useEffect(() => {
    //     formik.validateForm();
    // }, [formik.values.vaultAddress]);

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
                                    <Header title={'Import Vault'} onClose={() => setOpen(false)} />
                                </div>

                                <div className="h-full overflow-y-auto">
                                    <div className="w-full max-w-3xl px-sm pb-md pt-sm">
                                        <div className="flex flex-col gap-1">
                                            <VaultCreationAddress
                                                fields={{ vaultName: 'vaultAddress' }}
                                            />
                                            {vaultConfigIsFetching && <LoadingIndicator />}
                                            {vaultConfigIsFetched && !vaultConfig && (
                                                <div className="-mt-4 p-4">
                                                    <InfoBox
                                                        type={InfoBoxType.Default}
                                                        title="Vault could not be loaded."
                                                        icon={<Info />}
                                                        supportingText="Only vaults that already made a transactions can be imported."
                                                    />
                                                </div>
                                            )}
                                            {vaultConfigIsFetched &&
                                                vaultConfig &&
                                                !isVaultOwner && (
                                                    <div className="-mt-4 p-4">
                                                        <InfoBox
                                                            type={InfoBoxType.Default}
                                                            title="No vault owner."
                                                            icon={<Info />}
                                                            supportingText="You need to be a vault owner to import this vault."
                                                        />
                                                    </div>
                                                )}
                                            {vaultConfigIsFetched &&
                                                vaultConfig &&
                                                isVaultOwner &&
                                                isAlreadyOwnedVault && (
                                                    <div className="-mt-4 p-4">
                                                        <InfoBox
                                                            type={InfoBoxType.Default}
                                                            title="Vault already imported."
                                                            icon={<Info />}
                                                            supportingText="You are already an owner of this vault on the selected network."
                                                        />
                                                    </div>
                                                )}
                                            {vaultConfig && isVaultOwner && !isAlreadyOwnedVault && (
                                                <>
                                                    <VaultCreationName
                                                        fields={{ vaultName: 'vaultName' }}
                                                    />
                                                    <VaultCreationSigners
                                                        fields={{
                                                            owners: 'owners',
                                                            threshold: 'threshold',
                                                        }}
                                                        disabled={true}
                                                        hideAddOwner={true}
                                                    />
                                                </>
                                            )}
                                            <Button
                                                text="Import Vault"
                                                fullWidth
                                                disabled={
                                                    !formik.isValid ||
                                                    !vaultConfig ||
                                                    !isVaultOwner ||
                                                    isAlreadyOwnedVault
                                                }
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
