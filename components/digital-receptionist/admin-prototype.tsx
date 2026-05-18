'use client'

import Link from 'next/link'
import { ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Activity,
  ArrowUpRight,
  BarChart3,
  Check,
  Copy,
  Cpu,
  Download,
  FileJson,
  KeyRound,
  Languages,
  MessageSquarePlus,
  MessageSquareWarning,
  MonitorCheck,
  Play,
  Plus,
  RotateCcw,
  Save,
  Settings2,
  ShieldCheck,
  Square,
  Trash2,
  Upload,
  WalletCards,
  Volume2,
  X,
} from 'lucide-react'
import {
  answerCategories,
  demoLanguages,
  type AnswerCategory,
  type DemoAction,
  type DemoAnswer,
  type DemoLanguage,
  type LocalizedText,
  type PilotCounter,
  type PilotProfile,
  type UnknownQuestion,
} from '@/lib/digital-receptionist/demo-data'
import {
  createBlankCounter,
  formatKeywordDraft,
  parseKeywordDraft,
} from '@/lib/digital-receptionist/pilot-config'
import { pilotScenarios, type PilotScenario } from '@/lib/digital-receptionist/pilot-scenarios'
import { usePrototypeStore } from './use-prototype-store'
import type { AuditLogItem, KioskDeviceItem, PilotAnalytics } from './use-prototype-store'
import {
  defaultVoiceSettings,
  type VoiceCatalog,
  type VoiceSettings,
  voiceLabel,
} from '@/lib/digital-receptionist/voice-library'

type AdminTab = 'setup' | 'answers' | 'review' | 'operations' | 'analytics' | 'settings' | 'import'

function getDirection(language: DemoLanguage) {
  return language === 'ar' ? 'rtl' : 'ltr'
}

function languageName(language: DemoLanguage) {
  return demoLanguages.find((item) => item.id === language)?.label ?? language
}

function voiceSettingsSignature(settings: VoiceSettings) {
  return demoLanguages.map((item) => settings[item.id] ?? '').join('|')
}

function updateLocalizedText(
  value: LocalizedText,
  language: DemoLanguage,
  nextValue: string
): LocalizedText {
  return {
    ...value,
    [language]: nextValue,
  }
}

function MetricCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof BarChart3
  label: string
  value: string
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <span className="flex size-10 items-center justify-center rounded-lg bg-cyan-50 text-cyan-700">
          <Icon className="size-5" />
        </span>
        <div>
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="text-2xl font-semibold text-slate-950">{value}</p>
        </div>
      </div>
    </div>
  )
}

function LanguageSegment({
  language,
  setLanguage,
}: {
  language: DemoLanguage
  setLanguage: (language: DemoLanguage) => void
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {demoLanguages.map((item) => (
        <button
          key={item.id}
          className={`min-h-10 rounded-lg border px-3 text-sm font-semibold ${
            item.id === language
              ? 'border-cyan-700 bg-cyan-700 text-white'
              : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
          }`}
          type="button"
          onClick={() => setLanguage(item.id)}
        >
          {item.shortLabel}
        </button>
      ))}
    </div>
  )
}

function Field({
  label,
  value,
  onChange,
  dir,
  multiline = false,
  type = 'text',
}: {
  label: string
  value: string
  onChange: (value: string) => void
  dir?: 'ltr' | 'rtl'
  multiline?: boolean
  type?: 'text' | 'password'
}) {
  return (
    <label className="block">
      <span className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
        {label}
      </span>
      {multiline ? (
        <textarea
          className="mt-2 min-h-24 w-full resize-y rounded-lg border border-slate-300 bg-white p-3 text-sm leading-relaxed text-slate-950 outline-none focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100"
          dir={dir}
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
      ) : (
        <input
          className="mt-2 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-950 outline-none focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100"
          dir={dir}
          type={type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
      )}
    </label>
  )
}

function LocalizedFieldSet({
  label,
  value,
  onChange,
  multiline,
}: {
  label: string
  value: LocalizedText
  onChange: (value: LocalizedText) => void
  multiline?: boolean
}) {
  return (
    <div>
      <p className="text-sm font-semibold text-slate-700">{label}</p>
      <div className="mt-2 grid gap-3 lg:grid-cols-3">
        {demoLanguages.map((item) => (
          <Field
            key={item.id}
            dir={getDirection(item.id)}
            label={item.shortLabel}
            multiline={multiline}
            value={value[item.id]}
            onChange={(nextValue) => onChange(updateLocalizedText(value, item.id, nextValue))}
          />
        ))}
      </div>
    </div>
  )
}

function AdminTabs({
  activeTab,
  setActiveTab,
}: {
  activeTab: AdminTab
  setActiveTab: (tab: AdminTab) => void
}) {
  const tabs: Array<{ id: AdminTab; label: string; icon: typeof Settings2 }> = [
    { id: 'setup', label: 'Pilot setup', icon: Settings2 },
    { id: 'answers', label: 'FAQ library', icon: MessageSquarePlus },
    { id: 'review', label: 'Review queue', icon: MessageSquareWarning },
    { id: 'operations', label: 'Operations', icon: MonitorCheck },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'settings', label: 'Settings', icon: KeyRound },
    { id: 'import', label: 'Import/export', icon: FileJson },
  ]

  return (
    <nav className="grid gap-2 md:grid-cols-3 xl:grid-cols-7">
      {tabs.map((tab) => {
        const Icon = tab.icon

        return (
          <button
            key={tab.id}
            className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border px-3 text-sm font-semibold ${
              activeTab === tab.id
                ? 'border-cyan-700 bg-cyan-700 text-white'
                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
            }`}
            type="button"
            onClick={() => setActiveTab(tab.id)}
          >
            <Icon className="size-4" />
            {tab.label}
          </button>
        )
      })}
    </nav>
  )
}

function scenarioMatchesProfile(scenario: PilotScenario, profile: PilotProfile) {
  return (
    scenario.profile.tenantName.fr === profile.tenantName.fr &&
    scenario.profile.locationName.fr === profile.locationName.fr
  )
}

function ScenarioChooser({
  profile,
  applyPilotScenario,
}: {
  profile: PilotProfile
  applyPilotScenario: (scenarioId: string) => Promise<void>
}) {
  const [applyingId, setApplyingId] = useState<string>()
  const activeScenarioId = pilotScenarios.find((scenario) =>
    scenarioMatchesProfile(scenario, profile)
  )?.id

  const handleApply = async (scenarioId: string) => {
    setApplyingId(scenarioId)
    await applyPilotScenario(scenarioId)
    setApplyingId(undefined)
  }

  return (
    <section className="rounded-lg border border-cyan-100 bg-cyan-50 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-slate-950">Pilot scenarios</h3>
          <p className="mt-1 text-sm text-slate-600">
            Apply a complete Algerian demo package before customizing the location.
          </p>
        </div>
        <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-cyan-800">
          {pilotScenarios.length} templates
        </span>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-3">
        {pilotScenarios.map((scenario) => {
          const active = activeScenarioId === scenario.id
          const applying = applyingId === scenario.id

          return (
            <article
              key={scenario.id}
              className={`rounded-lg border bg-white p-4 shadow-sm ${
                active ? 'border-cyan-500 ring-2 ring-cyan-100' : 'border-slate-200'
              }`}
            >
              <div className="flex min-h-40 flex-col">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-cyan-700">
                      {scenario.customerType}
                    </p>
                    <h4 className="mt-2 text-base font-semibold text-slate-950">{scenario.title}</h4>
                  </div>
                  {active ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-800">
                      <Check className="size-3" />
                      Active
                    </span>
                  ) : null}
                </div>
                <p className="mt-3 text-sm leading-relaxed text-slate-600">{scenario.description}</p>
                <p className="mt-2 text-sm font-medium leading-relaxed text-slate-700">
                  {scenario.valueProposition}
                </p>
                <button
                  className={`mt-auto inline-flex min-h-10 items-center justify-center gap-2 rounded-lg px-3 text-sm font-semibold ${
                    active
                      ? 'border border-cyan-200 bg-cyan-50 text-cyan-800'
                      : 'bg-cyan-700 text-white hover:bg-cyan-800'
                  }`}
                  disabled={applying}
                  type="button"
                  onClick={() => void handleApply(scenario.id)}
                >
                  <RotateCcw className="size-4" />
                  {applying ? 'Applying' : active ? 'Reapply' : 'Apply scenario'}
                </button>
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}

function PilotSetupPanel({
  profile,
  applyPilotScenario,
  savePilotProfile,
}: {
  profile: PilotProfile
  applyPilotScenario: (scenarioId: string) => Promise<void>
  savePilotProfile: (profile: PilotProfile) => Promise<void>
}) {
  const [draft, setDraft] = useState(profile)
  const [saved, setSaved] = useState(false)

  const updateCounter = (
    counterId: string,
    updater: (counter: PilotCounter) => PilotCounter
  ) => {
    setDraft((current) => ({
      ...current,
      counters: current.counters.map((counter) =>
        counter.id === counterId ? updater(counter) : counter
      ),
    }))
  }

  const handleSave = () => {
    void savePilotProfile(draft)
    setSaved(true)
    window.setTimeout(() => setSaved(false), 1600)
  }

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-500">
            Customer pilot
          </p>
          <h2 className="mt-1 text-2xl font-semibold text-slate-950">Location setup</h2>
        </div>
        <button
          className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-cyan-700 px-4 text-sm font-semibold text-white hover:bg-cyan-800"
          type="button"
          onClick={handleSave}
        >
          <Save className="size-4" />
          {saved ? 'Saved' : 'Save setup'}
        </button>
      </div>

      <div className="mt-5 grid gap-5">
        <ScenarioChooser profile={profile} applyPilotScenario={applyPilotScenario} />

        <LocalizedFieldSet
          label="Tenant name"
          value={draft.tenantName}
          onChange={(tenantName) => setDraft((current) => ({ ...current, tenantName }))}
        />
        <LocalizedFieldSet
          label="Location / service"
          value={draft.locationName}
          onChange={(locationName) => setDraft((current) => ({ ...current, locationName }))}
        />
        <LocalizedFieldSet
          label="Welcome title"
          value={draft.welcomeTitle}
          onChange={(welcomeTitle) => setDraft((current) => ({ ...current, welcomeTitle }))}
        />
        <LocalizedFieldSet
          label="Service summary"
          multiline
          value={draft.serviceSummary}
          onChange={(serviceSummary) => setDraft((current) => ({ ...current, serviceSummary }))}
        />
        <LocalizedFieldSet
          label="Opening hours"
          value={draft.openingHours}
          onChange={(openingHours) => setDraft((current) => ({ ...current, openingHours }))}
        />
        <LocalizedFieldSet
          label="Privacy note"
          multiline
          value={draft.privacyNote}
          onChange={(privacyNote) => setDraft((current) => ({ ...current, privacyNote }))}
        />

        <div className="grid gap-3 md:grid-cols-3">
          <Field
            label="Contact number"
            value={draft.contactNumber}
            onChange={(contactNumber) => setDraft((current) => ({ ...current, contactNumber }))}
          />
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
              Default language
            </span>
            <select
              className="mt-2 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-950 outline-none focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100"
              value={draft.defaultLanguage}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  defaultLanguage: event.target.value as DemoLanguage,
                }))
              }
            >
              {demoLanguages.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
          <LocalizedFieldSet
            label="Estimated wait"
            value={draft.currentWait}
            onChange={(currentWait) => setDraft((current) => ({ ...current, currentWait }))}
          />
        </div>

        <LocalizedFieldSet
          label="Live status"
          value={draft.liveStatus}
          onChange={(liveStatus) => setDraft((current) => ({ ...current, liveStatus }))}
        />

        <section className="rounded-lg border border-slate-200 bg-slate-50 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-slate-950">Services and counters</h3>
              <p className="text-sm text-slate-500">{draft.counters.length} visible entries</p>
            </div>
            <button
              className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              type="button"
              onClick={() =>
                setDraft((current) => ({
                  ...current,
                  counters: [...current.counters, createBlankCounter()],
                }))
              }
            >
              <Plus className="size-4" />
              Add counter
            </button>
          </div>

          <div className="mt-4 grid gap-3">
            {draft.counters.map((counter) => (
              <article key={counter.id} className="rounded-lg border border-slate-200 bg-white p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-slate-700">Counter</p>
                  <button
                    className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-rose-200 px-3 text-xs font-semibold text-rose-700 hover:bg-rose-50"
                    type="button"
                    onClick={() =>
                      setDraft((current) => ({
                        ...current,
                        counters: current.counters.filter((item) => item.id !== counter.id),
                      }))
                    }
                  >
                    <Trash2 className="size-4" />
                    Remove
                  </button>
                </div>
                <div className="grid gap-4 xl:grid-cols-2">
                  <LocalizedFieldSet
                    label="Label"
                    value={counter.label}
                    onChange={(label) =>
                      updateCounter(counter.id, (currentCounter) => ({
                        ...currentCounter,
                        label,
                      }))
                    }
                  />
                  <LocalizedFieldSet
                    label="Status"
                    value={counter.status}
                    onChange={(status) =>
                      updateCounter(counter.id, (currentCounter) => ({
                        ...currentCounter,
                        status,
                      }))
                    }
                  />
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </section>
  )
}

function AnswerList({
  answers,
  language,
  selectedId,
  setSelectedId,
  onCreate,
}: {
  answers: DemoAnswer[]
  language: DemoLanguage
  selectedId?: string
  setSelectedId: (id: string) => void
  onCreate: () => void
}) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between gap-3 border-b border-slate-200 p-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-950">Approved Answers</h2>
          <p className="mt-1 text-sm text-slate-500">
            {answers.filter((answer) => answer.published).length} published / {answers.length} total
          </p>
        </div>
        <button
          className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-cyan-700 px-3 text-sm font-semibold text-white hover:bg-cyan-800"
          type="button"
          onClick={onCreate}
        >
          <Plus className="size-4" />
          New
        </button>
      </div>
      <div className="max-h-[680px] overflow-auto p-2">
        {answers.map((answer) => (
          <button
            key={answer.id}
            className={`mb-2 w-full rounded-lg border p-3 text-left transition ${
              answer.id === selectedId
                ? 'border-cyan-500 bg-cyan-50'
                : 'border-transparent bg-white hover:border-slate-200 hover:bg-slate-50'
            }`}
            type="button"
            onClick={() => setSelectedId(answer.id)}
          >
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm font-semibold leading-snug text-slate-950">
                {answer.canonicalQuestion[language]}
              </p>
              <span
                className={`shrink-0 rounded-full px-2 py-1 text-xs font-semibold ${
                  answer.published ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                }`}
              >
                {answer.published ? 'Live' : 'Draft'}
              </span>
            </div>
            <div className="mt-3 flex flex-wrap gap-1">
              <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-600">
                {answer.category}
              </span>
              <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-600">
                {answer.usageCount} uses
              </span>
              {answer.actionId ? (
                <span className="rounded-full bg-cyan-100 px-2 py-1 text-[11px] font-semibold text-cyan-800">
                  action
                </span>
              ) : null}
            </div>
          </button>
        ))}
      </div>
    </section>
  )
}

function AnswerEditor({
  actions,
  answer,
  language,
  saveAnswer,
  duplicateAnswer,
  deleteAnswer,
  toggleAnswerPublished,
}: {
  actions: DemoAction[]
  answer?: DemoAnswer
  language: DemoLanguage
  saveAnswer: (answer: DemoAnswer) => Promise<void>
  duplicateAnswer: (answerId: string) => Promise<DemoAnswer | undefined>
  deleteAnswer: (answerId: string) => Promise<void>
  toggleAnswerPublished: (answerId: string) => Promise<void>
}) {
  const [draft, setDraft] = useState(answer)
  const [keywordDraft, setKeywordDraft] = useState(answer ? formatKeywordDraft(answer.keywords) : '')
  const [saved, setSaved] = useState(false)

  if (!draft) {
    return (
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-slate-500">Create or select an answer.</p>
      </section>
    )
  }

  const handleSave = () => {
    void saveAnswer({
      ...draft,
      keywords: parseKeywordDraft(keywordDraft),
    })
    setSaved(true)
    window.setTimeout(() => setSaved(false), 1600)
  }

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-500">
            FAQ Editor
          </p>
          <h2 className="mt-1 text-2xl font-semibold text-slate-950">
            {draft.canonicalQuestion[language]}
          </h2>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-200 px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            type="button"
            onClick={() => void duplicateAnswer(draft.id)}
          >
            <Copy className="size-4" />
            Duplicate
          </button>
          <button
            className={`inline-flex min-h-10 items-center gap-2 rounded-lg px-3 text-sm font-semibold ${
              draft.published
                ? 'border border-slate-200 text-slate-700 hover:bg-slate-50'
                : 'bg-emerald-700 text-white hover:bg-emerald-800'
            }`}
            type="button"
            onClick={() => {
              void toggleAnswerPublished(draft.id)
              setDraft((current) =>
                current
                  ? {
                      ...current,
                      published: !current.published,
                      lastUpdated: new Date().toISOString().slice(0, 10),
                    }
                  : current
              )
            }}
          >
            <ShieldCheck className="size-4" />
            {draft.published ? 'Unpublish' : 'Publish'}
          </button>
          <button
            className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-rose-200 px-3 text-sm font-semibold text-rose-700 hover:bg-rose-50"
            type="button"
            onClick={() => void deleteAnswer(draft.id)}
          >
            <Trash2 className="size-4" />
            Delete
          </button>
          <button
            className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-cyan-700 px-4 text-sm font-semibold text-white hover:bg-cyan-800"
            type="button"
            onClick={handleSave}
          >
            <Save className="size-4" />
            {saved ? 'Saved' : 'Save'}
          </button>
        </div>
      </div>

      <div className="mt-5 grid gap-5">
        <LocalizedFieldSet
          label="Canonical question"
          value={draft.canonicalQuestion}
          onChange={(canonicalQuestion) => setDraft((current) => current && { ...current, canonicalQuestion })}
        />
        <LocalizedFieldSet
          label="Approved answer"
          multiline
          value={draft.answerText}
          onChange={(answerText) => setDraft((current) => current && { ...current, answerText })}
        />

        <div className="grid gap-3 md:grid-cols-3">
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
              Category
            </span>
            <select
              className="mt-2 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-950 outline-none focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100"
              value={draft.category}
              onChange={(event) =>
                setDraft((current) =>
                  current
                    ? {
                        ...current,
                        category: event.target.value as AnswerCategory,
                      }
                    : current
                )
              }
            >
              {answerCategories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
              Visitor action
            </span>
            <select
              className="mt-2 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-950 outline-none focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100"
              value={draft.actionId ?? ''}
              onChange={(event) =>
                setDraft((current) =>
                  current
                    ? {
                        ...current,
                        actionId: event.target.value || undefined,
                      }
                    : current
                )
              }
            >
              <option value="">No action</option>
              {actions.map((action) => (
                <option key={action.id} value={action.id}>
                  {action.label[language]} ({action.type})
                </option>
              ))}
            </select>
          </label>

          <Field
            label="Keywords"
            value={keywordDraft}
            onChange={setKeywordDraft}
          />
        </div>

        <div className="flex flex-wrap gap-2 text-sm text-slate-600">
          <span className="rounded-full bg-slate-100 px-3 py-1 font-medium">
            Updated {draft.lastUpdated}
          </span>
          <span className="rounded-full bg-slate-100 px-3 py-1 font-medium">
            {draft.usageCount} uses
          </span>
          <span
            className={`rounded-full px-3 py-1 font-medium ${
              draft.published ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
            }`}
          >
            {draft.published ? 'Published to kiosk' : 'Draft only'}
          </span>
        </div>
      </div>
    </section>
  )
}

function UnknownQuestionItem({
  actions,
  candidate,
  language,
  approveUnknown,
  markUnknown,
}: {
  actions: DemoAction[]
  candidate: UnknownQuestion
  language: DemoLanguage
  approveUnknown: (candidateId: string, answerText: LocalizedText, actionId?: string) => Promise<void>
  markUnknown: (candidateId: string, status: 'rejected' | 'out_of_scope') => Promise<void>
}) {
  const [draft, setDraft] = useState<LocalizedText>(() => ({
    ...candidate.fallbackResponse,
    [candidate.language]: candidate.fallbackResponse[candidate.language],
  }))
  const [actionId, setActionId] = useState('staff-help')

  const handleApprove = () => {
    void approveUnknown(candidate.id, draft, actionId || undefined)
  }

  return (
    <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-900">
              {candidate.confidence}
            </span>
            <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">
              {languageName(candidate.language)}
            </span>
            <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">
              x{candidate.count}
            </span>
          </div>
          <p className="mt-3 text-base font-semibold text-slate-950">{candidate.question}</p>
        </div>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-3">
        {demoLanguages.map((item) => (
          <Field
            key={item.id}
            dir={getDirection(item.id)}
            label={`${item.shortLabel}${item.id === candidate.language ? ' visitor language' : ''}`}
            multiline
            value={draft[item.id]}
            onChange={(nextValue) => setDraft(updateLocalizedText(draft, item.id, nextValue))}
          />
        ))}
      </div>

      <label className="mt-3 block">
        <span className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
          Visitor action
        </span>
        <select
          className="mt-2 min-h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-950 outline-none focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100"
          value={actionId}
          onChange={(event) => setActionId(event.target.value)}
        >
          <option value="">No action</option>
          {actions.map((action) => (
            <option key={action.id} value={action.id}>
              {action.label[language]} ({action.type})
            </option>
          ))}
        </select>
      </label>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-emerald-700 px-3 text-sm font-semibold text-white hover:bg-emerald-800"
          type="button"
          onClick={handleApprove}
        >
          <Check className="size-4" />
          Approve
        </button>
        <button
          className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-200 px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          type="button"
          onClick={() => void markUnknown(candidate.id, 'out_of_scope')}
        >
          <X className="size-4" />
          Out of scope
        </button>
        <button
          className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-200 px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          type="button"
          onClick={() => void markUnknown(candidate.id, 'rejected')}
        >
          Reject
        </button>
      </div>
    </article>
  )
}

function ReviewQueue({
  actions,
  candidates,
  language,
  approveUnknown,
  markUnknown,
}: {
  actions: DemoAction[]
  candidates: UnknownQuestion[]
  language: DemoLanguage
  approveUnknown: (candidateId: string, answerText: LocalizedText, actionId?: string) => Promise<void>
  markUnknown: (candidateId: string, status: 'rejected' | 'out_of_scope') => Promise<void>
}) {
  const activeCandidates = candidates.filter((candidate) => candidate.status === 'new')

  return (
    <section className="rounded-lg border border-slate-200 bg-slate-50 p-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-950">Unknown Questions</h2>
          <p className="mt-1 text-sm text-slate-500">Approve useful answers for reuse.</p>
        </div>
        <span className="rounded-full bg-amber-100 px-3 py-1 text-sm font-semibold text-amber-900">
          {activeCandidates.length}
        </span>
      </div>
      <div className="grid gap-3">
        {activeCandidates.length > 0 ? (
          activeCandidates.map((candidate) => (
            <UnknownQuestionItem
              key={candidate.id}
              actions={actions}
              approveUnknown={approveUnknown}
              candidate={candidate}
              language={language}
              markUnknown={markUnknown}
            />
          ))
        ) : (
          <div className="rounded-lg border border-dashed border-slate-300 bg-white p-6 text-center text-slate-500">
            No active unknown questions.
          </div>
        )}
      </div>
    </section>
  )
}

function ImportExportPanel({
  exportPilotJson,
  importPilotJson,
}: {
  exportPilotJson: () => string
  importPilotJson: (raw: string) => Promise<void>
}) {
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [exportText, setExportText] = useState(() => exportPilotJson())
  const [importText, setImportText] = useState('')
  const [status, setStatus] = useState('Ready')

  const refreshExport = () => {
    setExportText(exportPilotJson())
    setStatus('Export refreshed')
  }

  const handleDownload = () => {
    const blob = new Blob([exportPilotJson()], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `digital-receptionist-pilot-${new Date().toISOString().slice(0, 10)}.json`
    link.click()
    URL.revokeObjectURL(url)
  }

  const handleImport = async (raw: string) => {
    try {
      await importPilotJson(raw)
      setImportText(raw)
      setExportText(exportPilotJson())
      setStatus('Import complete')
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Import failed')
    }
  }

  const handleFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]

    if (!file) {
      return
    }

    file
      .text()
      .then((raw) => void handleImport(raw))
      .catch(() => setStatus('Could not read file'))
  }

  return (
    <section className="grid gap-5 xl:grid-cols-2">
      <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-500">
              Export
            </p>
            <h2 className="mt-1 text-2xl font-semibold text-slate-950">Pilot JSON</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-200 px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              type="button"
              onClick={refreshExport}
            >
              <RotateCcw className="size-4" />
              Refresh
            </button>
            <button
              className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-cyan-700 px-3 text-sm font-semibold text-white hover:bg-cyan-800"
              type="button"
              onClick={handleDownload}
            >
              <Download className="size-4" />
              Download
            </button>
          </div>
        </div>
        <textarea
          className="mt-4 min-h-[520px] w-full resize-y rounded-lg border border-slate-300 bg-slate-950 p-4 font-mono text-xs leading-relaxed text-slate-100 outline-none focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100"
          spellCheck={false}
          value={exportText}
          onChange={(event) => setExportText(event.target.value)}
        />
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-500">
              Import
            </p>
            <h2 className="mt-1 text-2xl font-semibold text-slate-950">Load another pilot</h2>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-600">
            {status}
          </span>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-200 px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            type="button"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="size-4" />
            Upload JSON
          </button>
          <input
            ref={fileInputRef}
            className="hidden"
            accept="application/json,.json"
            type="file"
            onChange={handleFile}
          />
          <button
            className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-emerald-700 px-3 text-sm font-semibold text-white hover:bg-emerald-800"
            type="button"
            onClick={() => void handleImport(importText)}
          >
            <Upload className="size-4" />
            Import pasted JSON
          </button>
        </div>

        <textarea
          className="mt-4 min-h-[520px] w-full resize-y rounded-lg border border-slate-300 bg-white p-4 font-mono text-xs leading-relaxed text-slate-950 outline-none focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100"
          placeholder="Paste exported pilot JSON here"
          spellCheck={false}
          value={importText}
          onChange={(event) => setImportText(event.target.value)}
        />
      </div>
    </section>
  )
}

function BudgetPolicy() {
  return (
    <aside className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-3">
        <span className="flex size-11 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
          <WalletCards className="size-5" />
        </span>
        <div>
          <h2 className="text-lg font-semibold text-slate-950">Budget Policy</h2>
          <p className="text-sm text-slate-500">Lite First</p>
        </div>
      </div>
      <dl className="mt-5 space-y-3 text-sm">
        <div className="flex justify-between gap-3 border-b border-slate-100 pb-3">
          <dt className="text-slate-500">Premium spend today</dt>
          <dd className="font-semibold text-slate-950">$0.00</dd>
        </div>
        <div className="flex justify-between gap-3 border-b border-slate-100 pb-3">
          <dt className="text-slate-500">Fallback mode</dt>
          <dd className="font-semibold text-slate-950">Lite avatar</dd>
        </div>
        <div className="flex justify-between gap-3 border-b border-slate-100 pb-3">
          <dt className="text-slate-500">Provider calls</dt>
          <dd className="font-semibold text-slate-950">0</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-slate-500">Answer source</dt>
          <dd className="font-semibold text-slate-950">Local cache</dd>
        </div>
      </dl>
    </aside>
  )
}

function OperationsPanel({
  auditLogs,
  devices,
}: {
  auditLogs: AuditLogItem[]
  devices: KioskDeviceItem[]
}) {
  return (
    <section className="grid gap-5 xl:grid-cols-[420px_minmax(0,1fr)]">
      <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="flex size-11 items-center justify-center rounded-lg bg-cyan-50 text-cyan-700">
            <MonitorCheck className="size-5" />
          </span>
          <div>
            <h2 className="text-lg font-semibold text-slate-950">Kiosk Devices</h2>
            <p className="text-sm text-slate-500">Heartbeat updates every 15 seconds</p>
          </div>
        </div>

        <div className="mt-5 grid gap-3">
          {devices.length > 0 ? (
            devices.map((device) => (
              <article key={device.id} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-950">{device.label}</p>
                    <p className="mt-1 break-all text-xs text-slate-500">{device.id}</p>
                  </div>
                  <span
                    className={`rounded-full px-2 py-1 text-xs font-semibold ${
                      device.status === 'online'
                        ? 'bg-emerald-100 text-emerald-800'
                        : device.status === 'stale'
                          ? 'bg-amber-100 text-amber-900'
                          : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {device.status}
                  </span>
                </div>
                <dl className="mt-4 grid gap-2 text-sm">
                  <div className="flex justify-between gap-3">
                    <dt className="text-slate-500">Last seen</dt>
                    <dd className="font-medium text-slate-950">
                      {device.lastSeenAt ? new Date(device.lastSeenAt).toLocaleString() : 'Never'}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-slate-500">Heartbeats</dt>
                    <dd className="font-medium text-slate-950">{device.heartbeatCount}</dd>
                  </div>
                </dl>
              </article>
            ))
          ) : (
            <div className="rounded-lg border border-dashed border-slate-300 p-6 text-center text-slate-500">
              No kiosk heartbeat yet.
            </div>
          )}
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="flex size-11 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
            <Activity className="size-5" />
          </span>
          <div>
            <h2 className="text-lg font-semibold text-slate-950">Activity Log</h2>
            <p className="text-sm text-slate-500">Recent admin and system changes</p>
          </div>
        </div>

        <div className="mt-5 max-h-[680px] overflow-auto">
          {auditLogs.length > 0 ? (
            auditLogs.map((log) => (
              <article key={log.id} className="border-b border-slate-100 py-3 last:border-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">
                    {log.action}
                  </span>
                  <span className="rounded-full bg-cyan-100 px-2 py-1 text-xs font-semibold text-cyan-800">
                    {log.entityType}
                  </span>
                  <span className="text-xs font-medium text-slate-500">
                    {new Date(log.createdAt).toLocaleString()}
                  </span>
                </div>
                <p className="mt-2 text-sm font-medium text-slate-950">{log.summary}</p>
              </article>
            ))
          ) : (
            <div className="rounded-lg border border-dashed border-slate-300 p-6 text-center text-slate-500">
              No activity recorded yet.
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

function AnalyticsPanel({
  analytics,
  language,
}: {
  analytics: PilotAnalytics
  language: DemoLanguage
}) {
  return (
    <section className="grid gap-5 xl:grid-cols-2">
      <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-950">Pilot analytics</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <MetricCard icon={BarChart3} label="Total events" value={`${analytics.totalEvents}`} />
          <MetricCard icon={ShieldCheck} label="Backend hit rate" value={`${analytics.cacheHitRate}%`} />
          <MetricCard icon={MessageSquareWarning} label="Active unknowns" value={`${analytics.activeUnknownCount}`} />
          <MetricCard
            icon={Languages}
            label="Language split"
            value={`AR ${analytics.languageSplit.ar} / FR ${analytics.languageSplit.fr} / EN ${analytics.languageSplit.en}`}
          />
        </div>

        <h3 className="mt-6 text-sm font-semibold uppercase tracking-[0.12em] text-slate-500">
          Daily summary
        </h3>
        <div className="mt-3 grid gap-2">
          {analytics.dailySummary.length > 0 ? (
            analytics.dailySummary.map((day) => (
              <div key={day.date} className="grid grid-cols-4 gap-2 rounded-lg bg-slate-50 p-3 text-sm">
                <span className="font-semibold text-slate-950">{day.date}</span>
                <span className="text-slate-600">{day.total} total</span>
                <span className="text-emerald-700">{day.cacheHits} hits</span>
                <span className="text-amber-700">{day.unknowns} unknown</span>
              </div>
            ))
          ) : (
            <p className="rounded-lg border border-dashed border-slate-300 p-4 text-center text-sm text-slate-500">
              No traffic yet.
            </p>
          )}
        </div>
      </div>

      <div className="grid gap-5">
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-950">Most asked questions</h2>
          <div className="mt-3 grid gap-2">
            {analytics.topQuestions.length > 0 ? (
              analytics.topQuestions.map((item) => (
                <div key={item.question} className="flex justify-between gap-3 rounded-lg bg-slate-50 p-3 text-sm">
                  <span className="font-medium text-slate-950">{item.question}</span>
                  <span className="font-semibold text-slate-600">x{item.count}</span>
                </div>
              ))
            ) : (
              <p className="rounded-lg border border-dashed border-slate-300 p-4 text-center text-sm text-slate-500">
                No questions recorded yet.
              </p>
            )}
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-950">Top approved answers</h2>
          <div className="mt-3 grid gap-2">
            {analytics.topAnswers.map((item) => (
              <div key={item.answerId} className="flex justify-between gap-3 rounded-lg bg-slate-50 p-3 text-sm">
                <span className="font-medium text-slate-950">{item.question[language]}</span>
                <span className="font-semibold text-slate-600">{item.usageCount}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

function VoicePresetRow({
  catalog,
  language,
  selectedId,
  onChange,
}: {
  catalog: VoiceCatalog
  language: DemoLanguage
  selectedId: string | null
  onChange: (presetId: string) => void
}) {
  const presets = catalog.presets.filter((preset) => preset.language === language)
  const selectedPreset = presets.find((preset) => preset.id === selectedId) ?? presets[0]
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const lastAutoPlayedIdRef = useRef<string | null>(null)

  useEffect(() => {
    const audio = audioRef.current
    const presetId = selectedPreset?.id ?? null

    if (!audio || !presetId) {
      return
    }

    if (lastAutoPlayedIdRef.current === null) {
      // Skip the initial mount so the page doesn't blast audio on load.
      lastAutoPlayedIdRef.current = presetId
      return
    }

    if (lastAutoPlayedIdRef.current === presetId) {
      return
    }

    lastAutoPlayedIdRef.current = presetId
    audio.currentTime = 0
    void audio.play().catch(() => {
      // Browsers may block autoplay; the user can fall back to the controls.
    })
  }, [selectedPreset?.id])

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
            {languageName(language)}
          </p>
          <p className="mt-1 text-sm font-semibold text-slate-950">
            {selectedPreset ? voiceLabel(selectedPreset) : 'No voice available'}
          </p>
        </div>
        {selectedPreset ? (
          <audio
            ref={audioRef}
            className="h-10 max-w-full"
            controls
            preload="auto"
            src={`/api/voice-library/preview/${encodeURIComponent(selectedPreset.id)}`}
          />
        ) : null}
      </div>

      <label className="mt-3 block">
        <span className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
          Preset
        </span>
        <select
          className="mt-2 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-950 outline-none focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100"
          disabled={presets.length === 0}
          value={selectedPreset?.id ?? ''}
          onChange={(event) => onChange(event.target.value)}
        >
          {presets.map((preset) => (
            <option key={preset.id} value={preset.id}>
              {preset.displayName} · {preset.gender} · {preset.engine === 'xtts' ? 'XTTS' : 'macOS'}
            </option>
          ))}
        </select>
      </label>
    </div>
  )
}

type AudioCacheLanguageSummary = {
  language: DemoLanguage
  presetId: string | null
  total: number
  ready: number
  missing: number
}

type AudioCacheStatus = {
  total: number
  ready: number
  missing: number
  files: number
  bytes: number
  staleFiles: number
  staleBytes: number
  staleAfterDays: number
  languages: AudioCacheLanguageSummary[]
}

type AudioCacheJob = {
  id: string
  status: 'running' | 'completed' | 'failed'
  mode: 'missing' | 'regenerate'
  languages: DemoLanguage[]
  total: number
  completed: number
  generated: number
  reused: number
  failed: number
  current?: {
    answerId: string
    language: DemoLanguage
  }
  errors: string[]
  startedAt: string
  finishedAt?: string
}

type AudioCachePayload = {
  cache: AudioCacheStatus
  job?: AudioCacheJob
  cleanup?: {
    deletedFiles: number
    deletedBytes: number
    staleAfterDays: number
  }
}

function formatBytes(bytes: number) {
  if (bytes < 1024) {
    return `${bytes} B`
  }

  if (bytes < 1024 * 1024) {
    return `${Math.round(bytes / 1024)} KB`
  }

  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function FallbackResponsePanel({
  profile,
  savePilotProfile,
}: {
  profile: PilotProfile
  savePilotProfile: (profile: PilotProfile) => Promise<void>
}) {
  const [draft, setDraft] = useState<LocalizedText>(profile.fallbackResponse)
  const [seenSignature, setSeenSignature] = useState(() => JSON.stringify(profile.fallbackResponse))
  const [status, setStatus] = useState(
    'Spoken in the selected xtts voice when a visitor asks an unknown question. Saving regenerates the cached audio for the new wording.'
  )
  const [saving, setSaving] = useState(false)
  const savedSignature = JSON.stringify(profile.fallbackResponse)
  const draftSignature = JSON.stringify(draft)
  const dirty = draftSignature !== seenSignature

  if (seenSignature !== savedSignature) {
    setSeenSignature(savedSignature)
    if (draftSignature === seenSignature) {
      setDraft(profile.fallbackResponse)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    setStatus('Saving fallback wording and re-warming audio in the background…')
    try {
      await savePilotProfile({ ...profile, fallbackResponse: draft })
      setStatus('Fallback wording saved. The kiosk will pick up the new audio on its next poll.')
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Save failed.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex size-11 items-center justify-center rounded-lg bg-amber-50 text-amber-700">
            <MessageSquareWarning className="size-5" />
          </span>
          <div>
            <h2 className="text-lg font-semibold text-slate-950">Fallback response</h2>
            <p className="text-sm text-slate-500">
              What the kiosk says when a visitor asks a question that has no approved answer yet.
            </p>
          </div>
        </div>
        <button
          className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-cyan-700 px-4 text-sm font-semibold text-white hover:bg-cyan-800 disabled:cursor-not-allowed disabled:bg-slate-400"
          disabled={!dirty || saving}
          type="button"
          onClick={() => void handleSave()}
        >
          <Save className="size-4" />
          {saving ? 'Saving…' : 'Save fallback'}
        </button>
      </div>

      <div className="mt-4">
        <LocalizedFieldSet
          label="Localized fallback wording"
          multiline
          value={draft}
          onChange={setDraft}
        />
      </div>

      <p className="mt-3 text-sm font-medium text-slate-600">{status}</p>
    </div>
  )
}

type VoiceWorkerStatus = {
  enabled: boolean
  state: 'stopped' | 'starting' | 'ready' | 'busy' | 'failed' | 'unavailable'
  pid?: number
  model?: string
  device?: string
  sampleRate?: number
  warmupSeconds?: number
  startedAt?: string
  readyAt?: string
  lastError?: string
  pendingRequests: number
  completed: number
  failed: number
}

function VoiceWorkerPanel() {
  const [status, setStatus] = useState<VoiceWorkerStatus>()
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('Persistent xtts worker keeps the ~1.5 GB model in RAM so each new voice clip takes seconds, not a minute.')

  useEffect(() => {
    let cancelled = false
    let consecutiveFailures = 0

    const refresh = async () => {
      try {
        const response = await fetch('/api/voice-worker', { cache: 'no-store' })
        if (!response.ok) {
          consecutiveFailures += 1
          if (consecutiveFailures >= 3 && !cancelled) {
            window.clearInterval(interval)
          }
          return
        }
        consecutiveFailures = 0
        const data = (await response.json()) as VoiceWorkerStatus
        if (!cancelled) {
          setStatus(data)
        }
      } catch {
        consecutiveFailures += 1
        if (consecutiveFailures >= 3 && !cancelled) {
          window.clearInterval(interval)
        }
      }
    }

    void refresh()
    const interval = window.setInterval(refresh, 4000)

    return () => {
      cancelled = true
      window.clearInterval(interval)
    }
  }, [])

  const send = async (action: 'start' | 'stop') => {
    setBusy(true)
    setMessage(action === 'start' ? 'Starting worker (model load can take 30–60s)…' : 'Stopping worker…')
    try {
      const response = await fetch('/api/voice-worker', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      if (!response.ok) {
        setMessage(`Worker ${action} failed.`)
        return
      }
      const data = (await response.json()) as VoiceWorkerStatus
      setStatus(data)
      if (data.state === 'ready') {
        setMessage(`Worker ready on ${data.device ?? 'cpu'}${data.warmupSeconds ? ` (warmed up in ${data.warmupSeconds.toFixed(1)}s)` : ''}.`)
      } else if (data.state === 'stopped') {
        setMessage('Worker stopped. Next generation will fall back to a one-shot Python spawn.')
      } else if (data.state === 'failed') {
        setMessage(data.lastError ?? 'Worker failed to start.')
      } else if (data.state === 'unavailable') {
        setMessage('VOICE_WORKER_COMMAND env var is not configured. Falling back to legacy VOICE_COMMAND on every generation.')
      } else {
        setMessage(`Worker is ${data.state}.`)
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Worker command failed.')
    } finally {
      setBusy(false)
    }
  }

  const isReady = status?.state === 'ready'
  const isBusy = status?.state === 'busy'
  const isStarting = status?.state === 'starting'
  const isStopped = status?.state === 'stopped'
  const isFailed = status?.state === 'failed'
  const isUnavailable = status?.state === 'unavailable' || (status && !status.enabled)
  const pillTone = isReady || isBusy
    ? 'bg-emerald-100 text-emerald-800'
    : isStarting
      ? 'bg-amber-100 text-amber-800'
      : isFailed
        ? 'bg-rose-100 text-rose-800'
        : isUnavailable
          ? 'bg-slate-200 text-slate-700'
          : 'bg-slate-100 text-slate-700'
  const pillLabel = isUnavailable
    ? 'Not configured'
    : isStarting
      ? 'Starting'
      : isReady
        ? 'Ready'
        : isBusy
          ? `Busy · ${status?.pendingRequests ?? 0} in flight`
          : isFailed
            ? 'Failed'
            : 'Stopped'

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex size-11 items-center justify-center rounded-lg bg-indigo-50 text-indigo-700">
            <Cpu className="size-5" />
          </span>
          <div>
            <h2 className="text-lg font-semibold text-slate-950">Persistent xtts worker</h2>
            <p className="text-sm text-slate-500">
              Keeps the Coqui XTTS model loaded in RAM so each generation skips Python startup.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] ${pillTone}`}>
            {pillLabel}
          </span>
          <button
            className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-emerald-700 px-4 text-sm font-semibold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-400"
            disabled={busy || isReady || isBusy || isStarting || isUnavailable}
            type="button"
            onClick={() => void send('start')}
          >
            <Play className="size-4" />
            Start worker
          </button>
          <button
            className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-rose-200 px-3 text-sm font-semibold text-rose-700 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={busy || isStopped || isUnavailable || (!isReady && !isBusy && !isStarting && !isFailed)}
            type="button"
            onClick={() => void send('stop')}
          >
            <Square className="size-4" />
            Stop worker
          </button>
        </div>
      </div>

      <div className="mt-4 grid gap-2 text-sm text-slate-700 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg bg-slate-50 p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">PID</p>
          <p className="mt-1 font-mono text-sm">{status?.pid ?? '—'}</p>
        </div>
        <div className="rounded-lg bg-slate-50 p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Device</p>
          <p className="mt-1 font-mono text-sm">{status?.device ?? '—'}</p>
        </div>
        <div className="rounded-lg bg-slate-50 p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Warm-up</p>
          <p className="mt-1 font-mono text-sm">
            {status?.warmupSeconds != null ? `${status.warmupSeconds.toFixed(1)}s` : '—'}
          </p>
        </div>
        <div className="rounded-lg bg-slate-50 p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Served</p>
          <p className="mt-1 font-mono text-sm">
            {status ? `${status.completed} ok · ${status.failed} fail` : '—'}
          </p>
        </div>
      </div>

      <p className="mt-3 text-sm font-medium text-slate-600">{message}</p>
      {status?.lastError && !isReady && !isBusy ? (
        <div className="mt-3 rounded-lg bg-rose-50 p-3 text-sm font-medium text-rose-800">
          {status.lastError}
        </div>
      ) : null}
    </div>
  )
}

function AudioCachePanel() {
  const [payload, setPayload] = useState<AudioCachePayload>()
  const [status, setStatus] = useState('Audio cache status is loading.')
  const job = payload?.job
  const cache = payload?.cache
  const jobRunning = job?.status === 'running'
  // Use the on-disk cache count rather than the warm-job iteration tally — the
  // latter can outpace reality when voice settings change mid-job (reused targets
  // for stale presets get counted even though no file lands for the new preset).
  const readyCount = cache?.ready ?? 0
  const totalCount = cache?.total ?? job?.total ?? 0
  const progress = totalCount > 0 ? Math.round((readyCount / totalCount) * 100) : 0

  const loadStatus = useCallback(async () => {
    const response = await fetch('/api/audio-cache', { cache: 'no-store' })

    if (!response.ok) {
      throw new Error('Audio cache status could not be loaded.')
    }

    const nextPayload = (await response.json()) as AudioCachePayload
    setPayload(nextPayload)

    if (nextPayload.job?.status === 'running') {
      setStatus('Audio generation is running in the background.')
    } else if (nextPayload.cache.missing === 0 && nextPayload.cache.total > 0) {
      setStatus('All approved answers have cached audio for the selected voices.')
    } else {
      setStatus(`${nextPayload.cache.missing} approved-answer audio files still need generation.`)
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    let consecutiveFailures = 0

    const refresh = async () => {
      try {
        await loadStatus()
        consecutiveFailures = 0
      } catch (error) {
        consecutiveFailures += 1
        if (!cancelled) {
          setStatus(error instanceof Error ? error.message : 'Audio cache status could not be loaded.')
        }
        if (consecutiveFailures >= 3 && !cancelled) {
          // Server is unreachable; freeze polling to avoid an ERR_CONNECTION_REFUSED storm.
          window.clearInterval(interval)
        }
      }
    }

    void refresh()
    const interval = window.setInterval(() => {
      if (!cancelled) {
        void refresh()
      }
    }, jobRunning ? 2500 : 7000)

    return () => {
      cancelled = true
      window.clearInterval(interval)
    }
  }, [jobRunning, loadStatus])

  const startJob = async (mode: AudioCacheJob['mode'], languages?: DemoLanguage[]) => {
    setStatus(mode === 'regenerate' ? 'Regeneration job queued.' : 'Missing-audio job queued.')
    const response = await fetch('/api/audio-cache', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode, languages }),
    })

    if (!response.ok) {
      setStatus('Audio generation could not be started.')
      return
    }

    setPayload((await response.json()) as AudioCachePayload)
  }

  const cleanup = async () => {
    setStatus('Cleaning unused voice audio older than 2 days.')
    const response = await fetch('/api/audio-cache?staleAfterDays=2', { method: 'DELETE' })

    if (!response.ok) {
      setStatus('Audio cleanup failed.')
      return
    }

    const nextPayload = (await response.json()) as AudioCachePayload
    setPayload(nextPayload)
    setStatus(
      `Deleted ${nextPayload.cleanup?.deletedFiles ?? 0} stale files (${formatBytes(nextPayload.cleanup?.deletedBytes ?? 0)}).`
    )
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex size-11 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
            <Activity className="size-5" />
          </span>
          <div>
            <h2 className="text-lg font-semibold text-slate-950">Approved-answer audio cache</h2>
            <p className="text-sm text-slate-500">
              {cache ? `${cache.ready}/${cache.total} ready · ${formatBytes(cache.bytes)} stored` : 'Checking cache'}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-cyan-700 px-4 text-sm font-semibold text-white hover:bg-cyan-800 disabled:cursor-not-allowed disabled:bg-slate-400"
            disabled={jobRunning || !cache || cache.missing === 0}
            type="button"
            onClick={() => void startJob('missing')}
          >
            <Volume2 className="size-4" />
            Generate missing
          </button>
          <button
            className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-200 px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={jobRunning || !cache || cache.total === 0}
            type="button"
            onClick={() => void startJob('regenerate')}
          >
            <RotateCcw className="size-4" />
            Regenerate all
          </button>
          <button
            className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-rose-200 px-3 text-sm font-semibold text-rose-700 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={jobRunning || !cache || cache.staleFiles === 0}
            type="button"
            onClick={() => void cleanup()}
          >
            <Trash2 className="size-4" />
            Purge old voices
          </button>
        </div>
      </div>

      {job ? (
        <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-semibold text-slate-800">
              {job.status === 'running' ? 'Generating audio' : job.status === 'completed' ? 'Last job completed' : 'Last job had errors'}
            </p>
            <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-slate-600">
              {readyCount}/{totalCount} · {progress}%
            </span>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200">
            <div className="h-full rounded-full bg-cyan-600" style={{ width: `${progress}%` }} />
          </div>
          <p className="mt-3 text-sm text-slate-600">
            Generated {job.generated}, reused {job.reused}, failed {job.failed}
            {job.current ? ` · now ${job.current.answerId} (${job.current.language.toUpperCase()})` : ''}
          </p>
          {job.errors.length > 0 ? (
            <div className="mt-3 rounded-lg bg-rose-50 p-3 text-sm font-medium text-rose-800">
              {job.errors[0]}
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="mt-4 grid gap-3 lg:grid-cols-3">
        {cache?.languages.map((item) => (
          <article key={item.language} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold text-slate-950">{languageName(item.language)}</p>
              <span className="rounded-full bg-white px-2 py-1 text-xs font-semibold text-slate-600">
                {item.ready}/{item.total}
              </span>
            </div>
            <p className="mt-2 truncate text-xs font-medium text-slate-500">
              {item.presetId ?? 'No selected voice'}
            </p>
            <button
              className="mt-3 inline-flex min-h-9 w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={jobRunning || item.total === 0}
              type="button"
              onClick={() => void startJob('regenerate', [item.language])}
            >
              <RotateCcw className="size-3" />
              Regenerate {item.language.toUpperCase()}
            </button>
          </article>
        ))}
      </div>

      <p className="mt-3 text-sm font-medium text-slate-600">
        {status}
        {cache && cache.staleFiles > 0
          ? ` ${cache.staleFiles} unused voice files are older than ${cache.staleAfterDays} days.`
          : ''}
      </p>
    </div>
  )
}

function WarmingProgress({
  cache,
  job,
}: {
  cache?: AudioCacheStatus
  job?: AudioCacheJob
}) {
  if (!cache && !job) {
    return (
      <div className="mt-4 rounded-lg border border-cyan-200 bg-cyan-50 p-3 text-sm text-cyan-800">
        Starting audio generation…
      </div>
    )
  }

  // Prefer the on-disk count for the headline number — the warm job's `completed`
  // counter is just an iteration tally and can diverge from reality when voice
  // settings change mid-job or stale files get reused.
  const total = cache?.total ?? job?.total ?? 0
  const ready = cache?.ready ?? 0
  const percent = total > 0 ? Math.round((ready / total) * 100) : 0
  const isRunning = job?.status === 'running'
  const isFinished = !isRunning && cache && cache.missing === 0 && cache.total > 0

  const headline = isRunning
    ? 'Preparing kiosk audio in the selected voices…'
    : isFinished
      ? 'Kiosk audio ready in the selected voices.'
      : job?.status === 'failed'
        ? 'Some answers could not be generated.'
        : `${ready}/${total} ready`

  return (
    <div
      className={`mt-4 rounded-lg border p-3 ${
        isFinished
          ? 'border-emerald-200 bg-emerald-50'
          : job?.status === 'failed'
            ? 'border-rose-200 bg-rose-50'
            : 'border-cyan-200 bg-cyan-50'
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className={`text-sm font-semibold ${
          isFinished ? 'text-emerald-800' : job?.status === 'failed' ? 'text-rose-800' : 'text-cyan-900'
        }`}>
          {headline}
        </p>
        <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-slate-600">
          {ready}/{total} · {percent}%
        </span>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-white">
        <div
          className={`h-full rounded-full transition-[width] duration-500 ${
            isFinished ? 'bg-emerald-600' : job?.status === 'failed' ? 'bg-rose-600' : 'bg-cyan-600'
          }`}
          style={{ width: `${percent}%` }}
        />
      </div>
      {job?.current ? (
        <p className="mt-3 text-sm text-slate-700">
          Now generating <span className="font-semibold">{job.current.answerId}</span>{' '}
          ({job.current.language.toUpperCase()})
        </p>
      ) : null}
      {isFinished ? (
        <p className="mt-3 text-sm text-emerald-800">
          You can open the kiosk now — answers will play instantly.
        </p>
      ) : isRunning ? (
        <p className="mt-3 text-sm text-cyan-900">
          You can open the kiosk and start testing already; pending answers will say “Preparing voice” until each finishes.
        </p>
      ) : null}
    </div>
  )
}

function VoiceSettingsPanel({
  saveVoiceSettings,
  voiceSettings,
}: {
  saveVoiceSettings: (settings: VoiceSettings) => Promise<void>
  voiceSettings: VoiceSettings
}) {
  const [catalog, setCatalog] = useState<VoiceCatalog>({ generatedAt: '', presets: [] })
  const [draft, setDraft] = useState<VoiceSettings>(voiceSettings)
  const [seenVoiceSettingsSignature, setSeenVoiceSettingsSignature] = useState(() =>
    voiceSettingsSignature(voiceSettings)
  )
  const [status, setStatus] = useState('Choose the kiosk voice per language.')
  const [warmJob, setWarmJob] = useState<AudioCacheJob>()
  const [warmCache, setWarmCache] = useState<AudioCacheStatus>()
  const [showWarmProgress, setShowWarmProgress] = useState(false)
  const draftSignature = voiceSettingsSignature(draft)
  const savedSignature = voiceSettingsSignature(voiceSettings)
  const hasUnsavedChanges = draftSignature !== seenVoiceSettingsSignature
  const warmJobRunning = warmJob?.status === 'running'

  if (seenVoiceSettingsSignature !== savedSignature) {
    const wasDraftClean = draftSignature === seenVoiceSettingsSignature
    setSeenVoiceSettingsSignature(savedSignature)
    if (wasDraftClean) {
      setDraft(voiceSettings)
    }
  }

  useEffect(() => {
    let cancelled = false

    void fetch('/api/voice-library', { cache: 'no-store' })
      .then((response) => response.json())
      .then((data: VoiceCatalog) => {
        if (!cancelled) {
          setCatalog(data)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setStatus('Voice catalog could not be loaded.')
        }
      })

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!showWarmProgress) {
      return
    }

    // Stop polling once the warm has settled — keep the last snapshot on screen
    // but don't keep hammering the server.
    if (warmJob && warmJob.status !== 'running') {
      return
    }

    let cancelled = false
    let consecutiveFailures = 0

    const fetchStatus = async () => {
      try {
        const response = await fetch('/api/audio-cache', { cache: 'no-store' })
        if (!response.ok) {
          consecutiveFailures += 1
          return
        }
        consecutiveFailures = 0
        const data = (await response.json()) as AudioCachePayload
        if (cancelled) {
          return
        }
        setWarmJob(data.job)
        setWarmCache(data.cache)
      } catch {
        consecutiveFailures += 1
        if (consecutiveFailures >= 3 && !cancelled) {
          // Server is unreachable; freeze the UI on the last known state instead
          // of flooding the console with ERR_CONNECTION_REFUSED.
          window.clearInterval(interval)
        }
      }
    }

    void fetchStatus()
    const interval = window.setInterval(fetchStatus, warmJobRunning ? 1500 : 5000)

    return () => {
      cancelled = true
      window.clearInterval(interval)
    }
  }, [showWarmProgress, warmJob, warmJobRunning])

  const updateLanguage = (language: DemoLanguage, presetId: string) => {
    setDraft((current) => ({
      ...current,
      [language]: presetId,
    }))
    setStatus('Unsaved voice changes. Click Save voices to apply them to the kiosk.')
  }

  const handleSave = async () => {
    await saveVoiceSettings(draft)
    setSeenVoiceSettingsSignature(voiceSettingsSignature(draft))
    setShowWarmProgress(true)
    setStatus('Voice settings saved. Warming approved-answer audio in the selected voices.')
  }

  const selectedCount = demoLanguages.filter((item) => draft[item.id]).length

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex size-11 items-center justify-center rounded-lg bg-cyan-50 text-cyan-700">
            <Volume2 className="size-5" />
          </span>
          <div>
            <h2 className="text-lg font-semibold text-slate-950">Voice library</h2>
            <p className="text-sm text-slate-500">
              {catalog.presets.length} imported presets · {selectedCount}/3 active languages
            </p>
          </div>
        </div>
        <button
          className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-cyan-700 px-4 text-sm font-semibold text-white hover:bg-cyan-800 disabled:cursor-not-allowed disabled:bg-slate-400"
          disabled={catalog.presets.length === 0 || !hasUnsavedChanges}
          type="button"
          onClick={() => void handleSave()}
        >
          <Save className="size-4" />
          Save voices
        </button>
      </div>

      <div className="mt-4 grid gap-3">
        {demoLanguages.map((item) => (
          <VoicePresetRow
            key={item.id}
            catalog={catalog}
            language={item.id}
            selectedId={draft[item.id] ?? defaultVoiceSettings[item.id]}
            onChange={(presetId) => updateLanguage(item.id, presetId)}
          />
        ))}
      </div>

      {showWarmProgress ? (
        <WarmingProgress cache={warmCache} job={warmJob} />
      ) : null}

      <p className="mt-3 text-sm font-medium text-slate-600">{status}</p>
    </div>
  )
}

function SettingsPanel({
  profile,
  saveVoiceSettings,
  savePilotProfile,
  voiceSettings,
}: {
  profile: PilotProfile
  saveVoiceSettings: (settings: VoiceSettings) => Promise<void>
  savePilotProfile: (profile: PilotProfile) => Promise<void>
  voiceSettings: VoiceSettings
}) {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [status, setStatus] = useState('Session expires after 12 hours.')
  const [session, setSession] = useState<{ expiresAt?: string }>({})

  useEffect(() => {
    // Session info is fetched from the auth endpoint for display only.
    void fetch('/api/auth/session')
      .then((response) => response.json())
      .then((data: { expiresAt?: string }) => setSession(data))
      .catch(() => undefined)
  }, [])

  const handlePasswordChange = async () => {
    if (password.length < 8) {
      setStatus('Password must be at least 8 characters.')
      return
    }

    if (password !== confirmPassword) {
      setStatus('Passwords do not match.')
      return
    }

    const response = await fetch('/api/admin-settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    })

    if (!response.ok) {
      setStatus('Password update failed.')
      return
    }

    setPassword('')
    setConfirmPassword('')
    setStatus('Password updated. Current session remains active.')
  }

  return (
    <section className="grid gap-5">
      <VoiceSettingsPanel saveVoiceSettings={saveVoiceSettings} voiceSettings={voiceSettings} />
      <FallbackResponsePanel profile={profile} savePilotProfile={savePilotProfile} />
      <VoiceWorkerPanel />
      <AudioCachePanel />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="flex size-11 items-center justify-center rounded-lg bg-cyan-50 text-cyan-700">
              <KeyRound className="size-5" />
            </span>
            <div>
              <h2 className="text-lg font-semibold text-slate-950">Admin password</h2>
              <p className="text-sm text-slate-500">Stored locally in SQLite with PBKDF2 hashing</p>
            </div>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <Field
              label="New password"
              type="password"
              value={password}
              onChange={setPassword}
            />
            <Field
              label="Confirm password"
              type="password"
              value={confirmPassword}
              onChange={setConfirmPassword}
            />
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-cyan-700 px-4 text-sm font-semibold text-white hover:bg-cyan-800"
              type="button"
              onClick={() => void handlePasswordChange()}
            >
              <Save className="size-4" />
              Change password
            </button>
            <span className="text-sm font-medium text-slate-600">{status}</span>
          </div>
        </div>

        <aside className="rounded-lg border border-amber-200 bg-amber-50 p-5 text-amber-950">
          <h2 className="text-lg font-semibold">Demo/local mode</h2>
          <p className="mt-2 text-sm leading-relaxed">
            This pilot uses SQLite, local admin sessions, local XTTS audio generation, and browser TTS fallback.
            Move secrets and database storage before any public deployment.
          </p>
          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between gap-3 border-b border-amber-200 pb-3">
              <dt>Session expiry</dt>
              <dd className="font-semibold">
                {session.expiresAt ? new Date(session.expiresAt).toLocaleString() : '12 hours'}
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt>Auth scope</dt>
              <dd className="font-semibold">Admin only</dd>
            </div>
          </dl>
        </aside>
      </div>
    </section>
  )
}

export function AdminPrototype() {
  const {
    actions,
    analytics,
    auditLogs,
    answers,
    approveUnknown,
    createAnswer,
    deleteAnswer,
    devices,
    duplicateAnswer,
    exportPilotJson,
    importPilotJson,
    markUnknown,
    metrics,
    profile,
    resetPrototype,
    applyPilotScenario,
    saveAnswer,
    savePilotProfile,
    saveVoiceSettings,
    syncStatus,
    toggleAnswerPublished,
    unknownQuestions,
    voiceSettings,
  } = usePrototypeStore({ admin: true })
  const [language, setLanguage] = useState<DemoLanguage>(profile.defaultLanguage)
  const [activeTab, setActiveTab] = useState<AdminTab>('setup')
  const [selectedAnswerId, setSelectedAnswerId] = useState<string | undefined>(answers[0]?.id)

  const selectedAnswer = useMemo(
    () => answers.find((answer) => answer.id === selectedAnswerId) ?? answers[0],
    [answers, selectedAnswerId]
  )

  const handleCreateAnswer = () => {
    void (async () => {
      const answer = await createAnswer()
      setSelectedAnswerId(answer.id)
      setActiveTab('answers')
    })()
  }

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    window.location.href = '/admin/login'
  }

  return (
    <main className="min-h-screen bg-[#f5f7fb] p-4 text-slate-950 md:p-6">
      <div className="mx-auto flex max-w-7xl flex-col gap-5">
        <header className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-500">
                Digital Receptionist Admin
              </p>
              <h1 className="mt-1 text-3xl font-semibold text-slate-950">
                {profile.tenantName[language]} Admin
              </h1>
              <p className="mt-2 text-base font-medium text-slate-600">
                {profile.locationName[language]} · {profile.currentWait[language]}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <span className="rounded-full bg-emerald-100 px-3 py-1 text-sm font-semibold text-emerald-800">
                  Lite First
                </span>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-600">
                  AR / FR / EN
                </span>
                <span className="rounded-full bg-cyan-100 px-3 py-1 text-sm font-semibold text-cyan-800">
                  Local demo
                </span>
                <span
                  className={`rounded-full px-3 py-1 text-sm font-semibold ${
                    syncStatus === 'ready'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-amber-100 text-amber-900'
                  }`}
                >
                  {syncStatus === 'ready' ? 'Backend synced' : 'Sync issue'}
                </span>
              </div>
            </div>
            <div className="flex flex-wrap items-start justify-end gap-2">
              <LanguageSegment language={language} setLanguage={setLanguage} />
              <Link
                className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-200 px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                href="/kiosk"
              >
                <ArrowUpRight className="size-4" />
                Open kiosk
              </Link>
              <button
                className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-200 px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                type="button"
                onClick={() => void resetPrototype()}
              >
                <RotateCcw className="size-4" />
                Reset
              </button>
              <button
                className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-200 px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                type="button"
                onClick={() => void handleLogout()}
              >
                <X className="size-4" />
                Logout
              </button>
            </div>
          </div>
        </header>

        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <MetricCard icon={BarChart3} label="Session questions" value={`${metrics.sessionQuestions}`} />
          <MetricCard icon={ShieldCheck} label="Cache hit rate" value={`${analytics.cacheHitRate}%`} />
          <MetricCard
            icon={MessageSquareWarning}
            label="Unknown queue"
            value={`${metrics.unknownCount}`}
          />
          <MetricCard icon={Languages} label="Top language" value={metrics.topLanguage.toUpperCase()} />
          <MetricCard
            icon={MonitorCheck}
            label="Online kiosks"
            value={`${devices.filter((device) => device.status === 'online').length}`}
          />
        </section>

        <AdminTabs activeTab={activeTab} setActiveTab={setActiveTab} />

        {activeTab === 'setup' ? (
          <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
            <PilotSetupPanel
              key={`${profile.tenantName.fr}-${profile.locationName.fr}-${profile.counters.length}`}
              profile={profile}
              applyPilotScenario={applyPilotScenario}
              savePilotProfile={savePilotProfile}
            />
            <BudgetPolicy />
          </section>
        ) : null}

        {activeTab === 'answers' ? (
          <section className="grid gap-5 lg:grid-cols-[360px_minmax(0,1fr)]">
            <AnswerList
              answers={answers}
              language={language}
              selectedId={selectedAnswer?.id}
              setSelectedId={setSelectedAnswerId}
              onCreate={handleCreateAnswer}
            />
            <AnswerEditor
              key={selectedAnswer?.id ?? 'empty-answer'}
              actions={actions}
              answer={selectedAnswer}
              deleteAnswer={async (answerId) => {
                await deleteAnswer(answerId)
                setSelectedAnswerId(answers.find((answer) => answer.id !== answerId)?.id)
              }}
              duplicateAnswer={async (answerId) => {
                const answer = await duplicateAnswer(answerId)
                if (answer) {
                  setSelectedAnswerId(answer.id)
                }
                return answer
              }}
              language={language}
              saveAnswer={saveAnswer}
              toggleAnswerPublished={toggleAnswerPublished}
            />
          </section>
        ) : null}

        {activeTab === 'review' ? (
          <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
            <ReviewQueue
              actions={actions}
              approveUnknown={approveUnknown}
              candidates={unknownQuestions}
              language={language}
              markUnknown={markUnknown}
            />
            <BudgetPolicy />
          </section>
        ) : null}

        {activeTab === 'operations' ? (
          <OperationsPanel auditLogs={auditLogs} devices={devices} />
        ) : null}

        {activeTab === 'analytics' ? (
          <AnalyticsPanel analytics={analytics} language={language} />
        ) : null}

        {activeTab === 'settings' ? (
          <SettingsPanel
            profile={profile}
            saveVoiceSettings={saveVoiceSettings}
            savePilotProfile={savePilotProfile}
            voiceSettings={voiceSettings}
          />
        ) : null}

        {activeTab === 'import' ? (
          <ImportExportPanel exportPilotJson={exportPilotJson} importPilotJson={importPilotJson} />
        ) : null}
      </div>
    </main>
  )
}
