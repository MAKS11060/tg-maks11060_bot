import {danbooruApi} from '#lib/danbooru/danbooru.ts'
import {HTTPError} from '#lib/openapi-fetch.ts'
import {Bot, GrammyError, webhookCallback} from 'grammy'
import {app} from './src/grammy/app.ts'

danbooruApi.use({
  onResponse({request, response}) {
    if (!response.ok) {
      console.error(request.headers)
    }
  },
})

export default {
  async fetch(request, env, ctx): Promise<Response> {
    const uri = new URL(request.url)

    // Grammy route
    if (request.method === 'POST' && uri.pathname === '/tg/webhook') {
      const bot = new Bot(env.BOT_TOKEN, {botInfo: JSON.parse(env.BOT_INFO)})

      bot.use(app)

      const grammyHandler = webhookCallback(bot, 'cloudflare-mod', {
        secretToken: env.WEBHOOK_SECRET,
      })

      try {
        return await grammyHandler(request)
      } catch (e) {
        if (e instanceof GrammyError) {
          console.error(e.name, e.description, e.message, e.parameters)
          console.error(e.payload)
        } else if (e instanceof HTTPError) {
          console.error(e)
        } else if (e instanceof Error) {
          console.error('%cERR', 'color: red', e)
        }

        return Response.json({ok: false}, {status: 400})
      }
    }

    // default
    return Response.redirect('https://github.com/MAKS11060/tg-maks11060_bot?ref=workerd')
  },
} satisfies ExportedHandler<Env>
