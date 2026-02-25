// Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { Amplitude } from '@/components/Amplitude';
import { FontLinks } from '@/components/FontLinks';
import { ConnectionGuard } from '@/components/connection-guard';
import { AppProviders } from '@/providers';
import '@iota/dapp-kit/dist/index.css';
import { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Suspense } from 'react';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

const METADATA_INFO = {
    title: 'IOTA Vaults',
    description: 'IOTA Vaults - Manage assets securely and collaboratively',
    image: '/metadata-image.png',
};

export const metadata: Metadata = {
    title: METADATA_INFO.title,
    description: METADATA_INFO.description,
    openGraph: {
        title: METADATA_INFO.title,
        description: METADATA_INFO.description,
        images: [METADATA_INFO.image],
    },
    twitter: {
        title: METADATA_INFO.title,
        description: METADATA_INFO.description,
        images: [METADATA_INFO.image],
    },
};

export default async function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en">
            <body className={inter.className}>
                {/* Need suspense for useSearchParams, which is used in AppProviders and children */}
                <Suspense>
                    <AppProviders>
                        <FontLinks />
                        <Amplitude />
                        <ConnectionGuard>{children}</ConnectionGuard>
                    </AppProviders>
                </Suspense>
            </body>
        </html>
    );
}
