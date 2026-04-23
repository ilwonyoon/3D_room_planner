# Render Quality Report

Generated: 2026-04-23T16:57:19.886Z

URL: http://127.0.0.1:5188/

Quality: `medium`

Average perceptual proxy score: 74.5

## Hero Set Summary

| Hero set | Avg | Isometric | Bird | POV | Day | Warm | Night |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| baseline | 74.5 | 79.2 | - | 69.7 | 72.8 | 74.8 | 75.8 |

## Winners By View And Preset

| View/Preset | Winning hero set | Score | Screenshot |
| --- | --- | ---: | --- |
| isometric:daylight-window | baseline | 84.8 | output/render-quality-metrics/2026-04-23T16-56-50-118Z-base-iso-day.png |
| isometric:night-room | baseline | 80.5 | output/render-quality-metrics/2026-04-23T16-56-50-118Z-base-iso-night.png |
| isometric:warm-evening | baseline | 72.4 | output/render-quality-metrics/2026-04-23T16-56-50-118Z-base-iso-warm.png |
| pov:daylight-window | baseline | 60.8 | output/render-quality-metrics/2026-04-23T16-56-50-118Z-base-pov-day.png |
| pov:night-room | baseline | 71.1 | output/render-quality-metrics/2026-04-23T16-56-50-118Z-base-pov-night.png |
| pov:warm-evening | baseline | 77.2 | output/render-quality-metrics/2026-04-23T16-56-50-118Z-base-pov-warm.png |

## Reading Rule

Do not promote an A/B candidate just because it exists. Promote it only when the screenshot looks better and the same view/preset score is not materially worse. If human preference and proxy score diverge, record that preference and recalibrate the score weights.
