# Render Quality Report

Generated: 2026-04-28T17:11:52.231Z

URL: http://127.0.0.1:5190/

Quality: `high`

Average perceptual proxy score: 65.6

## Hero Set Summary

| Hero set | Avg | Isometric | Bird | POV | Day | Warm | Night |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| lounge-accents | 66.4 | 80.4 | 53.4 | 65.3 | 86 | 55.8 | 57.3 |
| designer-lamps | 66 | 79.4 | 53.2 | 65.5 | 86.1 | 55.3 | 56.7 |
| baseline | 64.4 | 72 | 55.1 | 66.1 | 83.9 | 55.4 | 53.9 |

## Winners By View And Preset

| View/Preset | Winning hero set | Score | Screenshot |
| --- | --- | ---: | --- |
| bird:daylight-window | baseline | 75.6 | output/render-quality-metrics/2026-04-28T17-10-46-706Z-base-bird-day.png |
| bird:night-room | baseline | 49.2 | output/render-quality-metrics/2026-04-28T17-10-46-706Z-base-bird-night.png |
| bird:warm-evening | baseline | 40.6 | output/render-quality-metrics/2026-04-28T17-10-46-706Z-base-bird-warm.png |
| isometric:daylight-window | lounge-accents | 98.8 | output/render-quality-metrics/2026-04-28T17-10-46-706Z-acc-iso-day.png |
| isometric:night-room | lounge-accents | 74.7 | output/render-quality-metrics/2026-04-28T17-10-46-706Z-acc-iso-night.png |
| isometric:warm-evening | lounge-accents | 67.7 | output/render-quality-metrics/2026-04-28T17-10-46-706Z-acc-iso-warm.png |
| pov:daylight-window | designer-lamps | 84.9 | output/render-quality-metrics/2026-04-28T17-10-46-706Z-lamp-pov-day.png |
| pov:night-room | baseline | 51.4 | output/render-quality-metrics/2026-04-28T17-10-46-706Z-base-pov-night.png |
| pov:warm-evening | baseline | 62.2 | output/render-quality-metrics/2026-04-28T17-10-46-706Z-base-pov-warm.png |

## Reading Rule

Do not promote an A/B candidate just because it exists. Promote it only when the screenshot looks better and the same view/preset score is not materially worse. If human preference and proxy score diverge, record that preference and recalibrate the score weights.
