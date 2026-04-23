# Render Quality Report

Generated: 2026-04-23T07:52:55.614Z

URL: http://127.0.0.1:5188/

Quality: `medium`

Average perceptual proxy score: 62.3

## Hero Set Summary

| Hero set | Avg | Isometric | Bird | POV | Day | Warm | Night |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| baseline | 67.7 | 71.8 | 57.2 | 74 | 77.6 | 65.3 | 60.1 |
| blender-emissive-lamps | 60.9 | 65.7 | 43.3 | 73.8 | 67.5 | 64.6 | 50.7 |
| material-rich | 60.4 | 64.5 | 42.9 | 73.7 | 67.2 | 64.3 | 49.7 |
| designer-lamps | 60.4 | 65.2 | 42.4 | 73.5 | 67 | 64.2 | 49.9 |

## Winners By View And Preset

| View/Preset | Winning hero set | Score | Screenshot |
| --- | --- | ---: | --- |
| bird:daylight-window | baseline | 74.4 | output/render-quality-metrics/2026-04-23T07-51-56-364Z-base-bird-day.png |
| bird:night-room | baseline | 51.4 | output/render-quality-metrics/2026-04-23T07-51-56-364Z-base-bird-night.png |
| bird:warm-evening | baseline | 45.8 | output/render-quality-metrics/2026-04-23T07-51-56-364Z-base-bird-warm.png |
| isometric:daylight-window | baseline | 87.7 | output/render-quality-metrics/2026-04-23T07-51-56-364Z-base-iso-day.png |
| isometric:night-room | baseline | 58.8 | output/render-quality-metrics/2026-04-23T07-51-56-364Z-base-iso-night.png |
| isometric:warm-evening | blender-emissive-lamps | 71.8 | output/render-quality-metrics/2026-04-23T07-51-56-364Z-emit-iso-warm.png |
| pov:daylight-window | material-rich | 73.4 | output/render-quality-metrics/2026-04-23T07-51-56-364Z-mat-pov-day.png |
| pov:night-room | baseline | 70.2 | output/render-quality-metrics/2026-04-23T07-51-56-364Z-base-pov-night.png |
| pov:warm-evening | baseline | 81.2 | output/render-quality-metrics/2026-04-23T07-51-56-364Z-base-pov-warm.png |

## Reading Rule

Do not promote an A/B candidate just because it exists. Promote it only when the screenshot looks better and the same view/preset score is not materially worse. If human preference and proxy score diverge, record that preference and recalibrate the score weights.
