# Room Setting Model Bounds Audit

This compares catalog dimensions against the size that `FurnitureModel` actually renders after normalizing each GLB to `targetSize`.

| Risk | Category | Placement | Model | Catalog m | Rendered m | Max axis error |
| --- | --- | --- | --- | --- | --- | --- |
| fail | windows | wall | modern-transom-window | 1.52 x 1.22 x 0.12 | 1.52 x 0.535 x 0.107 | 56% |
| fail | windows | wall | modern-square-awning-window | 1.22 x 0.82 x 0.13 | 1.22 x 1.173 x 0.14 | 43% |
| ok | windows | wall | modern-sliding-window | 1.82 x 1.36 x 0.12 | 1.82 x 1.146 x 0.144 | 20% |
| ok | windows | wall | modern-tall-casement-window | 0.92 x 1.54 x 0.13 | 0.88 x 1.54 x 0.155 | 19% |
| ok | windows | wall | modern-wide-picture-window | 1.82 x 1.34 x 0.12 | 1.82 x 1.129 x 0.114 | 16% |
| ok | doors | wall | modern-sliding-glass-door | 1.86 x 2.12 x 0.13 | 1.86 x 2.12 x 0.15 | 15% |
| ok | shell | wall | hanging_picture_frame_02 | 0.52 x 0.35 x 0.02 | 0.52 x 0.346 x 0.023 | 14% |
| ok | shell | wall | fancy_picture_frame_01 | 0.52 x 0.4 x 0.02 | 0.52 x 0.4 x 0.017 | 14% |
| ok | shell | wall | hanging_picture_frame_03 | 0.4 x 0.52 x 0.03 | 0.399 x 0.52 x 0.033 | 10% |
| ok | shell | wall | ornate_mirror_01 | 0.34 x 0.52 x 0.02 | 0.34 x 0.52 x 0.018 | 9% |
| ok | shell | wall | dartboard | 0.52 x 0.52 x 0.05 | 0.52 x 0.52 x 0.046 | 8% |
| ok | doors | wall | modern-ribbed-oak-door | 1.02 x 2.16 x 0.16 | 1.02 x 2.16 x 0.154 | 3% |
| ok | shell | wall | hanging_picture_frame_01 | 0.37 x 0.52 x 0.01 | 0.367 x 0.52 x 0.01 | 3% |
| ok | doors | wall | modern-slim-glass-door | 1.02 x 2.16 x 0.16 | 1.02 x 2.16 x 0.156 | 3% |
| ok | decor | floor | planter_box_02 | 0.62 x 0.23 x 0.23 | 0.62 x 0.225 x 0.231 | 2% |
| ok | decor | floor | book_encyclopedia_set_01 | 0.62 x 0.27 x 0.18 | 0.62 x 0.267 x 0.183 | 2% |
| ok | decor | floor | brass_vase_01 | 0.2 x 0.62 x 0.2 | 0.204 x 0.62 x 0.204 | 2% |
| ok | doors | wall | modern-flush-white-door | 1.02 x 2.16 x 0.16 | 1.02 x 2.16 x 0.157 | 2% |
| ok | doors | wall | modern-double-glass-door | 1.5 x 2.16 x 0.16 | 1.5 x 2.16 x 0.158 | 2% |
| ok | decor | floor | ceramic_vase_01 | 0.32 x 0.62 x 0.32 | 0.315 x 0.62 x 0.315 | 1% |
| ok | decor | floor | brass_vase_02 | 0.25 x 0.62 x 0.25 | 0.247 x 0.62 x 0.247 | 1% |
| ok | shell | wall | vintage_telephone_wall_clock | 0.36 x 0.52 x 0.2 | 0.356 x 0.52 x 0.2 | 1% |
| ok | decor | floor | ceramic_vase_03 | 0.17 x 0.62 x 0.17 | 0.168 x 0.62 x 0.168 | 1% |
| ok | decor | floor | pachira_aquatica_01 | 0.62 x 0.17 x 0.09 | 0.62 x 0.172 x 0.09 | 1% |
| ok | shell | wall | fancy_picture_frame_02 | 0.45 x 0.52 x 0.06 | 0.445 x 0.52 x 0.06 | 1% |
| ok | shell | wall | standing_picture_frame_02 | 0.2 x 0.52 x 0.42 | 0.2 x 0.52 x 0.423 | 1% |
| ok | shell | wall | standing_picture_frame_01 | 0.21 x 0.52 x 0.42 | 0.209 x 0.52 x 0.418 | 1% |
| ok | decor | floor | ceramic_vase_02 | 0.44 x 0.62 x 0.44 | 0.438 x 0.62 x 0.438 | 0% |
| ok | decor | floor | ceramic_vase_04 | 0.33 x 0.62 x 0.33 | 0.328 x 0.62 x 0.328 | 0% |
| ok | decor | floor | planter_box_01 | 0.62 x 0.29 x 0.28 | 0.62 x 0.289 x 0.281 | 0% |

Risk meanings:
- `ok`: rendered model proportions are close enough for the current selection box.
- `review`: some axis differs by more than 20%; selection/collision can look loose.
- `fail`: some axis differs by more than 40%; catalog dimensions should be model-specific.
- `orientation-risk`: wall model is much taller than it is wide/deep after normalization, which usually means the wall-facing axis needs manual placement rules.

