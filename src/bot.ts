#!/usr/bin/env -S deno run -A --watch-hmr

import {createCachedFetch} from 'https://raw.githubusercontent.com/MAKS11060/deno-libs/main/web/cache.ts'
import {fmt, link} from 'npm:@grammyjs/parse-mode'
import {Bot, GrammyError, HttpError, InlineKeyboard, InlineQueryResultBuilder} from 'npm:grammy'
import {warp} from './commands/warp.ts'
import {tgBotLink_tme, tgBotNameMD} from './config.ts'
import {danbooruTagsBuilder} from './deps.ts'
import {danbooruApi, danbooruUri} from './lib/danbooru/danbooru.ts'

export const bot = new Bot(Deno.env.get('BOT_TOKEN')!)

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
  if (c.message?.from.username !== 'MAKS11060') {
    if (c.match === 'clear') {
      return bot.api.setMyCommands([])
    }

    await c.api.setMyCommands([
      {command: 'start', description: 'Print hello'},
      {command: 'help', description: 'Show help'},
      {command: 'menu', description: 'Show inline commands'},
      {command: 'warp', description: 'Generate warp config'},
      // {command: 'art', description: 'Get anime art'},
    ])
  }
})

bot.use(warp) // warp config generator

// Danbooru // TODO: move to other file
const fetchDanbooru = await createCachedFetch({
  name: 'danbooru',
  ttl: 60 * 60 * 1, // 1h
  log: true,
})

bot.inlineQuery(/^id\s+(?<numbers>(?:\d+\s*){1,10})/, async (c, next) => {
  const match = c.match as RegExpMatchArray
  if (match && match.groups) {
    const ids = match.groups.numbers.split(/\s+/).map(Number)
    const posts = await Promise.all(
      ids.map(async (id) => {
        const post = await danbooruApi
          .GET('/posts/{id}.json', {
            params: {path: {id}},
            fetch: fetchDanbooru,
          })
          .then((v) => v.data)

        if (post) {
          const uri =
            post.file_size >= 5242880 // 5 MiB tg limit
              ? post.large_file_url
              : post?.file_url!

          const artLink = fmt`${link(
            post.tag_string_artist ? post.tag_string_artist : post.id,
            new URL(`/posts/${post.id}`, danbooruUri).toString()
          )}`

          const characters = post.tag_string_character.split(' ').map((char) => {
            const uri = new URL('/posts', danbooruUri)
            uri.searchParams.set('tags', char)
            return fmt` ${link(char, uri.toString())}`
          })

          const {text: caption, entities: caption_entities} = fmt([fmt`${artLink}`, ...characters])

          return InlineQueryResultBuilder.photo(`${id}`, uri, {
            thumbnail_url: post.preview_file_url,
            caption,
            caption_entities,
          })
        }
      })
    )

    return await c.answerInlineQuery(posts.filter(Boolean) as [], {})
  }

  await next()
})

// bot.inlineQuery(/^(u|user)\s+(\w+)/i, async (c, next) => {
//   const match = c.match as RegExpMatchArray
//   const username = match[2]

//   if (username) {
//     const {data} = await danbooruApi.GET('/autocomplete.json', {
//       params: {
//         query: {
//           'search[type]': 'user',
//           'search[query]': username,
//           limit: 5,
//         },
//       },
//     })

//     console.log(data)
//     if (data) {
//       const items = data.map((v) => {
//         if (v.type !== 'user') return
//         return InlineQueryResultBuilder.article(`user:${v.id}`, v.label).text(`${v.label}`)
//       })!

//       return c.answerInlineQuery(items as any, {
//         cache_time: 30,
//         is_personal: true,
//       })
//     }
//   }
//   await next()
// })

bot.inlineQuery(/^fav(orite.?)?$/i, async (c, next) => {
  const offset = parseInt(c.inlineQuery.offset) || 1
  const {data: posts} = await danbooruApi.GET('/posts.json', {
    fetch: fetchDanbooru,
    params: {
      query: {
        tags: danbooruTagsBuilder() //
          .ordfav('maks11060')
          .toString(),
        limit: 50,
        page: offset,
        only: 'id,file_size,preview_file_url,large_file_url,file_url,tag_string_artist,tag_string_character',
      },
    },
  })

  if (!posts) return await next()

  const items = posts?.map((post) => {
    const uri =
      post.file_size >= 5242880 // 5 MiB tg limit
        ? post.large_file_url
        : post?.file_url!

    const artLink = fmt`${link(
      post.tag_string_artist ? post.tag_string_artist : post.id,
      new URL(`/posts/${post.id}`, danbooruUri).toString()
    )}`

    const characters = post.tag_string_character.split(' ').map((char) => {
      const uri = new URL('/posts', danbooruUri)
      uri.searchParams.set('tags', char)
      return fmt` ${link(char, uri.toString())}`
    })

    const {text: caption, entities: caption_entities} = fmt([fmt`${artLink}`, ...characters])

    return InlineQueryResultBuilder.photo(`${post.id}`, uri, {
      thumbnail_url: post.preview_file_url,
      caption,
      caption_entities,
      // reply_markup: new InlineKeyboard() //
      //   .text('Remove', 'self-delete')
      //   .text('Save', 'self-save'),
    })
  })

  return await c.answerInlineQuery(items, {
    cache_time: 30,
    is_personal: true,
    next_offset: `${offset + 1}`,
  })
})

bot.inlineQuery(/hot/i, async (c, next) => {
  const offset = parseInt(c.inlineQuery.offset) || 1
  const {data: posts} = await danbooruApi.GET('/posts.json', {
    fetch: fetchDanbooru,
    params: {
      query: {
        tags: danbooruTagsBuilder() //
          .order('rank')
          .rating(['e', 'q'], true)
          .tag('parent:none')
          .toString(),
        limit: 50,
        page: offset,
        only: 'id,file_size,preview_file_url,large_file_url,file_url,tag_string_artist,tag_string_character',
      },
    },
  })

  if (!posts) return await next()

  const items = posts?.map((post) => {
    const uri =
      post.file_size >= 5242880 // 5 MiB tg limit
        ? post.large_file_url
        : post?.file_url!

    const artLink = fmt`${link(
      post.tag_string_artist ? post.tag_string_artist : post.id,
      new URL(`/posts/${post.id}`, danbooruUri).toString()
    )}`

    const characters = post.tag_string_character.split(' ').map((char) => {
      const uri = new URL('/posts', danbooruUri)
      uri.searchParams.set('tags', char)
      return fmt` ${link(char, uri.toString())}`
    })

    const {text: caption, entities: caption_entities} = fmt([fmt`${artLink}`, ...characters])

    return InlineQueryResultBuilder.photo(`${post.id}`, uri, {
      thumbnail_url: post.preview_file_url,
      caption,
      caption_entities,
    })
  })

  return await c.answerInlineQuery(items, {
    cache_time: 30,
    next_offset: `${offset + 1}`,
  })
})

bot.inlineQuery(/^s(ave[s|d]?)?$/i, async (c, next) => {
  const offset = parseInt(c.inlineQuery.offset) || 1
  const {data: posts} = await danbooruApi.GET('/posts.json', {
    fetch: fetchDanbooru,
    params: {
      query: {
        tags: danbooruTagsBuilder() //
          .tag('search:all')
          .tag('parent:none')
          .toString(),
        limit: 50,
        page: offset,
        only: 'id,file_size,preview_file_url,large_file_url,file_url,tag_string_artist,tag_string_character',
      },
    },
  })

  if (!posts) return await next()

  const items = posts?.map((post) => {
    const uri =
      post.file_size >= 5242880 // 5 MiB tg limit
        ? post.large_file_url
        : post?.file_url!

    const artLink = fmt`${link(
      post.tag_string_artist ? post.tag_string_artist : post.id,
      new URL(`/posts/${post.id}`, danbooruUri).toString()
    )}`

    const characters = post.tag_string_character.split(' ').map((char) => {
      const uri = new URL('/posts', danbooruUri)
      uri.searchParams.set('tags', char)
      return fmt` ${link(char, uri.toString())}`
    })

    const {text: caption, entities: caption_entities} = fmt([fmt`${artLink}`, ...characters])

    return InlineQueryResultBuilder.photo(`${post.id}`, uri, {
      thumbnail_url: post.preview_file_url,
      caption,
      caption_entities,
      title: `${post.tag_string_artist || post.id}`,
      description: `${post.tag_string_artist || post.id}`,
    })
  })

  return await c.answerInlineQuery(items, {
    cache_time: 30,
    next_offset: `${offset + 1}`,
  })
})

bot.on('inline_query', async (c) => {
  console.log('%cUnknown inline query', 'color: orange', c.inlineQuery.query)

  return await c.answerInlineQuery(
    [
      InlineQueryResultBuilder.article('t:help', 'Search help', {
        reply_markup: new InlineKeyboard() //
          .switchInlineCurrent('Hot', 'hot')
          .switchInlineCurrent('Fav', 'fav')
          .switchInlineCurrent('Saved', 'saved')
          .toTransposed(),
      }).text('Search help'),
    ],
    {
      is_personal: true,
      cache_time: 15,
    }
  )
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
