#!/usr/bin/env -S deno run -A --watch-hmr --env-file

import {GrammyError, webhookCallback} from 'grammy'
import {bot} from './src/bot.ts'

if (Deno.env.has('WEBHOOK_SECRET')) {
  const webhookHandler = webhookCallback(bot, 'std/http', {
    secretToken: Deno.env.get('WEBHOOK_SECRET')!,
  })

  const handler = async (req: Request) => {
    const uri = new URL(req.url)
    if (req.method === 'POST' && uri.pathname === '/tg/webhook') {
      try {
        const start = performance.now()
        const res = await webhookHandler(req)
        console.log(
          `${req.method} %c${req.url} %c${(performance.now() - start).toFixed(3)} ms`,
          'color: green;',
          'color: blue;'
        )
        return res
      } catch (e) {
        if (e instanceof GrammyError) {
          console.error(e.name, e.description, e.message, e.parameters)
          console.error(e.payload)
        } else if (e instanceof Error) {
          console.error('%cERR','color: red', e)
        }
        // return Response.error()
        return Response.json({ok: false}, {status: 400})
      }
    }

    return Response.redirect('https://github.com/MAKS11060/tg-maks11060_bot')
  }

  if (Deno.env.has('KEY') && Deno.env.has('CERT')) {
    const key = Deno.readTextFileSync(Deno.env.get('KEY')!)
    const cert = Deno.readTextFileSync(Deno.env.get('CERT')!)
    Deno.serve({key, cert, port: 443}, handler)
  } else {
    Deno.serve({port: 80}, handler)
  }
} else {
  bot.start().catch((e) => console.error('BOT Error', e))
}
