#!/usr/bin/env tsx
/**
 * Verifies a list of paraphrased visitor questions all bypass the local
 * keyword matcher — meaning each one will fall through to the LAPI
 * semantic matcher when asked in the kiosk UI.
 *
 * Usage:
 *   npx tsx scripts/verify-kiosk-bypass.ts [path/to/questions.json]
 *
 * Default questions file: scripts/kiosk-bypass-questions.json
 */
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { matchQuestion } from '../lib/digital-receptionist/prototype-logic.js'
import { initialDemoAnswers } from '../lib/digital-receptionist/demo-data.js'

type Item = { id: string; lang: 'fr' | 'en' | 'ar'; q: string }

const here = dirname(fileURLToPath(import.meta.url))
const path = process.argv[2] ?? resolve(here, 'kiosk-bypass-questions.json')
const questions: Item[] = JSON.parse(readFileSync(path, 'utf8'))
const published = initialDemoAnswers.filter((a) => a.published)

let bypass = 0
const leaks: Array<{ q: string; hit: string; score: number; expected: string }> = []
for (const item of questions) {
  const r = matchQuestion(item.q, published)
  if (r.hit) {
    leaks.push({ q: item.q, hit: r.answer.id, score: r.score, expected: item.id })
  } else {
    bypass++
  }
}

console.log(`Bypasses keyword matcher: ${bypass}/${questions.length}`)
if (leaks.length) {
  console.log('\nLEAKS (keyword matcher caught these — would NOT hit LAPI):')
  for (const l of leaks) {
    console.log(`  "${l.q}"`)
    console.log(`    → caught by "${l.hit}" (score ${l.score.toFixed(2)}), expected LAPI to match "${l.expected}"`)
  }
  process.exit(1)
}
