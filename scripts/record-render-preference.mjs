import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'

function parseArgs() {
  const args = new Map()

  for (const arg of process.argv.slice(2)) {
    const [key, ...rest] = arg.split('=')
    args.set(key.replace(/^--/, ''), rest.length === 0 ? true : rest.join('='))
  }

  return {
    run: args.get('run') || 'output/render-quality-metrics/latest.json',
    winner: args.get('winner'),
    loser: args.get('loser'),
    reason: args.get('reason') || '',
    rating: args.get('rating') ? Number(args.get('rating')) : null,
    out: args.get('out') || 'output/render-quality-preferences/preferences.json',
  }
}

function loadJson(path, fallback) {
  if (!existsSync(path)) return fallback
  return JSON.parse(readFileSync(path, 'utf8'))
}

function findPreset(run, id) {
  return run.presets.find((preset) => preset.id === id || preset.label === id)
}

function writeMarkdown(path, preferences) {
  const rows = preferences.records
    .map(
      (record) =>
        `| ${record.createdAt} | ${record.runId} | ${record.winner.id} | ${record.loser.id} | ${record.rating ?? '-'} | ${record.reason || '-'} |`,
    )
    .join('\n')

  writeFileSync(
    path,
    `# Render Preference Log

This file records human A/B preference against the render quality harness. It should not be auto-filled from metric winners.

| Created | Run | Winner | Loser | Rating | Reason |
| --- | --- | --- | ---: | ---: | --- |
${rows}
`,
  )
}

function main() {
  const options = parseArgs()

  if (!options.winner || !options.loser) {
    throw new Error(
      'Usage: pnpm render:record-preference --run=output/render-quality-metrics/latest.json --winner=<preset-id-or-label> --loser=<preset-id-or-label> --rating=4 --reason="better lamp mood"',
    )
  }

  const run = loadJson(options.run)
  const winner = findPreset(run, options.winner)
  const loser = findPreset(run, options.loser)

  if (!winner) {
    throw new Error(`Winner "${options.winner}" was not found in ${options.run}`)
  }

  if (!loser) {
    throw new Error(`Loser "${options.loser}" was not found in ${options.run}`)
  }

  const preferences = loadJson(options.out, { records: [] })
  preferences.records.push({
    createdAt: new Date().toISOString(),
    runId: run.runId,
    runPath: options.run,
    winner: {
      id: winner.id,
      label: winner.label,
      score: winner.score.perceptualProxyScore,
      screenshot: winner.screenshot,
    },
    loser: {
      id: loser.id,
      label: loser.label,
      score: loser.score.perceptualProxyScore,
      screenshot: loser.screenshot,
    },
    rating: options.rating,
    reason: options.reason,
  })

  mkdirSync(dirname(options.out), { recursive: true })
  writeFileSync(options.out, `${JSON.stringify(preferences, null, 2)}\n`)
  writeMarkdown(join('docs', 'render-preference-log.md'), preferences)
  console.log(`wrote ${options.out}`)
}

main()
