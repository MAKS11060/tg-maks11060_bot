#!/usr/bin/env -S deno run -A --watch-hmr

import 'jsr:@std/dotenv/load'
import {code, fmt, link} from 'npm:@grammyjs/parse-mode'
import {Bot, InlineKeyboard, InputFile} from 'npm:grammy'
import {generateWGConf} from './src/lib/cfWarp.ts'
import {Danbooru} from './src/lib/danbooru.ts'
import {createStateManager} from './src/lib/state.ts'

export const bot = new Bot(Deno.env.get('BOT_TOKEN')!)
const danbooru = new Danbooru({
  login: Deno.env.get('DANBOOURU_LOGIN')!,
  apikey: Deno.env.get('DANBOOURU_APIKEY')!,
})
const kv = await Deno.openKv()

type CommandState =
  | {type: 'self-delete'}
  | {type: 'art-save'}
  | {type: 'art-retry'; options?: GetArtOptions}

const stateManager = createStateManager<CommandState>()

type GetArtOptions = {id?: string | null; user?: string | null}

const getArt = async (options: GetArtOptions = {}) => {
  // const art = await danbooru.userFavorites('maks11060')
  // const art = id ? await danbooru.post(id) : await danbooru.saveSearchPosts()
  const art = options.id
    ? await danbooru.post(options.id)
    : options.user
    ? await danbooru.userFavorites(options.user)
    : await danbooru.saveSearchPosts()
  if (art === null) throw new Error('art is null')

  const uri = art.file_size >= 5242880 ? art.large_file_url : art?.file_url!

  const artLink = fmt`${link(
    art.tag_string_artist ? art.tag_string_artist : art.id,
    new URL(`/posts/${art.id}`, danbooru.origin).toString()
  )}`
  const characters = art.tag_string_character.split(' ').map((char) => {
    const uri = new URL('/posts', danbooru.origin)
    uri.searchParams.set('tags', char)
    return fmt` ${link(char, uri.toString())}`
  })
  const caption = fmt([fmt`${artLink}`, ...characters])

  return {art, uri, caption}
}

const extractId = (input: string): string | null => {
  const regex = /\/posts\/(\d+)|^(\d+)$/
  const match = input.trim().match(regex)

  if (match) {
    return match[1] || match[2]
  }

  return null
}

const getArtKB = (options?: GetArtOptions) => {
  const kb = new InlineKeyboard()
    .text('remove', stateManager.createState({type: 'self-delete'}))
    .text('save', stateManager.createState({type: 'art-save'}))

  if (!options?.id) {
    kb.row().text(
      'new art',
      stateManager.createState({type: 'art-retry', options})
    )
  }

  return kb
}

bot.catch((e) => {
  console.error(e)
})

bot.command('start', async (c) => {
  c.deleteMessage()

  const commands = [
    {
      command: '/art',
      description: fmt`Random Art from ${link(
        'Danbooru',
        'https://danbooru.donmai.us/'
      )}`,
    },
    {
      command: '/art id/url',
      description: fmt`Art from ${link(
        'Danbooru',
        'https://danbooru.donmai.us/'
      )}\n`,
    },
    {
      command: '/developer_info',
      description: 'About developer',
    },
  ]
  const startText = fmt([
    fmt`Available commands\n\n`,
    ...commands.map((v) => fmt`${v.command} - ${v.description}\n`),
  ])

  const kb = new InlineKeyboard()
    // .text('Close', stateManager.createState({type: 'self-delete'}))
    .webApp('Open Bot Repo', 'https://tg-maks11060.deno.dev/?utm=tg')

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

// ART
bot.command('art', async (c) => {
  await c.deleteMessage()

  const artId = extractId(c.match)
  try {
    const artOptions: Parameters<typeof getArt>['0'] = {
      ...(artId && {id: artId}),
      ...(c.match.startsWith('u:') && {user: c.match.slice(2)}),
      ...(c.match.startsWith('user:') && {user: c.match.slice(5)}),
    }
    const {uri, art, caption} = await getArt(artOptions)

    return c.replyWithPhoto(uri, {
      disable_notification: true,
      reply_markup: getArtKB(artOptions),
      has_spoiler: art.rating === 'e',
      caption: caption.text,
      caption_entities: caption.entities,
    })
  } catch (e) {
    console.error(e)
    return c.reply('Error', {
      reply_markup: new InlineKeyboard().text(
        'remove',
        stateManager.createState({type: 'self-delete'})
      ),
      // reply_markup: new InlineKeyboard().text('retry', 'art-retry'),
    })
  }
})

// WARP / WG
bot.command('warp', async (c) => {
  if (c.message?.from.is_bot) return c.reply('error')

  try {
    if (!c.message) return c.reply('error')
    console.log(
      `warp: ${c.chat.id} ${
        c.message?.from.username ?? c.message?.from.first_name
      }`
    )

    {
      const res = await kv.get<string>(['wg', c.message.from.id])
      const conf = res.value ?? (await generateWGConf()).conf
      await kv.set(['wg', c.message.from.id], conf, {expireIn: 1000 * 60 * 5})

      const data = new TextEncoder().encode(conf)
      const f = new InputFile(data, 'wg.conf')
      return c.replyWithDocument(f, {protect_content: true})
    }

    const {conf} = await generateWGConf()
    const data = fmt`${code(`\`\`\`wg.conf\n${conf}\n\`\`\``)}`
    return c.reply(data.text, {
      entities: data.entities,
      parse_mode: 'MarkdownV2',
      protect_content: true,
      link_preview_options: {is_disabled: true},
    })
  } catch (e) {
    console.error(e)
    return c.reply('Error', {
      protect_content: true,
      reply_markup: new InlineKeyboard().text(
        'remove',
        stateManager.createState({type: 'self-delete'})
      ),
    })
  }
})

bot.on('callback_query:data', async (c) => {
  const {data} = c.callbackQuery
  const state = stateManager.fromState(data)
  // console.log({state})

  if (state.type === 'self-delete') {
    return c.deleteMessage()
  }

  if (state.type === 'art-save') {
    return c.editMessageReplyMarkup({reply_markup: undefined})
  }

  if (state.type === 'art-retry') {
    try {
      const {uri, art, caption} = await getArt(state.options)
      await c.editMessageMedia({
        type: 'photo',
        media: uri.toString(),
        has_spoiler: art.rating === 'e',
        caption: caption.text,
        caption_entities: caption.entities,
      })
      return c.editMessageReplyMarkup({reply_markup: getArtKB(state.options)})
    } catch (e) {
      console.error(e)
      return c.reply('Error', {
        protect_content: true,
        reply_markup: new InlineKeyboard().text(
          'remove',
          stateManager.createState({type: 'self-delete'})
        ),
      })
    }
  }
})
