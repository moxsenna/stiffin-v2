# Acceptance Gates: Cover Program Direct Upload R2 (2MB)

## G1: API Route & Environment Types
Platform API includes R2 Bucket binding and 4 cover endpoints (presign new, presign existing, confirm, delete) with 2MB limit validation.
CHECK: pnpm --filter @promotor/platform-api typecheck
EXPECT: Done

## G2: PromotorClass UI Upload Component
PromotorClass contains an `ImageUpload` component that supports drag-and-drop, direct presigned upload to R2, 2MB size cap enforcement with explicit indicator, image preview, and delete action.
CHECK: pnpm --filter @promotor/promotor-class-web typecheck
EXPECT: Done

## G3: PromotorClass Program Form Integration
`programs/new` and `ProgramDetailClient` integrate `ImageUpload` for cover image selection and persistence.
CHECK: pnpm --filter @promotor/promotor-class-web lint
EXPECT: Done

## G4: Build Verification
Both Platform API and PromotorClass produce successful production builds.
CHECK: pnpm build:api && pnpm build:class
EXPECT: Done
