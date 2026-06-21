import {env} from 'cloudflare:workers'

export const userAgent = env.DANBOORU_USER_AGENT || 'github.com/MAKS11060/tg-maks11060_bot'

export const danbooruProxy = env.DANBOORU_PROXY || null
