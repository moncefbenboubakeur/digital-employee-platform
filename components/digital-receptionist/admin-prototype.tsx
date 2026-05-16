'use client'

import Link from 'next/link'
import { ChangeEvent, useEffect, useMemo, useRef, useState } from 'react'
import {
  Activity,
  ArrowUpRight,
  BarChart3,
  Check,
  Copy,
  Download,
  FileJson,
  KeyRound,
  Languages,
  MessageSquarePlus,
  MessageSquareWarning,
  MonitorCheck,
  Plus,
  RotateCcw,
  Save,
  Settings2,
  ShieldCheck,
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

function PilotSetupPanel({
  profile,
  savePilotProfile,
}: {
  profile: PilotProfile
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
            className="h-10 max-w-full"
            controls
            preload="none"
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
  const draftSignature = voiceSettingsSignature(draft)
  const savedSignature = voiceSettingsSignature(voiceSettings)
  const hasUnsavedChanges = draftSignature !== seenVoiceSettingsSignature

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
    setStatus('Voice settings saved. The next kiosk answer will generate or reuse audio for the selected preset.')
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

      <p className="mt-3 text-sm font-medium text-slate-600">{status}</p>
    </div>
  )
}

function SettingsPanel({
  saveVoiceSettings,
  voiceSettings,
}: {
  saveVoiceSettings: (settings: VoiceSettings) => Promise<void>
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
          <SettingsPanel saveVoiceSettings={saveVoiceSettings} voiceSettings={voiceSettings} />
        ) : null}

        {activeTab === 'import' ? (
          <ImportExportPanel exportPilotJson={exportPilotJson} importPilotJson={importPilotJson} />
        ) : null}
      </div>
    </main>
  )
}
