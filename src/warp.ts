import {Composer, InlineKeyboard, InputFile} from 'npm:grammy'
import {generateWarpConf, presets} from './lib/cf-warp.ts'

export const warp = new Composer()
const kv = await Deno.openKv()

// WARP / WG
warp.command(['warp', 'warp_alt'], async (c) => {
  if (c.message?.from.is_bot) return await c.reply('error')

  const isAlt = c.message?.text.startsWith('/warp_alt')

  try {
    await c.deleteMessage()
    if (!c.message) return c.reply('error')
    console.log(`warp: ${c.chat.id} ${c.message?.from.username ?? c.message?.from.first_name}`)

    let conf: string
    const cachedConf = await kv.get<string>(['wg', c.message.from.id])
    if (cachedConf.value) {
      conf = cachedConf.value
    } else {
      conf = await generateWarpConf(isAlt ? presets.alt : presets.default)
    }

    // cache config
    const op = kv.atomic()
    op.set(['wg', c.message.from.id], conf, {expireIn: 1000 * 60 * 10})
    op.sum(['wg-uses'], 1n)
    await op.commit()

    // to tg file
    const wgConfFile = new InputFile(conf, `wg.${Math.floor(Date.now() / 1000)}.conf`)
    return await c.replyWithDocument(wgConfFile, {
      protect_content: true,
      reply_markup: new InlineKeyboard() //
        .text('Remove', 'self-delete'),
    })
  } catch (e) {
    console.error(e)
    return await c.reply('Generate Warp config failed.\nTry again', {
      protect_content: true,
      reply_markup: new InlineKeyboard() //
        .text('Remove', 'self-delete'),
    })
  }
})