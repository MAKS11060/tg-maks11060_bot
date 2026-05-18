import type {UserFromGetMe} from 'grammy/types'

export const getBotLink_tme = (user: UserFromGetMe) => `https://t.me/${user.username}`
export const getBotLink_tg = (user: UserFromGetMe) => `tg://${user.username}`
