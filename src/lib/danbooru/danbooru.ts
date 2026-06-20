import createClient from 'openapi-fetch'
import {userAgent} from '../../config/global.ts'
import type {components, paths} from './danbooru.oas.ts'

export type DanbooruPost = components['schemas']['post']

export const danbooruUri = new URL('https://danbooru.donmai.us')
export const danbooruApi = createClient<paths>({
  baseUrl: danbooruUri.toString(),
  headers: {
    'User-Agent': userAgent
  },
})
