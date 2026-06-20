import {env} from 'cloudflare:workers'

/** Used to prevent 403 errors from Cloudflare */
export const userAgent = env.DANBOORU_USER_AGENT ?? 'https://github.com/MAKS11060/tg-maks11060_bot'
