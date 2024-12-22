#!/usr/bin/env -S deno run -A

import {promptSelect} from 'https://raw.githubusercontent.com/MAKS11060/deno-libs/refs/heads/main/cli/prompt.ts'
import 'jsr:@std/dotenv/load'
import {Bot} from 'npm:grammy'

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
    const host = promptSelect('Webhook target', ['local', 'remote'])
    const target: Record<typeof host, string> = {
      local: getEnv('WEBHOOK_URI_LOCAL'),
      remote: getEnv('WEBHOOK_URI'),
    }
    const status = await bot.api.setWebhook(target[host], {
      secret_token: getEnv('WEBHOOK_SECRET'),
    })
    console.log(`%cset webhook: ${status} | ${target[host]}`, 'color: green')
  }

  if (mode === 'Del webhook') {
    console.log('%cdel webhook:', 'color: red', await bot.api.deleteWebhook())
  }
}

// if (Deno.args.find((arg) => ['-s', '--set'].includes(arg))) {
//   const status = await bot.api.setWebhook(target[host], {
//     secret_token: getEnv('WEBHOOK_SECRET'),
//   })
//   console.log(`setWebhook: ${status} | ${getEnv('WEBHOOK_URI')}`,)
// } else if (Deno.args.find((arg) => ['-r', '--remove'].includes(arg))) {
//   console.log('deleteWebhook:', await bot.api.deleteWebhook())
// } else {
//   console.log(await bot.api.getWebhookInfo())
// }
