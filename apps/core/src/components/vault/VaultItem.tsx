// Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { Card, CardBody, CardImage, CardType, ImageType, Tooltip } from '@iota/apps-ui-kit';
import { formatAddress } from '@iota/iota-sdk/utils';
import { type ReactNode } from 'react';
import { useGetDefaultIotaName } from '../../hooks';
import { formatIotaName } from '../../utils';

interface VaultItemProps {
    name: string;
    address?: string;
    onClick?: () => void;
    icon?: ReactNode;
    clickableAction?: ReactNode;
    tooltip?: string;
}

export function VaultItem({
    name,
    address,
    onClick,
    icon,
    clickableAction,
    tooltip,
}: VaultItemProps): React.JSX.Element {
    const { data: iotaName } = useGetDefaultIotaName(address);
    return (
        <Card type={CardType.Default} onClick={onClick}>
            <Tooltip text={tooltip || ''}>
                <CardImage type={ImageType.BgTransparent}>
                    <div className="flex h-10 w-10 items-center justify-center rounded-full border border-shader-neutral-light-8 text-iota-neutral-10 dark:text-iota-neutral-92">
                        {icon}
                    </div>
                </CardImage>
            </Tooltip>
            <CardBody
                title={name}
                subtitle={formatIotaName(iotaName) || (address ? formatAddress(address) : null)}
                clickableAction={clickableAction}
            />
        </Card>
    );
}
