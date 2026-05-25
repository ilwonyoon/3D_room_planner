# 13 — Bathroom GLB generation prep

**Status**: prep complete; generation pending (manual step, ~1 hour + ~$10-20).
**Date**: 2026-05-24.

The Bond-3d demo currently renders furniture stand-ins (chairs, sofas,
cabinets) in the IsometricScene because Bond-3d ships no bathroom GLBs.
This doc captures everything needed to swap in real bathroom fixtures
in a single sitting.

---

## What we need

Eight slot-aligned GLBs, one per agent slot. Modern, neutral-styled
(matte black / white quartz / brushed nickel) so they fit any of the
demo's likely shopper personas without re-keying the agent's style
recommendations.

| Slot | Fixture | Target dims (cm, W×D×H) | File | Renders into slot |
|---|---|---|---|---|
| vanity | 36" single-sink vanity, flat-panel door, white quartz top | 90 × 50 × 85 | `vanity_36in_modern_white.glb` | wall, right |
| mirror | rectangular framed mirror, thin matte-black frame | 70 × 5 × 100 | `mirror_rect_blackframe.glb` | wall above vanity |
| faucet | single-handle widespread faucet, matte black | 15 × 15 × 25 | `faucet_widespread_matteblack.glb` | on vanity top |
| lighting | wall sconce, brass arm + opal globe | 30 × 30 × 40 | `sconce_brass_opal.glb` | wall above mirror |
| bathtub | freestanding soaking tub, oval | 170 × 75 × 55 | `tub_freestanding_oval_white.glb` | floor, left |
| shower | walk-in shower enclosure with door (frame only — glass is invisible) | 90 × 90 × 200 | `shower_walkin_enclosure.glb` | floor, left-back |
| toilet | wall-mounted dual-flush toilet, white | 70 × 40 × 75 | `toilet_wallmount_white.glb` | floor, center-front |
| accessory | towel bar 24", brushed nickel | 30 × 15 × 30 | `towelbar_brushed_nickel.glb` | wall, right of vanity |

All files land in `Bond-3d/public/assets/models/bathroom/` and
fileName-encode their slot mapping, so `sceneBridge.ts` can swap from
category lookup to direct slot→file mapping in one edit.

---

## Generation prompts

Each fixture has prompts for two services. Generate ~2-3 attempts per
fixture per service, pick the best — Rodin and Meshy have different
strengths (Rodin = cleaner topology, Meshy = better materials), so we
sample both.

### fal.ai Rodin (https://fal.ai/models/fal-ai/rodin)

`condition_mode: "concat"`, `geometry_file_format: "glb"`,
`material: "PBR"`, `quality: "medium"`, `tier: "Sketch"` for $0.4/gen
or `tier: "Regular"` for $1/gen. Use Sketch unless results look broken.

```text
# vanity
"Modern 36-inch bathroom vanity, flat-panel doors, matte black hardware,
white quartz countertop, single integrated sink, freestanding, floor
contact, plain neutral background, isometric three-quarter view,
photoreal, sharp shadows"

# mirror
"Rectangular bathroom mirror 70cm wide 100cm tall, thin matte-black
rectangular frame, hanging flat against a plain wall, three-quarter
view, photoreal product render"

# faucet
"Modern widespread bathroom faucet, single lever handle, matte black
finish, 8-inch spread, side view on plain background, sharp product
photo"

# lighting
"Modern bathroom wall sconce, single brass arm, white opal glass globe,
mounted on a plain wall, three-quarter front view"

# bathtub
"Freestanding oval soaking bathtub, white acrylic, modern minimalist,
no faucet attached, sitting on a plain floor, three-quarter view,
photoreal"

# shower
"Walk-in shower enclosure, square footprint, brushed nickel frame,
clear glass panels and door, no plumbing visible, plain floor and back
wall, three-quarter view"

# toilet
"Wall-mounted modern toilet, dual-flush actuator panel above, white
porcelain, no tank visible (concealed cistern), three-quarter view,
photoreal product render"

# accessory
"Brushed nickel 24-inch bathroom towel bar, simple straight cylinder,
two wall-mounted brackets, plain background"
```

### Meshy (https://www.meshy.ai/api)

Meshy's `/openapi/v2/text-to-3d` endpoint, `art_style: "realistic"`,
`ai_model: "meshy-4"`, $0.30/gen. Prompts above translate verbatim;
Meshy infers PBR materials. Use `topology: "triangle"` and
`target_polycount: 8000` (we don't need high poly for stand-ins).

---

## Cost & time

| Service | Per gen | Attempts × 8 | Total |
|---|---|---|---|
| Rodin (Sketch) | $0.40 | 3 × 8 = 24 | $9.60 |
| Meshy | $0.30 | 2 × 8 = 16 | $4.80 |

Total ceiling: **~$15** to have enough variety to pick a winner per slot.

Wall-clock: 60-90 seconds per gen → 24+16 = 40 gens ≈ 30-50 min total
(both services run in parallel; both have async queues).

Most fixtures generate cleanly on first attempt; the historically
finicky ones are *faucet* (often misses the handle geometry) and
*shower* (often produces a free-floating glass slab without the frame).
Budget the extra attempts on those two.

---

## Integration steps once GLBs are in hand

1. **Drop the 8 GLBs into `Bond-3d/public/assets/models/bathroom/`**
   with exactly the filenames in the manifest above.

2. **Run `pnpm verify:bathroom-glbs`** — sanity checks file presence,
   non-zero size, and valid GLB header (magic bytes). Lists which
   ones are missing.

3. **Replace `SLOT_TO_CATEGORIES` in `src/agent/sceneBridge.ts`** with
   `SLOT_TO_BATHROOM_FILE`:

   ```ts
   const SLOT_TO_BATHROOM_FILE: Record<string, string> = {
     vanity: '/assets/models/bathroom/vanity_36in_modern_white.glb',
     mirror: '/assets/models/bathroom/mirror_rect_blackframe.glb',
     faucet: '/assets/models/bathroom/faucet_widespread_matteblack.glb',
     lighting: '/assets/models/bathroom/sconce_brass_opal.glb',
     bathtub: '/assets/models/bathroom/tub_freestanding_oval_white.glb',
     shower: '/assets/models/bathroom/shower_walkin_enclosure.glb',
     toilet: '/assets/models/bathroom/toilet_wallmount_white.glb',
     accessory: '/assets/models/bathroom/towelbar_brushed_nickel.glb',
   }
   ```

   And rewrite `pickStandIn(slot, productId)` to return a synthetic
   item with that URL — bypass `PRODUCT_CATALOG` entirely for bathroom
   slots:

   ```ts
   export function pickStandIn(slot: string, _productId: string): ProductCatalogItem | null {
     const url = SLOT_TO_BATHROOM_FILE[slot]
     if (!url) return null
     return {
       id: `bathroom-${slot}`,
       name: slot,
       brand: 'Bond',
       category: 'storage', // arbitrary — we use the dims/url directly
       source: 'manual',
       renderCost: 'standard',
       modelUrl: url,
       sourceModelUrl: url,
       thumbnailUrl: '',
       dimensionsCm: SLOT_TARGET_DIMENSIONS_CM[slot] ?? [50, 50, 50],
     } as ProductCatalogItem
   }
   ```

   This is one edit, ~20 lines. The rest of the bridge (positions,
   replacement, clearing) stays as-is.

4. **`pnpm typecheck && pnpm build`** — should pass.

5. **Reload `?blank=1`** and ask the agent for a vanity + mirror to
   visually verify each fixture loads at the right slot position.

6. **Update `docs/bond-demo/12-DEMO-RUNBOOK.md`** "Scene meshes are
   visual stand-ins" line to reflect that real bathroom GLBs are now
   live.

7. **Update `docs/bond-demo/10-DEMO-SCRIPT.md`** close to drop the
   "real bathroom GLBs to replace the stand-ins" line.

---

## Fallback if some GLBs are bad

If only N of 8 generate acceptably, keep the existing stand-in path
for the missing ones — `pickStandIn` already falls through to
category lookup, so a mixed (real + stand-in) scene is graceful.
Update the runbook to call out which slots are which.

---

## Why not buy a bathroom GLB pack instead

Bond-3d's existing assets (polyhaven, sharetextures, etc.) all come
from sources without bathroom fixture coverage. CGTrader / TurboSquid
packs exist at $50-200, with mixed license terms (often "personal use"
only, not commercial). For a 1-meeting demo with us as Bond, generated
PBR assets are cheaper and license-clean. If the demo wins and this
goes to production, that's the moment to license a real pack.
