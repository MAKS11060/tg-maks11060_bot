#!/usr/bin/env -S deno run -A --env-file

import {Bot} from 'grammy'
import {promptSelect} from 'jsr:@std/cli/unstable-prompt-select'

const getEnv = (key: string): string => {
  if (Deno.env.has(key)) return Deno.env.get(key)!
  throw new Error(`"${key}" environment variable must be set`)
}

const bot = new Bot(getEnv('BOT_TOKEN')!)

while (true) {
  const mode = promptSelect('?', ['Info', 'Set webhook', 'Del webhook', 'exit'])
  if (mode === 'exit') {
    Deno.exit(0)
  }

  if (mode === 'Info') {
    console.log(await bot.api.getWebhookInfo())
  }

  if (mode === 'Set webhook') {
    const hosts = ['local', 'remote'] as const
    const host = promptSelect('Webhook target', hosts as unknown as string[]) as typeof hosts[number]
    const target: Record<typeof host, string> = {
      local: getEnv('WEBHOOK_URI_LOCAL'),
      remote: getEnv('WEBHOOK_URI'),
    }
    if (!host) throw new Error('Invalid host target')
    const status = await bot.api.setWebhook(target[host], {
      secret_token: getEnv('WEBHOOK_SECRET'),
    })
    console.log(`%cset webhook: ${status} | ${target[host]}`, 'color: green')
  }

  if (mode === 'Del webhook') {
    console.log('%cdel webhook:', 'color: red', await bot.api.deleteWebhook())
  }
}
