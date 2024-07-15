import {Hono} from 'hono'
import {serveStatic} from 'hono/deno'
import {logger} from 'hono/logger'
import * as esbuild from "https://deno.land/x/esbuild@v0.23.0/wasm.js"
import {esbuildTranspiler} from 'npm:@hono/esbuild-transpiler'

export const web = new Hono()

await esbuild.initialize({
  wasmURL: 'https://deno.land/x/esbuild@v0.19.5/esbuild.wasm',
  worker: false,
})

web.use('*', logger(console.log.bind(null, 'https')))

web.get(
  '*',
  esbuildTranspiler({
    esbuild,
    transformOptions: {
      sourcemap: 'inline',
    },
  }),
  async (c, next) => {
    await next()
    if (c.res.headers.get('content-type') === 'video/mp2t') {
      c.header('content-type', 'text/javascript')
    }
  },
  serveStatic({root: './src'})
)
