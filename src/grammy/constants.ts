import type {Context} from 'grammy'

export type AppCtx = Context & {env: Env}

/** `5 MiB` tg limit */
export const MAX_PICTURE_SIZE = 5242880

export const CALLBACK_QUERY_TYPE = {
  selfDelete: 'self-delete',
  selfSave: 'self-save',
} as const
