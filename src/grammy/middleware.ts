import type {Middleware} from 'grammy'
import type {AppCtx} from './constants.ts'

export const setEnv = (env: Env): Middleware<AppCtx> => {
  return async (c, next) => {
    c.env = env
    await next()
  }
}
