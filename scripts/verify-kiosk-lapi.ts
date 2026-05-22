#!/usr/bin/env tsx
/**
 * For each bypass question, POSTs to /api/llm-match (which routes to LAPI),
 * and prints whether LAPI returned the EXPECTED answer id.
 *
 * Assumes:
 *  - Kiosk dev server running on localhost:3010 with DR_LLM_MATCH=1
 *  - LAPI daemon running on 127.0.0.1:9999
 *
 * Usage:
 *   npx tsx scripts/verify-kiosk-lapi.ts [path/to/questions.json]
 */
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { initialDemoAnswers } from '../lib/digital-receptionist/demo-data.js'

type Item = { id: string; lang: 'fr' | 'en' | 'ar'; q: string }

const here = dirname(fileURLToPath(import.meta.url))
const path = process.argv[2] ?? resolve(here, 'kiosk-bypass-questions.json')
const items: Item[] = JSON.parse(readFileSync(path, 'utf8'))
const published = initialDemoAnswers.filter((a) => a.published)

let correct = 0
let wrong = 0
let nullMatches = 0
async function run() {
for (const item of items) {
  const candidates = published.map((a) => ({
    id: a.id,
    canonical: a.canonicalQuestion[item.lang],
    answer: a.answerText[item.lang],
  }))
  const start = Date.now()
  const res = await fetch('http://localhost:3010/api/llm-match', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question: item.q, language: item.lang, candidates }),
  })
  const ms = Date.now() - start
  const json = (await res.json()) as {
    matchedAnswerId: string | null
    confidence: 'high' | 'medium' | 'low' | null
  }
  const got = json.matchedAnswerId ?? '(null)'
  const ok = got === item.id
  const mark = ok ? 'OK ' : got === '(null)' ? 'NULL' : 'BAD'
  if (ok) correct++
  else if (got === '(null)') nullMatches++
  else wrong++
  console.log(
    `  [${mark}] ${item.lang} ${(ms / 1000).toFixed(2)}s  expected=${item.id.padEnd(22)} got=${got.padEnd(22)} conf=${json.confidence ?? '-'}  q: ${item.q}`,
  )
}

console.log(`\nLAPI matched correctly: ${correct}/${items.length}`)
if (nullMatches) console.log(`Null matches (LAPI said no answer): ${nullMatches}`)
if (wrong) console.log(`Mismatched: ${wrong}`)
}
run().catch((err) => { console.error(err); process.exit(1) })
