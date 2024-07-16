#!/usr/bin/env -S deno run -A

import 'jsr:@std/dotenv/load'
import {Bot} from 'npm:grammy'

const getEnv = (key: string): string => {
  if (Deno.env.has(key)) return Deno.env.get(key)!
  throw new Error(`"${key}" environment variable must be set`)
}

const bot = new Bot(getEnv('BOT_TOKEN')!)

if (Deno.args.find((arg) => ['-s', '--set'].includes(arg))) {
  const status = bot.api.setWebhook(getEnv('WEBHOOK_URI')!, {
    secret_token: getEnv('WEBHOOK_SECRET'),
  })
  console.log('setWebhook:', status)
} else if (Deno.args.find((arg) => ['-r', '--remove'].includes(arg))) {
  console.log('deleteWebhook:', await bot.api.deleteWebhook())
} else {
  console.log(await bot.api.getWebhookInfo())
}
