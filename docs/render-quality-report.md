# Render Quality Report

Generated: 2026-04-28T19:27:18.602Z

URL: http://127.0.0.1:5190/

Quality: `high`

Average perceptual proxy score: 65.4

## Hero Set Summary

| Hero set | Avg | Isometric | Bird | POV | Day | Warm | Night |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| lounge-accents | 66.2 | 77.7 | 54.3 | 66.6 | 87.1 | 53.7 | 57.8 |
| designer-lamps | 65.9 | 76.7 | 54.1 | 66.7 | 87 | 53.3 | 57.2 |
| baseline | 64.1 | 70.1 | 55.3 | 66.9 | 84 | 53.4 | 54.9 |

## Winners By View And Preset

| View/Preset | Winning hero set | Score | Screenshot |
| --- | --- | ---: | --- |
| bird:daylight-window | lounge-accents | 74.8 | output/render-quality-metrics/2026-04-28T19-26-21-305Z-acc-bird-day.png |
| bird:night-room | baseline | 52.4 | output/render-quality-metrics/2026-04-28T19-26-21-305Z-base-bird-night.png |
| bird:warm-evening | baseline | 39.5 | output/render-quality-metrics/2026-04-28T19-26-21-305Z-base-bird-warm.png |
| isometric:daylight-window | lounge-accents | 98.8 | output/render-quality-metrics/2026-04-28T19-26-21-305Z-acc-iso-day.png |
| isometric:night-room | lounge-accents | 70.8 | output/render-quality-metrics/2026-04-28T19-26-21-305Z-acc-iso-night.png |
| isometric:warm-evening | lounge-accents | 63.6 | output/render-quality-metrics/2026-04-28T19-26-21-305Z-acc-iso-warm.png |
| pov:daylight-window | baseline | 88 | output/render-quality-metrics/2026-04-28T19-26-21-305Z-base-pov-day.png |
| pov:night-room | designer-lamps | 52.8 | output/render-quality-metrics/2026-04-28T19-26-21-305Z-lamp-pov-night.png |
| pov:warm-evening | baseline | 60.1 | output/render-quality-metrics/2026-04-28T19-26-21-305Z-base-pov-warm.png |

## Reading Rule

Do not promote an A/B candidate just because it exists. Promote it only when the screenshot looks better and the same view/preset score is not materially worse. If human preference and proxy score diverge, record that preference and recalibrate the score weights.
