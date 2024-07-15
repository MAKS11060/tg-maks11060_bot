import {Hono} from 'hono'
import 'jsr:@std/dotenv/load'

const origin = Deno.env.get('REVERSE_PROXY_URI')
  ? new URL(Deno.env.get('REVERSE_PROXY_URI')!)
  : null

const app = new Hono()
  .use(async (c, next) => {
    if (origin) {
      const uri = new URL(c.req.url)
      uri.host = origin.host

      const res = await fetch(uri, c.req.raw)
      return new Response(res.body, res)
    }
    await next()
  })

  .get('/', (c) => {
    return c.text('404 - not found')
  })

if (Deno.env.has('KEY') && Deno.env.has('CERT')) {
  const key = Deno.readTextFileSync(Deno.env.get('KEY')!).replaceAll('EC ', '') // for ec
  const cert = Deno.readTextFileSync(Deno.env.get('CERT')!)
  Deno.serve({key, cert, port: 443}, (r, info) => app.fetch(r, {info}))
} else {
  Deno.serve({port: 80}, app.fetch)
}
