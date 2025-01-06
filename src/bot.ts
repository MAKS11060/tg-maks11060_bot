import {fmt, link} from 'npm:@grammyjs/parse-mode'
import {Bot, InlineKeyboard} from 'npm:grammy'
import {stateManager} from './commands/_state.ts'
import {handleStateArt} from './commands/art.ts'

export const bot = new Bot(Deno.env.get('BOT_TOKEN')!)

bot.catch((e) => {
  console.error(e)

  return e.ctx.reply('Error', {
    reply_markup: new InlineKeyboard().text('remove', stateManager.createState({type: 'self-delete'})),
    // reply_markup: new InlineKeyboard().text('retry', 'art-retry'),
  })
})

bot.command('start', async (c) => {
  c.deleteMessage()

  const commands = [
    {
      command: '/art',
      description: fmt`Random Art from ${link('Danbooru', 'https://danbooru.donmai.us/')}`,
    },
    {
      command: '/art id/url',
      description: fmt`Art from ${link('Danbooru', 'https://danbooru.donmai.us/')}\n`,
    },
    {
      command: '/warp',
      description: fmt`Config for AmneziaWG\n`,
    },
    {
      command: '/developer_info',
      description: 'About developer',
    },
  ]
  const startText = fmt([fmt`Available commands\n\n`, ...commands.map((v) => fmt`${v.command} - ${v.description}\n`)])

  const kb = new InlineKeyboard()
  // .text('Close', stateManager.createState({type: 'self-delete'}))
  if (c.message?.chat.type === 'private') {
    kb.webApp('Open Bot Repo', 'https://tg-maks11060.deno.dev/?utm=tg')
  }

  await c.reply(startText.text, {
    reply_markup: kb,
    link_preview_options: {is_disabled: true},
    entities: startText.entities,
  })
})

bot.command('developer_info', async (c) => {
  await c.deleteMessage()
  return c.reply('Developer Info', {
    protect_content: true,
    reply_markup: new InlineKeyboard()
      .text('Close', stateManager.createState({type: 'self-delete'}))
      .url('GitHub', 'https://github.com/maks11060')
      .url('Bot Repo', 'https://github.com/MAKS11060/tg-maks11060_bot'),
  })
})

bot.command('upd', async (c) => {
  await c.deleteMessage()
  if (c.message?.from.username !== 'MAKS11060') {
    if (c.match === 'clear') {
      return bot.api.setMyCommands([])
    }

    return bot.api.setMyCommands([
      {command: '/art', description: 'Danbooru art'},
      {command: '/warp', description: 'Get AmneziaWG Config'},
    ])
  }
})

bot.on('callback_query:data', async (c) => {
  const state = stateManager.fromState(c.callbackQuery.data)

  if (state.type === 'self-delete') {
    return c.deleteMessage()
  }

  let res = await handleStateArt(state, c)
  if (res) return res
})
