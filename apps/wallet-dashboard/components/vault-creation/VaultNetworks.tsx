/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { Checkbox, InfoBox, InfoBoxType, Panel } from '@iota/apps-ui-kit';
import { capitalize, useNetwork } from '@iota/core';
import { getNetwork, Network } from '@iota/iota-sdk/client';
import { useField } from 'formik';
import { useEffect } from 'react';

export interface VaultNetworksProps {
    field: string;
}

export function VaultNetworks({ field }: VaultNetworksProps) {
    const [networksField, _, networksHelpers] = useField<Network[]>(field);
    const currentNetwork = getNetwork(useNetwork()).id;

    useEffect(() => {
        // If the network was switched, reset the preselection and check the current network
        networksHelpers.setValue([currentNetwork]);
    }, [currentNetwork, networksHelpers]);

    return (
        <Panel>
            <div className="flex max-w-4xl flex-col items-center gap-8 px-sm pb-md pt-sm">
                <div className="flex w-full flex-col gap-3">
                    <InfoBox
                        title="You can create the vault on multiple networks."
                        supportingText={`Select the networks you want to support.`}
                        type={InfoBoxType.Default}
                    />
                    <div className="grid w-full grid-cols-[1fr_1fr] gap-2">
                        {[Network.Mainnet, Network.Testnet, Network.Devnet].map((network) => {
                            const isChecked = networksField.value?.includes(network);

                            return (
                                <Checkbox
                                    key={network}
                                    name={network}
                                    label={capitalize(network)}
                                    isDisabled={network === currentNetwork}
                                    isChecked={isChecked}
                                    onCheckedChange={(e) => {
                                        const checked = e.target.checked;

                                        if (checked) {
                                            networksHelpers.setValue([
                                                ...(networksField.value ?? []),
                                                network,
                                            ]);
                                        } else {
                                            networksHelpers.setValue(
                                                (networksField.value ?? []).filter(
                                                    (n) => n !== network,
                                                ),
                                            );
                                        }
                                    }}
                                />
                            );
                        })}
                    </div>
                </div>
            </div>
        </Panel>
    );
}
