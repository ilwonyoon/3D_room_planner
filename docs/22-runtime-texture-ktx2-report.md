# Runtime Texture KTX2 Report

Date: 2026-04-24

## Scope

Phase 2 of `docs/21-runtime-asset-optimization-plan.md` started with standalone room-shell texture compression.

Converted runtime texture groups:

- `public/assets/textures-runtime/walls`
- `public/assets/textures-runtime/floors`
- `public/assets/textures-runtime/rugs`
- legacy direct texture folders under `public/assets/textures-runtime`

Window and door models currently use GLB/procedural materials, so there are no standalone window texture sets to convert in this pass.

## Output

- KTX2 output root: `public/assets/textures-runtime-ktx2`
- Generated runtime map: `src/constants/textureVariants.generated.ts`
- Runtime opt-in flag: `VITE_ENABLE_KTX2_TEXTURES=true`
- Total converted textures: `167`

Disk footprint:

- JPG/PNG runtime texture root: about `200M`
- KTX2 runtime texture root: about `125M`

The disk-size reduction is not the primary win. The main expected runtime win is lower GPU texture allocation after KTX2 transcodes to native compressed texture formats.

## Runtime Behavior

Default behavior remains JPG/PNG.

When `VITE_ENABLE_KTX2_TEXTURES=true`, `textureUrlWithBestVariant()` swaps only URLs present in the generated KTX2 map. If a texture set is only partially mapped, the runtime falls back to the original JPG/PNG set so a single `useLoader()` call does not mix KTX2 and image textures.

This keeps the KTX2 path opt-in while avoiding accidental `404` loads or mixed-loader failures for partially generated texture sets.

## Commands

Generate all runtime texture KTX2 variants:

```sh
pnpm assets:prepare:textures:ktx2
```

Generate only the default shell slice:

```sh
pnpm assets:prepare:shell:ktx2
```

Run with the KTX2 runtime texture path:

```sh
VITE_ENABLE_KTX2_TEXTURES=true pnpm dev --host 127.0.0.1 --port 5190
```

## Verification

Completed:

- `pnpm assets:prepare:textures:ktx2`
- `find public/assets/textures-runtime-ktx2 -type f -name '*.ktx2' -print0 | xargs -0 tools/ktx/bin/ktx2check`
- `pnpm typecheck`
- `VITE_ENABLE_KTX2_TEXTURES=true pnpm build`

Not completed in this sandbox:

- browser visual comparison for day/warm/night
- render budget measurement with `VITE_ENABLE_KTX2_TEXTURES=true`

The local dev server could not bind to `127.0.0.1:5190` in this environment because Node returned `listen EPERM`.
