import {basicAuth} from '#lib/utils.ts'
import {env} from 'cloudflare:workers'
import createClient from 'openapi-fetch'
import type {components, paths} from './danbooru.oas.ts'

export type DanbooruPost = components['schemas']['post']

export const danbooruUri = new URL('https://danbooru.donmai.us')
export const danbooruApi = createClient<paths>({
  baseUrl: danbooruUri.toString(),
  headers: {
    authorization: basicAuth({
      username: env.DANBOORU_LOGIN,
      password: env.DANBOORU_APIKEY,
    }),
  },
})

// export const getPost = async (id: number) => {
//   const {data, error} = await danbooruApi.GET('/posts/{id}.json', {
//     params: {path: {id}},
//   })

//   if (!data || error) throw error
//   return data
// }

// export const getRandomPost = async () => {
//   const {data, error} = await danbooruApi.GET('/posts/random.json', {
//     params: {
//       query: {
//         tags: `search:all`,
//       },
//     },
//   })

//   if (!data || error) throw error
//   return data
// }

// export const getRandomUserFav = async (username: string) => {
//   const {data, error} = await danbooruApi.GET('/posts/random.json', {
//     params: {
//       query: {
//         tags: `ordfav:${username} -video`,
//       },
//     },
//   })

//   if (!data || error) throw error
//   return data
// }
