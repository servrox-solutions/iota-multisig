// Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import cn from 'clsx';
import type { ReactNode } from 'react';

export type StatusBadgeTone = 'success' | 'danger' | 'neutral';

interface StatusBadgeProps {
    label: string;
    icon?: ReactNode;
    tone?: StatusBadgeTone;
    className?: string;
}

export function StatusBadge({ label, icon, tone = 'neutral', className }: StatusBadgeProps) {
    return (
        <div
            className={cn(
                'flex items-center gap-2 rounded-full border-2 px-2 py-1 text-xs',
                tone === 'success' && 'border-iota-primary-60 text-iota-primary-60',
                tone === 'danger' && 'border-iota-error-30 text-iota-error-30',
                tone === 'neutral' && 'border-iota-neutral-80 text-iota-neutral-40',
                className,
            )}
        >
            {icon}
            <span>{label}</span>
        </div>
    );
}
