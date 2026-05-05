# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Artifacts

### AlphaSource AI Website (`artifacts/alphasource-website`)
- React + Vite multi-page marketing site at preview path `/`
- Routes: `/` (HomePage), `/alphascreen` (AlphaScreenPage), `/about` (AboutPage)
- Brand colors: Navy #0A1547, Deep Navy #1A2460, Lilac #A380F6 (primary CTA), Teal #02ABE0, Green #02D99D
- Uses framer-motion for animations, wouter for routing
- Logo assets in `public/logo-dark-text.png` and `public/alpha-symbol.png`
- No backend needed — pure frontend marketing site
- Includes client dashboard (login: any credentials), admin dashboard (admin login in footer)

### AlphaSource Consulting Website (`artifacts/alphasource-consulting`)
- React + Vite multi-page marketing site at preview path `/consulting/`
- Routes: `/` (Home), `/dental-consulting` (services + contact form), `/analyzer` (tool embed placeholder), `/about` (team + mission)
- Same brand design system as alphasource-website: Navy #0A1547, Lilac #A380F6, Teal #02ABE0, Green #02D99D, Raleway font
- "Slightly elevated" style: dark navy hero (vs. light hero on AI site), more generous whitespace, professional card layouts
- Nav: Home | Dental Consulting | Dental Operations Analyzer | About Us + "Book a Consultation" CTA button
- Team: Jason Gardner (CEO), Brent Ford (COO), Destinee Konecny (Director of Client Success)
- Content scraped from alphasourceconsulting.com — verbatim copy where available
- Headshot assets copied from alphasource-website/public/
- No backend — pure frontend marketing site

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
