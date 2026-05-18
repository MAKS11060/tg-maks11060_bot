#!/usr/bin/env -S deno run -A --env-file

import {promptSelect} from '@std/cli/unstable-prompt-select'
import {Api} from 'grammy'

const getEnv = (key: string): string => {
  if (Deno.env.has(key)) return Deno.env.get(key)!
  throw new Error(`"${key}" environment variable must be set`)
}

const api = new Api(getEnv('BOT_TOKEN')!)

while (true) {
  const mode = promptSelect('?', ['Info', 'Set webhook', 'Del webhook', 'exit'])
  if (mode === 'exit') {
    Deno.exit(0)
  }

  if (mode === 'Info') {
    const me = await api.getMe()
    console.log(`${me.first_name} ${me.username} ID:${me.id}`, await api.getWebhookInfo())
  }

  if (mode === 'Set webhook') {
    const hosts = [`local  ${getEnv('WEBHOOK_URI_LOCAL')}`, `remote ${getEnv('WEBHOOK_URI')}`] as const
    const host = promptSelect('Webhook target', hosts as unknown as string[]) as typeof hosts[number]
    const target: Record<'local' | 'remote', string> = {
      local: getEnv('WEBHOOK_URI_LOCAL'),
      remote: getEnv('WEBHOOK_URI'),
    }
    if (!host) throw new Error('Invalid host target')
    const t = target[host.split(' ')?.[0]! as 'local' | 'remote']
    const status = await api.setWebhook(t, {
      secret_token: getEnv('WEBHOOK_SECRET'),
    })
    console.log(`%cset webhook: ${status} | ${t}`, 'color: green')
  }

  if (mode === 'Del webhook') {
    console.log('%cdel webhook:', 'color: red', await api.deleteWebhook())
  }
}
