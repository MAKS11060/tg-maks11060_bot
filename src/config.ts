
export const tgBotLink = Deno.env.get('BOT_LINK')!
export const tgBotLink_tme = `https://t.me/${tgBotLink}`
export const tgBotLink_tg = `tg://${tgBotLink}`

export const tgBotName = Deno.env.get('BOT_NAME')!
export const tgBotNameMD = tgBotName.replaceAll('#', '\\#')
