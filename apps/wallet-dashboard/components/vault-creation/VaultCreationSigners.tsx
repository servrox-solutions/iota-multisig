/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useFetchPublicKeyByAddress } from '@/hooks/useGetPublicKeyByAddress';
import { Add, Delete } from '@iota/apps-ui-icons';
import { Button, ButtonType, Input, InputType, Panel, Select, SelectSize } from '@iota/apps-ui-kit';
import { useField, useFormikContext } from 'formik';
import { useCallback, useEffect } from 'react';

export interface VaultCreationSignersProps {
    onNext?: (evt: React.MouseEvent<HTMLButtonElement>) => void;
    fields: {
        owners: string;
        threshold: string;
    };
    disabled?: boolean;
    hideAddOwner?: boolean;
}

export function VaultCreationSigners({
    onNext,
    fields,
    disabled,
    hideAddOwner,
}: VaultCreationSignersProps) {
    const { errors, touched, setFieldValue, setFieldTouched, values } = useFormikContext<any>();

    const [thresholdField, thresholdMeta] = useField(fields.threshold);

    const owners: Array<{ weight: number; address: string }> = values[fields.owners];
    const fetchPublicKeyByAddress = useFetchPublicKeyByAddress();

    // --- Handlers --------------------------------------------------------------
    const addSigner = useCallback(() => {
        setFieldValue(fields.owners, [...owners, { weight: 1, address: '' }]);
    }, [fields.owners, owners, setFieldValue]);

    const removeSigner = useCallback(
        (index: number) => {
            if (index === 0) return;
            setFieldValue(
                fields.owners,
                owners.filter((_, i) => i !== index),
            );
        },
        [fields.owners, owners, setFieldValue],
    );

    useEffect(() => {
        const totalWeight = owners.reduce((sum, s) => sum + s.weight, 0);
        const currentThreshold = Number(thresholdField.value);

        if (currentThreshold > totalWeight) {
            setFieldValue(fields.threshold, totalWeight);
        } else if (currentThreshold < 1) {
            setFieldValue(fields.threshold, 1);
        }
    }, [owners, thresholdField.value, fields.threshold, setFieldValue]);

    const totalWeight = owners.reduce((sum, s) => sum + s.weight, 0);
    const thresholdOptions = Array.from({ length: totalWeight }, (_, i) => ({
        id: String(i + 1),
        label: String(i + 1),
    }));

    const weightOptions = [1, 2, 3, 4, 5].map((w) => ({
        id: String(w),
        label: String(w),
    }));

    // --- Render ----------------------------------------------------------------

    return (
        <Panel>
            <div className="flex max-w-4xl flex-col items-center gap-8 px-sm pb-md pt-sm">
                <div className="flex w-full flex-col gap-3">
                    {owners.map((signer, index) => (
                        <div key={index} className="grid w-full grid-cols-[auto_1fr_1fr] gap-2">
                            <Input
                                label={index === 0 ? 'Owner' : undefined}
                                type={InputType.Text}
                                disabled={index === 0 || disabled}
                                placeholder="Owner Address"
                                value={signer.address}
                                errorMessage={
                                    (touched[fields.owners] as any)?.[index]?.address
                                        ? (errors[fields.owners] as any)?.[index]?.address
                                        : undefined
                                }
                                onChange={(e) =>
                                    setFieldValue(
                                        `${fields.owners}[${index}].address`,
                                        e.target.value,
                                    )
                                }
                                onBlur={async (e) => {
                                    const { value } = e.target;
                                    setFieldTouched(`${fields.owners}[${index}].address`, true);
                                    try {
                                        const publicKey = await fetchPublicKeyByAddress(value);
                                        if (publicKey) {
                                            setFieldValue(
                                                `${fields.owners}[${index}].publicKey`,
                                                publicKey,
                                                true,
                                            );
                                        }
                                    } catch (err) {
                                        // We can't find a publicKey for the user. Do nothing.
                                    }
                                }}
                            />
                            <Select
                                value={String(signer.weight)}
                                label={index === 0 ? 'Weight' : undefined}
                                options={weightOptions}
                                size={SelectSize.Small}
                                disabled={disabled}
                                onValueChange={(value) =>
                                    setFieldValue(
                                        `${fields.owners}[${index}].weight`,
                                        Number(value),
                                    )
                                }
                            />

                            <div
                                className="aspect-1 w-full"
                                style={{
                                    alignSelf: index === 0 ? 'end' : 'center',
                                    marginBottom: index === 0 ? '0.5rem' : '0',
                                }}
                            >
                                <Button
                                    type={ButtonType.Secondary}
                                    icon={<Delete />}
                                    disabled={index === 0 || disabled}
                                    fullWidth={false}
                                    onClick={() => removeSigner(index)}
                                />
                            </div>
                        </div>
                    ))}

                    {/* Add signer */}
                    {!hideAddOwner && (
                        <div className="flex justify-center pt-1">
                            <Button
                                type={ButtonType.Secondary}
                                text="Add Owner"
                                disabled={disabled}
                                icon={<Add />}
                                fullWidth={false}
                                onClick={addSigner}
                            />
                        </div>
                    )}
                </div>

                {/* Threshold */}
                <div className="flex w-full max-w-sm flex-col gap-2">
                    <Select
                        value={String(thresholdField.value)}
                        label="Threshold"
                        options={thresholdOptions}
                        size={SelectSize.Small}
                        disabled={disabled}
                        onValueChange={(e) => setFieldValue(fields.threshold, Number(e))}
                    />

                    {thresholdMeta.touched && thresholdMeta.error && (
                        <span className="text-sm text-red-500">{thresholdMeta.error}</span>
                    )}
                </div>
            </div>
        </Panel>
    );
}
