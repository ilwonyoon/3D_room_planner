# Product Brand Alias Pass - 2026-04

## Scope

The product catalog needs to read like a curated furniture marketplace instead of a file-browser for model IDs. This pass assigns brand and product-name display aliases to every current `PRODUCT_CATALOG` seed.

Coverage: 123 / 123 catalog seeds.

## Naming Rule

Aliases are presentation metadata for catalog realism. They are based on real furniture and home-decor product names, but they do not claim that the GLB asset is the exact branded product, licensed product, or endorsed product.

Use the closest fit by object type, silhouette, and modern-interior relevance:

- Modern sofas, lounge chairs, stools, coffee tables: prioritize Audo Copenhagen, HAY, Muuto, Herman Miller, Vitra, Kartell.
- White/simple storage and modular shelving: prioritize Vitsoe, Muuto, IKEA, Audo Copenhagen.
- Planters, vases, mirrors, frames, clocks: prioritize Ferm Living, Georg Jensen, Iittala, Moebe, Braun.
- Object-specific exceptions can use specialist brands when the model shape is not modern furniture, such as Takara Belmont for a barber chair.

## Source Families Checked

- Herman Miller official product pages: Eames Sofa Compact, Eames Lounge Chair and Ottoman, Aeron and Eames seating families.
  - https://www.hermanmiller.com/products/eames-sofa-compact
  - https://www.hermanmiller.com/products/seating/lounge-seating/eames-lounge-chair-and-ottoman.html
- Audo Copenhagen official product pages and collection pages: Pagode Sofa, Eave Modular Sofa, Afteroom Stool, Androgyne tables, Harbour seating.
  - https://us.audocph.com/products/pagode-sofa
  - https://us.audocph.com/pages/eave-modular-sofa
  - https://us.audocph.com/products/afteroom-stool-upholstered-seat
  - https://us.audocph.com/products/androgyne-side-table
- HAY official product pages and project pages: About A Chair, Palissade, Slit Table, Tray Table, Kofi.
  - https://www.hay.com/hay/furniture-old/seating-old/chair-old/about-a-chair-old/aac-22
  - https://www.hay.com/professionals/cases/hansong-art-village-korea
- Muuto official product pages: Outline Sofa, Fiber seating, Stacked Storage System, Workshop/Couple tables.
  - https://www.muuto.com/product/Outline-Sofa-3-Seater-p9413/p9413/
  - https://www.muuto.com/products/shop-by-family/stacked-storage-system/
- Vitsoe official product pages: 606 Universal Shelving System, shelves, cabinets, desk/table components.
  - https://www.vitsoe.com/us/606
  - https://www.vitsoe.com/606/components
- IKEA official product PDFs/pages: BILLY, MALM, LISTERBY, STOCKHOLM, RANARP, HEKTAR, HAVSTA, HEMNES, IVAR, IDANAS.
  - https://www.ikea.com/us/en/files/pdf/d4/23/d4230e60/billy_april_2024.pdf
- Ferm Living official product pages: Plant Box, Pond Mirror, Fountain Vase, Nium Vase, Dedali Vase.
  - https://fermliving.com/products/nium-vase-h23-dark-sage
- Georg Jensen official product pages: Bloom and Bloom Botanica vase/flower-pot family.
  - https://www.georgjensen.com/en-us/home-decor/bloom
  - https://www.georgjensen.com/en-us/home-decor/vases/bloom-botanica-vase-large/10016985.html
- Moebe official product pages: Frame and Standing Frame.
  - https://moebe.dk/products/standing-frame
- Takara Belmont official product pages: Apollo 2 barber chair.
  - https://www.takarahairdressing.co.uk/equipment/barbering/apollo-2
- Braun and Winmau product families were used for clocks and dartboard naming.

## Implementation Notes

- `retailAliasById` is the single source of truth for display aliases.
- `toItem()` now prefers the alias brand/name before falling back to generated names.
- Catalog and in-room product cards both show the product-like name instead of raw dimensions. Dimensions remain in ARIA labels for accessibility context.
