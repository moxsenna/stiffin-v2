# Technical Debt & Architecture Backlog

## P1 — Framework Runtime & Build Verification (L1 Closure Status: VERIFIED RESOLVED)

### Context & Resolution
1. **Next.js Version Baseline**: `@promotor/promotor-class-web` and `@promotor/promotor-flow-web` utilize `next: "14.2.35"` with React 18.2.
2. **Production Builds**: `pnpm build:class` and `pnpm build:flow` execute `cross-env NEXT_PUBLIC_API_MODE=http next build` cleanly across all routes with zero lint/type errors.
3. **OpenNext / Cloudflare Compatibility**: OpenNext adapter configurations in both frontend workspaces bundle and optimize static assets and server components within Cloudflare Worker memory and size limits.
4. **Post-Launch Roadmap**: Upgrades to Next.js 15 / React 19 are deferred to Post-Launch lifecycle to avoid unnecessary framework churn during V0.1 pilot operations.
