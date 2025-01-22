import {fmt} from '@grammyjs/parse-mode'
import {Bot, GrammyError, HttpError, InlineKeyboard} from 'grammy'
import {inline_query} from './commands/inline-query.ts'
import {warp} from './commands/warp.ts'
import {tgBotLink_tme, tgBotNameMD, tgBotOwner} from './config.ts'

export const bot = new Bot(Deno.env.get('BOT_TOKEN')!)

bot.use(inline_query)
bot.use(warp) // warp config generator

bot.catch((err) => {
  const ctx = err.ctx
  console.error(`Error while handling update ${ctx.update.update_id}:`)
  const e = err.error
  if (e instanceof GrammyError) {
    console.error('Error in request:', e.description)
  } else if (e instanceof HttpError) {
    console.error('Could not contact Telegram:', e)
  } else {
    console.error('Unknown error:', e)
  }
})

//
const defaultInlineMenu = new InlineKeyboard() //
  .switchInlineCurrent('Hot', 'hot')
  .switchInlineCurrent('Fav', 'fav')
  .text('Remove', 'self-delete')
  .toTransposed()
  .switchInlineCurrent('Saved', 'saved')

//
bot.command('start', async (c) => {
  // if (c.match === '') {}
  await c.reply(`Hello ${c.chat.username ?? c.chat.first_name ?? c.chat.id}`)
})

bot.command('help', async (c) => {
  //   const text = fmt`[MAKS11060\\#DEV](tg://maks11060_devbot) — *Help*

  // *Commands*
  // /help \\- Print help
  // /menu \\- Show inline commands

  // *[Amnezia VPN](https://github.com/amnezia-vpn/amnezia-client)*
  // /warp \\- Generate config for Amnezia VPN
  // /warp\\_alt \\- Generate a config with alternative parameters

  // *Anime Art from [Danbooru](https://danbooru.donmai.us)*
  // /art \\- Get random art`

  const text = fmt`[${tgBotNameMD}](${tgBotLink_tme}) — *Help*

*Commands*
/help \\- Print help
/menu \\- Show inline commands

*[Amnezia VPN](https://github.com/amnezia-vpn/amnezia-client)*
/warp \\- Generate config for Amnezia VPN
/warp\\_alt \\- Generate a config with alternative parameters`

  await c.deleteMessage()
  return await c.reply(text.text, {
    entities: text.entities,
    parse_mode: 'MarkdownV2',
    link_preview_options: {
      is_disabled: true,
    },
    reply_markup: new InlineKeyboard() //
      .text('Remove', 'self-delete'),
  })
})

bot.command('menu', async (c) => {
  const text = fmt`[${tgBotNameMD}](${tgBotLink_tme}) — *Inline commands*`

  await c.deleteMessage()
  return await c.reply(text.text, {
    entities: text.entities,
    parse_mode: 'MarkdownV2',
    reply_markup: defaultInlineMenu,
  })
})

bot.command('developer_info', async (c) => {
  await c.deleteMessage()
  return c.reply('Developer Info', {
    protect_content: true,
    reply_markup: new InlineKeyboard()
      .text('Remove', 'self-delete')
      .url('GitHub', 'https://github.com/maks11060')
      .url('Bot Repo', 'https://github.com/maks11060/tg-maks11060_bot'),
  })
})

bot.command('upd', async (c) => {
  await c.deleteMessage()
  if (c.message?.from.username === tgBotOwner) {
    if (c.match === 'clear') {
      return bot.api.setMyCommands([])
    }

    console.log('upd commands')
    await c.api.setMyCommands([
      {command: 'start', description: 'Print hello'},
      {command: 'help', description: 'Show help'},
      {command: 'menu', description: 'Show inline commands'},
      {command: 'warp', description: 'Generate warp config'},
      // {command: 'art', description: 'Get anime art'},
    ])
  }
})

bot.on('callback_query', async (c, next) => {
  if (c.callbackQuery.data === 'self-save') {
    await c.editMessageReplyMarkup({reply_markup: undefined})
    return
  }
  if (c.callbackQuery.data === 'self-delete') {
    await c.deleteMessage()
    return
  }

  await next()
})
