import {encodeBase64} from 'jsr:@std/encoding/base64'
import createClient from 'npm:openapi-fetch'
import type {paths, components} from './openapi.d.ts'

export type DanbooruPost = components['schemas']['Post']

const login = Deno.env.get('DANBOOURU_LOGIN')
const apiKey = Deno.env.get('DANBOOURU_APIKEY')
const authorization = encodeBase64(`${login}:${apiKey}`)

export const danbooruUri = new URL('https://danbooru.donmai.us')
export const danbooruApi = createClient<paths>({
  baseUrl: danbooruUri.toString(),
  headers: {authorization},
})

export const getPost = async (id: number) => {
  const {data, error} = await danbooruApi.GET('/posts/{id}.json', {
    params: {path: {id}},
  })

  if (!data || error) throw error
  return data
}

export const getRandomPost = async () => {
  const {data, error} = await danbooruApi.GET('/posts/random.json', {
    params: {
      query: {
        tags: `search:all`,
      },
    },
  })

  if (!data || error) throw error
  return data
}

export const getRandomUserFav = async (username: string) => {
  const {data, error} = await danbooruApi.GET('/posts/random.json', {
    params: {
      query: {
        tags: `ordfav:${username} -video`,
      },
    },
  })

  if (!data || error) throw error
  return data
}
