# Technical Debt & Architecture Backlog

## P1 — Framework Runtime Upgrade (Pre-Production Launch)

### Context & Current State
The PromotorClass monorepo currently relies on:
- `"next": "^14.1.0"`
- `"@opennextjs/cloudflare": "^1.20.2"`
- Cloudflare deployment scripts using `--dangerouslyUseUnsupportedNextVersion`

While the Cloudflare Worker deployment baseline (D0 / F0.2) operationally passes under Worker Free tier limits (Class gzip ~726 KiB, Flow gzip ~700 KiB, far below 3 MiB limit), running with an explicit `--dangerouslyUseUnsupportedNextVersion` flag represents a framework runtime technical debt.

### Backlog Execution Tasks (To be executed before Production Hardening/Launch)
1. **Next.js Major Bump**: Upgrade `@promotor/promotor-class-web` and `@promotor/promotor-flow-web` to current supported Next.js major (Next 15+).
2. **React Compatibility Audit**: Ensure full compatibility with React 19 / modern React server components runtime.
3. **OpenNext Config Clean Up**: Remove `--dangerouslyUseUnsupportedNextVersion` from build and deployment scripts.
4. **Regression Verification**:
   - `pnpm test` (Class & Flow domain/contract suites)
   - `pnpm typecheck` & `pnpm lint`
   - `pnpm preview:class:cf` & `pnpm preview:flow:cf`
5. **Workers Staging & Production Deployment**: Verify clean build traces and deployment without flags.
