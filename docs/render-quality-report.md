# Render Quality Report

Generated: 2026-04-28T17:59:36.727Z

URL: http://127.0.0.1:5190/

Quality: `high`

Average perceptual proxy score: 66.3

## Hero Set Summary

| Hero set | Avg | Isometric | Bird | POV | Day | Warm | Night |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| lounge-accents | 67.2 | 80.4 | 54.9 | 66.2 | 86.7 | 56.3 | 58.6 |
| designer-lamps | 66.9 | 79.4 | 54.8 | 66.4 | 86.8 | 55.7 | 58.2 |
| baseline | 64.9 | 71.5 | 56.1 | 67 | 83.5 | 55.7 | 55.4 |

## Winners By View And Preset

| View/Preset | Winning hero set | Score | Screenshot |
| --- | --- | ---: | --- |
| bird:daylight-window | lounge-accents | 75.6 | output/render-quality-metrics/2026-04-28T17-58-33-435Z-acc-bird-day.png |
| bird:night-room | baseline | 52.3 | output/render-quality-metrics/2026-04-28T17-58-33-435Z-base-bird-night.png |
| bird:warm-evening | baseline | 41.8 | output/render-quality-metrics/2026-04-28T17-58-33-435Z-base-bird-warm.png |
| isometric:daylight-window | lounge-accents | 98.8 | output/render-quality-metrics/2026-04-28T17-58-33-435Z-acc-iso-day.png |
| isometric:night-room | lounge-accents | 74.5 | output/render-quality-metrics/2026-04-28T17-58-33-435Z-acc-iso-night.png |
| isometric:warm-evening | lounge-accents | 68 | output/render-quality-metrics/2026-04-28T17-58-33-435Z-acc-iso-warm.png |
| pov:daylight-window | designer-lamps | 86 | output/render-quality-metrics/2026-04-28T17-58-33-435Z-lamp-pov-day.png |
| pov:night-room | baseline | 52.9 | output/render-quality-metrics/2026-04-28T17-58-33-435Z-base-pov-night.png |
| pov:warm-evening | baseline | 62.4 | output/render-quality-metrics/2026-04-28T17-58-33-435Z-base-pov-warm.png |

## Reading Rule

Do not promote an A/B candidate just because it exists. Promote it only when the screenshot looks better and the same view/preset score is not materially worse. If human preference and proxy score diverge, record that preference and recalibrate the score weights.
