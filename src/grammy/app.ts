import {danbooruApi} from '#lib/danbooru/danbooru.ts'
import {danbooruTagsBuilder} from '#lib/danbooru/tags.ts'
import {createPostInline} from '#lib/helper/danbooru.ts'
import {getBotLink_tme} from '#lib/helper/telegram.ts'
import {basicAuth} from '#lib/utils.ts'
import {fmt} from '@grammyjs/parse-mode'
import {Composer, InlineKeyboard, InlineQueryResultBuilder} from 'grammy'
import {type AppCtx, CALLBACK_QUERY_TYPE} from './constants.ts'

export const app = new Composer<AppCtx>()

app.command('start', async (c) => {
  await c.reply(`Hello ${c.chat.username ?? c.chat.first_name ?? c.chat.id}`)
})

app.command('help', async (c) => {
  const text = fmt`[${c.me.first_name.replaceAll('#', '\\#')}](${getBotLink_tme(c.me)}) — *Help*

*Commands*
/help \\- Print help
/menu \\- Show inline commands`

  await c.deleteMessage()
  return await c.reply(text.text, {
    entities: text.entities,
    parse_mode: 'MarkdownV2',
    link_preview_options: {
      is_disabled: true,
    },
    reply_markup: new InlineKeyboard()
      .text('Remove', CALLBACK_QUERY_TYPE.selfDelete),
  })
})

app.command('developer_info', async (c) => {
  await c.deleteMessage()
  return c.reply('Developer Info', {
    protect_content: true,
    reply_markup: new InlineKeyboard()
      .text('Remove', CALLBACK_QUERY_TYPE.selfDelete)
      .url('GitHub', 'https://github.com/maks11060')
      .url('Bot Repo', 'https://github.com/maks11060/tg-maks11060_bot'),
  })
})

app.command('menu', async (c) => {
  const text = fmt`[${c.me.first_name.replaceAll('#', '\\#')}](${getBotLink_tme(c.me)}) — *Inline commands*`
  const defaultInlineMenu = new InlineKeyboard()
    .switchInlineCurrent('Hot', 'hot')
    .switchInlineCurrent('Fav', 'fav')
    .text('Remove', CALLBACK_QUERY_TYPE.selfDelete)
    .toTransposed()
    .switchInlineCurrent('Saved', 'saved')

  await c.deleteMessage()
  return await c.reply(text.text, {
    entities: text.entities,
    parse_mode: 'MarkdownV2',
    reply_markup: defaultInlineMenu,
  })
})

app.on('callback_query', async (c, next) => {
  if (c.callbackQuery.data === CALLBACK_QUERY_TYPE.selfSave) {
    await c.editMessageReplyMarkup({reply_markup: undefined})
    return
  }

  if (c.callbackQuery.data === CALLBACK_QUERY_TYPE.selfDelete) {
    await c.deleteMessage()
    return
  }

  await next()
})

// --- danbooru ---
const only = [
  'id',
  'file_ext',
  'file_size',
  'file_url',
  'large_file_url',
  'preview_file_url',
  'tag_string_artist',
  'tag_string_copyright',
  'tag_string_character',
].join(',')

// show post by id
// @ id 1234567
app.inlineQuery(/^(?:i|id|post)\s+(?<numbers>(?:\d+\s*){1,12})$/i, async (c, next) => {
  const match = c.match as RegExpMatchArray
  const ids = new Set(match.groups?.numbers?.split(/\s+/).map(Number))

  const {response, data} = await danbooruApi.GET('/posts.json', {
    params: {
      query: {
        limit: 50,
        only,
        tags: `id:${ids.values().toArray().join(',')}`,
      },
    },
  })

  if (response.ok && data?.length) {
    return await c.answerInlineQuery(
      data
        ?.filter((v) => v.id && v.file_url)
        .map((v) => createPostInline(v)!)!,
      {is_personal: true, cache_time: 10},
    )
      .catch((e) => {
        console.error('Answer Err', e)
      })
  }

  await next()
})

//
app.inlineQuery(/^(?<command>fav|like|f)(?:\s+(?<username>[\w-]+))?\s*$/i, async (c, next) => {
  const limit = 50
  const page = parseInt(c.inlineQuery.offset) || 1

  const {data: posts} = await danbooruApi.GET('/posts.json', {
    params: {
      query: {
        tags: danbooruTagsBuilder()
          .ordfav('maks11060') // TODO: make dynamic
          .tag('status:banned', true)
          .toString(),
        limit,
        only,
        page,
      },
    },
  })

  if (!posts?.length) return await next()

  return await c.answerInlineQuery(
    posts?.map(createPostInline).filter(Boolean) as [],
    {next_offset: `${page + 1}`},
  )
})

app.inlineQuery(/(h|hot)/i, async (c, next) => {
  const limit = 50
  const page = parseInt(c.inlineQuery.offset) || 1

  const {data: posts} = await danbooruApi.GET('/posts.json', {
    params: {
      query: {
        tags: danbooruTagsBuilder()
          .order('rank')
          .rating(['e', 'q'], true)
          .tag('parent:none')
          .tag('status:banned', true)
          .toString(),
        limit,
        only,
        page,
      },
    },
  })
  if (!posts?.length) return await next()

  return await c.answerInlineQuery(
    posts?.map(createPostInline).filter(Boolean) as [],
    {
      is_personal: true,
      next_offset: `${page + 1}`,
    },
  )
    .catch((e) => {
      console.error('Answer Err', e)
    })
})

app.inlineQuery(/^s(ave[s|d]?)?$/i, async (c, next) => {
  const limit = 50
  const page = parseInt(c.inlineQuery.offset) || 1

  const {data: posts} = await danbooruApi.GET('/posts.json', {
    headers: {authorization: basicAuth(c.env.DANBOORU_LOGIN, c.env.DANBOORU_APIKEY)},
    params: {
      query: {
        tags: danbooruTagsBuilder()
          .tag('search:all')
          .tag('parent:none')
          .toString(),
        limit,
        page,
        only,
      },
    },
  })

  if (!posts) return await next()

  return await c.answerInlineQuery(
    posts?.map(createPostInline).filter(Boolean) as [],
    {
      cache_time: 60,
      next_offset: `${page + 1}`,
    },
  )
})

// default response
app.on('inline_query', async (c) => {
  return await c.answerInlineQuery([
    InlineQueryResultBuilder.article('t:help', 'Search help', {
      reply_markup: new InlineKeyboard()
        .switchInlineCurrent('Hot', 'hot')
        .switchInlineCurrent('Fav', 'fav')
        .switchInlineCurrent('Saved', 'saved')
        .toTransposed(),
    }).text('Search help'),
  ], {is_personal: true, cache_time: 15})
})
