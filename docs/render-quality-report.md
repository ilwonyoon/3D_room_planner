# Render Quality Report

Generated: 2026-04-28T17:41:25.595Z

URL: http://127.0.0.1:5190/

Quality: `high`

Average perceptual proxy score: 65.6

## Hero Set Summary

| Hero set | Avg | Isometric | Bird | POV | Day | Warm | Night |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| lounge-accents | 66.7 | 80.6 | 54.2 | 65.3 | 86.2 | 56.2 | 57.8 |
| designer-lamps | 66.4 | 79.7 | 54 | 65.5 | 86.3 | 55.7 | 57.2 |
| baseline | 63.8 | 72.2 | 53.2 | 66.1 | 83.2 | 54.7 | 53.5 |

## Winners By View And Preset

| View/Preset | Winning hero set | Score | Screenshot |
| --- | --- | ---: | --- |
| bird:daylight-window | lounge-accents | 75.2 | output/render-quality-metrics/2026-04-28T17-40-26-482Z-acc-bird-day.png |
| bird:night-room | lounge-accents | 47.9 | output/render-quality-metrics/2026-04-28T17-40-26-482Z-acc-bird-night.png |
| bird:warm-evening | lounge-accents | 39.5 | output/render-quality-metrics/2026-04-28T17-40-26-482Z-acc-bird-warm.png |
| isometric:daylight-window | lounge-accents | 98.8 | output/render-quality-metrics/2026-04-28T17-40-26-482Z-acc-iso-day.png |
| isometric:night-room | lounge-accents | 75 | output/render-quality-metrics/2026-04-28T17-40-26-482Z-acc-iso-night.png |
| isometric:warm-evening | lounge-accents | 68.1 | output/render-quality-metrics/2026-04-28T17-40-26-482Z-acc-iso-warm.png |
| pov:daylight-window | designer-lamps | 84.9 | output/render-quality-metrics/2026-04-28T17-40-26-482Z-lamp-pov-day.png |
| pov:night-room | baseline | 51.4 | output/render-quality-metrics/2026-04-28T17-40-26-482Z-base-pov-night.png |
| pov:warm-evening | baseline | 62.2 | output/render-quality-metrics/2026-04-28T17-40-26-482Z-base-pov-warm.png |

## Reading Rule

Do not promote an A/B candidate just because it exists. Promote it only when the screenshot looks better and the same view/preset score is not materially worse. If human preference and proxy score diverge, record that preference and recalibrate the score weights.
