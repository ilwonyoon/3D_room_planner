# Render Quality Report

Generated: 2026-04-28T08:47:24.511Z

URL: http://127.0.0.1:5190/

Quality: `high`

Average perceptual proxy score: 58.3

## Hero Set Summary

| Hero set | Avg | Isometric | Bird | POV | Day | Warm | Night |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| baseline | 58.8 | 69 | 43.6 | 63.8 | 73.4 | 50.9 | 52 |
| lounge-accents | 58.4 | 69.8 | 43.2 | 62.2 | 74.8 | 49.9 | 50.6 |
| designer-lamps | 57.7 | 67.7 | 43.3 | 62.2 | 74.3 | 49.3 | 49.6 |

## Winners By View And Preset

| View/Preset | Winning hero set | Score | Screenshot |
| --- | --- | ---: | --- |
| bird:daylight-window | lounge-accents | 60.4 | output/render-quality-metrics/2026-04-28T08-46-24-657Z-acc-bird-day.png |
| bird:night-room | baseline | 37.7 | output/render-quality-metrics/2026-04-28T08-46-24-657Z-base-bird-night.png |
| bird:warm-evening | baseline | 34.4 | output/render-quality-metrics/2026-04-28T08-46-24-657Z-base-bird-warm.png |
| isometric:daylight-window | lounge-accents | 90.8 | output/render-quality-metrics/2026-04-28T08-46-24-657Z-acc-iso-day.png |
| isometric:night-room | baseline | 63 | output/render-quality-metrics/2026-04-28T08-46-24-657Z-base-iso-night.png |
| isometric:warm-evening | baseline | 57.8 | output/render-quality-metrics/2026-04-28T08-46-24-657Z-base-iso-warm.png |
| pov:daylight-window | baseline | 75.5 | output/render-quality-metrics/2026-04-28T08-46-24-657Z-base-pov-day.png |
| pov:night-room | baseline | 55.3 | output/render-quality-metrics/2026-04-28T08-46-24-657Z-base-pov-night.png |
| pov:warm-evening | baseline | 60.5 | output/render-quality-metrics/2026-04-28T08-46-24-657Z-base-pov-warm.png |

## Reading Rule

Do not promote an A/B candidate just because it exists. Promote it only when the screenshot looks better and the same view/preset score is not materially worse. If human preference and proxy score diverge, record that preference and recalibrate the score weights.
