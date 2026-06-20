#!/usr/bin/env -S deno run -A --env-file --watch-hmr

import {serve} from '#serve'
import {Bot, GrammyError, webhookCallback} from 'grammy'
import {app} from './src/grammy/app.ts'

const bot = new Bot(process.env.BOT_TOKEN!, {botInfo: JSON.parse(process.env.BOT_INFO!)})

bot.use(app)

const grammyHandler = webhookCallback(bot, 'std/http', {
  secretToken: process.env.WEBHOOK_SECRET,
})

serve(async (request) => {
  const uri = new URL(request.url)
  console.log(uri.toString())

  // Grammy route
  if (request.method === 'POST' && uri.pathname === '/tg/webhook') {
    try {
      return await grammyHandler(request)
    } catch (e) {
      if (e instanceof GrammyError) {
        console.error(e.name, e.description, e.message, e.parameters)
        console.error(e.payload)
      } else if (e instanceof Error) {
        console.error('%cERR', 'color: red', e)
      }

      return Response.json({ok: false}, {status: 400})
    }
  }

  // default
  return Response.redirect('https://github.com/MAKS11060/tg-maks11060_bot?ref=workerd')
})
