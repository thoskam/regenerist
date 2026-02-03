'use client'

import { useEffect, useState } from 'react'
import { MessageSquare, Check, AlertCircle, ExternalLink } from 'lucide-react'

interface DiscordSettingsProps {
  campaignId: string
}

type MessageState = { type: 'success' | 'error'; text: string } | null

export default function DiscordSettings({ campaignId }: DiscordSettingsProps) {
  const [webhookUrl, setWebhookUrl] = useState('')
  const [rollsEnabled, setRollsEnabled] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isTesting, setIsTesting] = useState(false)
  const [message, setMessage] = useState<MessageState>(null)

  useEffect(() => {
    fetch(`/api/campaigns/${campaignId}/discord`)
      .then((res) => res.json())
      .then((data) => {
        setWebhookUrl(data.discordWebhookUrl || '')
        setRollsEnabled(Boolean(data.discordRollsEnabled))
      })
  }, [campaignId])

  const handleSave = async () => {
    setIsSaving(true)
    setMessage(null)

    const res = await fetch(`/api/campaigns/${campaignId}/discord`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        discordWebhookUrl: webhookUrl || null,
        discordRollsEnabled: rollsEnabled,
      }),
    })

    if (res.ok) {
      setMessage({ type: 'success', text: 'Settings saved!' })
    } else {
      const data = await res.json().catch(() => ({}))
      setMessage({ type: 'error', text: data.error || 'Failed to save' })
    }

    setIsSaving(false)
  }

  const handleTest = async () => {
    setIsTesting(true)
    setMessage(null)

    const res = await fetch(`/api/campaigns/${campaignId}/discord`, {
      method: 'POST',
    })

    if (res.ok) {
      setMessage({ type: 'success', text: 'Test message sent! Check your Discord channel.' })
    } else {
      setMessage({ type: 'error', text: 'Test failed. Check your webhook URL.' })
    }

    setIsTesting(false)
  }

  return (
    <div className="p-4 bg-slate-800 rounded-lg border border-slate-700">
      <h3 className="font-semibold flex items-center gap-2 mb-4">
        <MessageSquare className="w-5 h-5 text-indigo-400" />
        Discord Integration
      </h3>

      <div className="space-y-4">
        <div>
          <label className="block text-sm text-slate-400 mb-1">Webhook URL</label>
          <input
            type="url"
            value={webhookUrl}
            onChange={(event) => setWebhookUrl(event.target.value)}
            placeholder="https://discord.com/api/webhooks/..."
            className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg focus:border-indigo-500 focus:outline-none"
          />
          <a
            href="https://support.discord.com/hc/en-us/articles/228383668-Intro-to-Webhooks"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 mt-1"
          >
            How to create a webhook <ExternalLink className="w-3 h-3" />
          </a>
        </div>

        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={rollsEnabled}
            onChange={(event) => setRollsEnabled(event.target.checked)}
            className="w-5 h-5 rounded border-slate-600 bg-slate-900 text-indigo-500 focus:ring-indigo-500"
          />
          <span>Send dice rolls to Discord</span>
        </label>

        <div className="flex gap-2">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg font-medium disabled:opacity-50"
            type="button"
          >
            {isSaving ? 'Saving...' : 'Save Settings'}
          </button>
          {webhookUrl && (
            <button
              onClick={handleTest}
              disabled={isTesting}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg disabled:opacity-50"
              type="button"
            >
              {isTesting ? 'Testing...' : 'Test Webhook'}
            </button>
          )}
        </div>

        {message && (
          <div
            className={`flex items-center gap-2 p-3 rounded-lg ${
              message.type === 'success'
                ? 'bg-green-900/30 text-green-400'
                : 'bg-red-900/30 text-red-400'
            }`}
          >
            {message.type === 'success' ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            {message.text}
          </div>
        )}
      </div>
    </div>
  )
}
