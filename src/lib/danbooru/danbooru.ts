import {env} from 'cloudflare:workers'
import createClient from 'openapi-fetch'
import {userAgent} from '../../config/global.ts'
import type {components, paths} from './danbooru.oas.ts'

export type DanbooruPost = components['schemas']['post']

export const danbooruUri = env.DANBOORU_URL || 'https://danbooru.donmai.us'
export const danbooruApi = createClient<paths>({
  baseUrl: danbooruUri,
  headers: {
    'User-Agent': userAgent,
  },
})

danbooruApi.use({ // Log error
  onResponse({request, response}) {
    if (!response.ok) {
      console.log(
        Object.fromEntries(request.headers.entries()),
        Object.fromEntries(response.headers.entries()),
      )
    }
  },
})

if (env.DANBOORU_PROXY) {
  const proxyURL = new URL(env.DANBOORU_PROXY)
  danbooruApi.use({
    onRequest({request}) {
      const headers = new Headers()
      for (const [key, val] of request.headers) {
        headers.set(`x-${key}`, val)
      }

      return new Request(`${proxyURL}${request.url}`, {
        method: request.method,
        headers,
        body: request.body,
      })
    },
  })
}
