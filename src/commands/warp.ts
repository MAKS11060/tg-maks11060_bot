import {encodeHex} from "@std/encoding/hex"
import {ulid} from '@std/ulid/ulid'
import {Composer, InlineKeyboard, InputFile} from 'grammy'
import {generateWarpConf, presets} from '../lib/cf-warp.ts'

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
    const uidHash = await crypto.subtle.digest({name: 'SHA-256'}, new TextEncoder().encode(`${c.message.from.id}`))
    op.set(['wg', c.message.from.id], conf, {expireIn: 1000 * 60 * 10})
    op.set(['wg-stats', ulid()], encodeHex(uidHash)) // anonymous statistics
    op.sum(['wg-uses'], 1n)
    await op.commit()

    // to tg file
    const data = new TextEncoder().encode(conf)
    const wgConfFile = new InputFile(data, `wg.${Math.floor(Date.now() / 1000)}.conf`)
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
