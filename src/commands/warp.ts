import { InlineKeyboard, InputFile } from 'npm:grammy'
import { bot } from '../bot.ts'
import { generateWarpConf } from '../lib/cfWarp.ts'
import { stateManager } from './_state.ts'

const kv = await Deno.openKv()

// WARP / WG
bot.command('warp', async (c) => {
  if (c.message?.from.is_bot) return c.reply('error')

  try {
    await c.deleteMessage()

    if (!c.message) return c.reply('error')
    console.log(`warp: ${c.chat.id} ${c.message?.from.username ?? c.message?.from.first_name}`)

    const res = await kv.get<string>(['wg', c.message.from.id])
    const conf = res.value ?? (await generateWarpConf()).conf
    await kv.set(['wg', c.message.from.id], conf, {expireIn: 1000 * 60 * 10})

    const data = new TextEncoder().encode(conf)
    const f = new InputFile(data, 'wg.conf')
    return c.replyWithDocument(f, {protect_content: true})

    // const {conf} = await generateWGConf()
    // const data = fmt`${code(`\`\`\`wg.conf\n${conf}\n\`\`\``)}`
    // return c.reply(data.text, {
    //   entities: data.entities,
    //   parse_mode: 'MarkdownV2',
    //   protect_content: true,
    //   link_preview_options: {is_disabled: true},
    // })
  } catch (e) {
    console.error(e)
    return c.reply('Error', {
      protect_content: true,
      reply_markup: new InlineKeyboard().text('remove', stateManager.createState({type: 'self-delete'})),
    })
  }
})
