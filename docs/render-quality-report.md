# Render Quality Report

Generated: 2026-04-28T18:49:59.669Z

URL: http://127.0.0.1:5190/

Quality: `high`

Average perceptual proxy score: 66.3

## Hero Set Summary

| Hero set | Avg | Isometric | Bird | POV | Day | Warm | Night |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| lounge-accents | 67.1 | 80.3 | 54.9 | 66.1 | 86.6 | 56.2 | 58.6 |
| designer-lamps | 66.8 | 79.3 | 54.9 | 66.3 | 86.7 | 55.6 | 58.2 |
| baseline | 65 | 71.4 | 56.6 | 67 | 84 | 55.6 | 55.4 |

## Winners By View And Preset

| View/Preset | Winning hero set | Score | Screenshot |
| --- | --- | ---: | --- |
| bird:daylight-window | baseline | 75.6 | output/render-quality-metrics/2026-04-28T18-48-40-839Z-base-bird-day.png |
| bird:night-room | baseline | 52.3 | output/render-quality-metrics/2026-04-28T18-48-40-839Z-base-bird-night.png |
| bird:warm-evening | baseline | 41.8 | output/render-quality-metrics/2026-04-28T18-48-40-839Z-base-bird-warm.png |
| isometric:daylight-window | lounge-accents | 98.8 | output/render-quality-metrics/2026-04-28T18-48-40-839Z-acc-iso-day.png |
| isometric:night-room | lounge-accents | 74.5 | output/render-quality-metrics/2026-04-28T18-48-40-839Z-acc-iso-night.png |
| isometric:warm-evening | lounge-accents | 67.7 | output/render-quality-metrics/2026-04-28T18-48-40-839Z-acc-iso-warm.png |
| pov:daylight-window | designer-lamps | 85.9 | output/render-quality-metrics/2026-04-28T18-48-40-839Z-lamp-pov-day.png |
| pov:night-room | baseline | 52.9 | output/render-quality-metrics/2026-04-28T18-48-40-839Z-base-pov-night.png |
| pov:warm-evening | baseline | 62.3 | output/render-quality-metrics/2026-04-28T18-48-40-839Z-base-pov-warm.png |

## Reading Rule

Do not promote an A/B candidate just because it exists. Promote it only when the screenshot looks better and the same view/preset score is not materially worse. If human preference and proxy score diverge, record that preference and recalibrate the score weights.
