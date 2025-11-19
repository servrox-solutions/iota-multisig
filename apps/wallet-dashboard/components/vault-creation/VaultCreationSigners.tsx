/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { Add, Delete } from '@iota/apps-ui-icons';
import { Button, ButtonType, Input, InputType, Panel, Select, SelectSize } from '@iota/apps-ui-kit';
import { useField, useFormikContext } from 'formik';
import { useCallback, useEffect } from 'react';

export interface VaultCreationSignersProps {
    onNext?: (evt: React.MouseEvent<HTMLButtonElement>) => void;
    fields: {
        publicKeys: string;
        threshold: string;
    };
}

export function VaultCreationSigners({ onNext, fields }: VaultCreationSignersProps) {
    const { errors, touched, setFieldValue, setFieldTouched, values } = useFormikContext<any>();

    const [thresholdField, thresholdMeta] = useField(fields.threshold);

    const publicKeys: Array<{ publicKey: string; weight: number }> = values[fields.publicKeys];

    // --- Handlers --------------------------------------------------------------

    const addSigner = useCallback(() => {
        setFieldValue(fields.publicKeys, [...publicKeys, { publicKey: '', weight: 1 }]);
    }, [fields.publicKeys, publicKeys, setFieldValue]);

    const removeSigner = useCallback(
        (index: number) => {
            if (index === 0) return;
            setFieldValue(
                fields.publicKeys,
                publicKeys.filter((_, i) => i !== index),
            );
        },
        [fields.publicKeys, publicKeys, setFieldValue],
    );

    useEffect(() => {
        const totalWeight = publicKeys.reduce((sum, s) => sum + s.weight, 0);
        const currentThreshold = Number(thresholdField.value);

        if (currentThreshold > totalWeight) {
            setFieldValue(fields.threshold, totalWeight);
        } else if (currentThreshold < 1) {
            setFieldValue(fields.threshold, 1);
        }
    }, [publicKeys, thresholdField.value, fields.threshold, setFieldValue]);

    const totalWeight = publicKeys.reduce((sum, s) => sum + s.weight, 0);
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
                    {publicKeys.map((signer, index) => (
                        <div key={index} className="grid w-full grid-cols-[auto_1fr_1fr] gap-2">
                            <Input
                                label={index === 0 ? 'Owner' : undefined}
                                type={InputType.Text}
                                disabled={index === 0}
                                placeholder="Public key"
                                value={signer.publicKey}
                                errorMessage={
                                    (touched[fields.publicKeys] as any)?.[index]?.publicKey
                                        ? (errors[fields.publicKeys] as any)?.[index]?.publicKey
                                        : undefined
                                }
                                onChange={(e) =>
                                    setFieldValue(
                                        `${fields.publicKeys}[${index}].publicKey`,
                                        e.target.value,
                                    )
                                }
                                onBlur={() =>
                                    setFieldTouched(
                                        `${fields.publicKeys}[${index}].publicKey`,
                                        true,
                                    )
                                }
                            />
                            <Select
                                value={String(signer.weight)}
                                label={index === 0 ? 'Weight' : undefined}
                                options={weightOptions}
                                size={SelectSize.Small}
                                onValueChange={(value) =>
                                    setFieldValue(
                                        `${fields.publicKeys}[${index}].weight`,
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
                                    disabled={index === 0}
                                    fullWidth={false}
                                    onClick={() => removeSigner(index)}
                                />
                            </div>
                        </div>
                    ))}

                    {/* Add signer */}
                    <div className="flex justify-center pt-1">
                        <Button
                            type={ButtonType.Secondary}
                            text="Add Owner"
                            icon={<Add />}
                            fullWidth={false}
                            onClick={addSigner}
                        />
                    </div>
                </div>

                {/* Threshold */}
                <div className="flex w-full max-w-sm flex-col gap-2">
                    <Select
                        value={String(thresholdField.value)}
                        label="Threshold"
                        options={thresholdOptions}
                        size={SelectSize.Small}
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
