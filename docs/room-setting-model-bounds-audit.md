# Room Setting Model Bounds Audit

This compares catalog dimensions against the size that `FurnitureModel` actually renders after normalizing each GLB to `targetSize`.

| Risk | Category | Placement | Model | Catalog m | Rendered m | Max axis error |
| --- | --- | --- | --- | --- | --- | --- |
| ok | shell | wall | hanging_picture_frame_02 | 0.52 x 0.35 x 0.02 | 0.52 x 0.346 x 0.023 | 14% |
| ok | shell | wall | fancy_picture_frame_01 | 0.52 x 0.4 x 0.02 | 0.52 x 0.4 x 0.017 | 14% |
| ok | shell | wall | hanging_picture_frame_03 | 0.4 x 0.52 x 0.03 | 0.399 x 0.52 x 0.033 | 10% |
| ok | shell | wall | ornate_mirror_01 | 0.34 x 0.52 x 0.02 | 0.34 x 0.52 x 0.018 | 9% |
| ok | shell | wall | dartboard | 0.52 x 0.52 x 0.05 | 0.52 x 0.52 x 0.046 | 8% |
| ok | shell | wall | hanging_picture_frame_01 | 0.37 x 0.52 x 0.01 | 0.367 x 0.52 x 0.01 | 3% |
| ok | doors | wall | wall-doorway-wide-square | 2.05 x 1.23 x 0.1 | 2.05 x 1.23 x 0.103 | 3% |
| ok | doors | wall | wall-doorway-wide-round | 2.05 x 1.23 x 0.1 | 2.05 x 1.23 x 0.103 | 3% |
| ok | decor | floor | planter_box_02 | 0.62 x 0.23 x 0.23 | 0.62 x 0.225 x 0.231 | 2% |
| ok | windows | wall | barricade-window-a | 1.2 x 0.92 x 0.07 | 1.2 x 0.918 x 0.072 | 2% |
| ok | windows | wall | barricade-window-b | 1.2 x 1.04 x 0.07 | 1.2 x 1.035 x 0.072 | 2% |
| ok | decor | floor | book_encyclopedia_set_01 | 0.62 x 0.27 x 0.18 | 0.62 x 0.267 x 0.183 | 2% |
| ok | decor | floor | brass_vase_01 | 0.2 x 0.62 x 0.2 | 0.204 x 0.62 x 0.204 | 2% |
| ok | windows | wall | barricade-window-c | 1.11 x 1.2 x 0.09 | 1.111 x 1.2 x 0.088 | 2% |
| orientation-risk | doors | wall | door-rotate-square-a | 0.9 x 2.05 x 0.24 | 0.903 x 2.05 x 0.244 | 2% |
| orientation-risk | doors | wall | door-rotate-square-b | 0.9 x 2.05 x 0.24 | 0.903 x 2.05 x 0.244 | 2% |
| orientation-risk | doors | wall | door-rotate-square-c | 0.9 x 2.05 x 0.24 | 0.903 x 2.05 x 0.244 | 2% |
| orientation-risk | doors | wall | door-rotate-square-d | 0.9 x 2.05 x 0.24 | 0.903 x 2.05 x 0.244 | 2% |
| orientation-risk | doors | wall | door-rotate-round-a | 0.9 x 2.05 x 0.24 | 0.903 x 2.05 x 0.244 | 2% |
| orientation-risk | doors | wall | door-rotate-round-b | 0.9 x 2.05 x 0.24 | 0.903 x 2.05 x 0.244 | 2% |
| orientation-risk | doors | wall | door-rotate-round-c | 0.9 x 2.05 x 0.24 | 0.903 x 2.05 x 0.244 | 2% |
| orientation-risk | doors | wall | door-rotate-round-d | 0.9 x 2.05 x 0.24 | 0.903 x 2.05 x 0.244 | 2% |
| ok | decor | floor | ceramic_vase_01 | 0.32 x 0.62 x 0.32 | 0.315 x 0.62 x 0.315 | 1% |
| ok | decor | floor | brass_vase_02 | 0.25 x 0.62 x 0.25 | 0.247 x 0.62 x 0.247 | 1% |
| ok | shell | wall | vintage_telephone_wall_clock | 0.36 x 0.52 x 0.2 | 0.356 x 0.52 x 0.2 | 1% |
| ok | decor | floor | ceramic_vase_03 | 0.17 x 0.62 x 0.17 | 0.168 x 0.62 x 0.168 | 1% |
| ok | decor | floor | pachira_aquatica_01 | 0.62 x 0.17 x 0.09 | 0.62 x 0.172 x 0.09 | 1% |
| ok | shell | wall | fancy_picture_frame_02 | 0.45 x 0.52 x 0.06 | 0.445 x 0.52 x 0.06 | 1% |
| ok | shell | wall | standing_picture_frame_02 | 0.2 x 0.52 x 0.42 | 0.2 x 0.52 x 0.423 | 1% |
| ok | shell | wall | standing_picture_frame_01 | 0.21 x 0.52 x 0.42 | 0.209 x 0.52 x 0.418 | 1% |
| ok | doors | wall | wall-doorway-round | 1.71 x 2.05 x 0.17 | 1.708 x 2.05 x 0.171 | 1% |
| ok | doors | wall | wall-doorway-square | 1.71 x 2.05 x 0.17 | 1.708 x 2.05 x 0.171 | 1% |
| ok | decor | floor | ceramic_vase_02 | 0.44 x 0.62 x 0.44 | 0.438 x 0.62 x 0.438 | 0% |
| ok | decor | floor | ceramic_vase_04 | 0.33 x 0.62 x 0.33 | 0.328 x 0.62 x 0.328 | 0% |
| ok | decor | floor | planter_box_01 | 0.62 x 0.29 x 0.28 | 0.62 x 0.289 x 0.281 | 0% |
| ok | windows | wall | wall-window-wide-round-detailed | 1.2 x 0.72 x 0.06 | 1.2 x 0.72 x 0.06 | 0% |
| ok | windows | wall | wall-window-wide-square-detailed | 1.2 x 0.72 x 0.06 | 1.2 x 0.72 x 0.06 | 0% |
| ok | windows | wall | wall-window-wide-round | 1.2 x 0.72 x 0.06 | 1.2 x 0.72 x 0.06 | 0% |
| ok | windows | wall | wall-window-wide-square | 1.2 x 0.72 x 0.06 | 1.2 x 0.72 x 0.06 | 0% |
| ok | windows | wall | wall-window-square-detailed | 1 x 1.2 x 0.1 | 1 x 1.2 x 0.1 | 0% |
| ok | windows | wall | wall-window-square | 1 x 1.2 x 0.1 | 1 x 1.2 x 0.1 | 0% |
| ok | windows | wall | wall-window-round-detailed | 1 x 1.2 x 0.1 | 1 x 1.2 x 0.1 | 0% |
| ok | windows | wall | wall-window-round | 1 x 1.2 x 0.1 | 1 x 1.2 x 0.1 | 0% |

Risk meanings:
- `ok`: rendered model proportions are close enough for the current selection box.
- `review`: some axis differs by more than 20%; selection/collision can look loose.
- `fail`: some axis differs by more than 40%; catalog dimensions should be model-specific.
- `orientation-risk`: wall model is much taller than it is wide/deep after normalization, which usually means the wall-facing axis needs manual placement rules.

