# IOTA Vaults Frontend Fork

This repository is a fork of the IOTA repository.

The `wallet-dashboard` package has been modified to work as the frontend for IOTA Vaults, an IOTA L1 MultiSig solution.
It uses Supabase as its data storage layer.

## Maintenance Scope

Important: all other packages in this monorepo are not maintained in this fork.
Only `apps/wallet-dashboard` is actively maintained here.

## Prerequisites

- Node.js 20+
- pnpm 9+
- A Supabase project (URL, anon key, service role key, and JWT signing private key)

## Environment Variables (`apps/wallet-dashboard/.env`)

Required:

- `NEXT_PUBLIC_SUPABASE_URL`: Supabase project URL.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Supabase anon/public key.
- `SUPABASE_SERVICE_ROLE_KEY`: Supabase service role key (server-side use).
- `SUPABASE_PRIVATE_KEY`: Supabase JWT signing private key (PEM, preserve newlines).

Recommended:

- `BUILD_ENV`: `development` or `production` (used to set dashboard runtime build environment).

Legacy/optional in this fork:

- `NEXT_PUBLIC_APPS_BACKEND_URL`
- `NEXT_PUBLIC_BUILD_ENV`

## Supabase Database Setup

Initialize your Supabase database schema using:

- `apps/wallet-dashboard/schema.sql`

Apply this SQL to your Supabase database before running the dashboard.

## Run Locally

From the repository root:

1. Install dependencies:
   `pnpm install`
2. Create/update environment file:
   `apps/wallet-dashboard/.env`
3. Start the dashboard:
   `pnpm wallet-dashboard dev`
4. Open:
   `http://localhost:3000`

## Build and Run Production Mode

From the repository root:

1. Build:
   `pnpm wallet-dashboard build`
2. Start:
   `pnpm wallet-dashboard start`

## Notes

- Commands above are run from the repository root.
- This fork is intended for IOTA Vaults frontend development in `apps/wallet-dashboard`.
