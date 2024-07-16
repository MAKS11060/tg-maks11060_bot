import {Hono} from 'hono'
import {delay} from 'jsr:@std/async'
import {Format, Input} from 'telegraf'
import {callbackQuery, message} from 'telegraf/filters'
import {bot} from './bot.ts'
import {Danbooru} from './danbooru.ts'
import {web} from './web.ts'

const app = new Hono()
app.route('/', web)

const danbooru = new Danbooru({
  login: Deno.env.get('DANBOOURU_LOGIN')!,
  apikey: Deno.env.get('DANBOOURU_APIKEY')!,
})

const getArt = async () => {
  // const art = await danbooru.saveSearchPosts().catch((e) => {
  //   console.error(e)
  //   return null
  // })
  const art = await danbooru.userFavorites('maks11060').catch((e) => {
    console.error(e)
    return null
  })
  // const art = await danbooru.post(7054134).catch((e) => {
  //   console.error(e)
  //   return null
  // })

  if (art === null) return null
  const url = Input.fromURL(
    art.file_size >= 5242880 ? art.large_file_url : art?.file_url!
  )

  // console.log({
  //   url,
  //   size: art.file_size,
  //   sizeHr: formatBytes(art.file_size),
  //   f: Format.link(
  //     `${art.tag_string_artist ? art.tag_string_artist : art.id}`,
  //     new URL(`/posts/${art.id}`, danbooru.origin.origin).toString()
  //   ),
  // })

  const chrs = art.tag_string_character.split(' ').map((char) => {
    const tags_uri = new URL('/posts', danbooru.origin.origin)
    tags_uri.searchParams.set('tags', char)
    return Format.link(char, tags_uri.toString())
  })

  const caption = Format.join(
    [
      Format.link(
        `${art.tag_string_artist ? art.tag_string_artist : art.id}`,
        new URL(`/posts/${art.id}`, danbooru.origin.origin).toString()
      ),
      Format.join(chrs, ' '),
    ],
    ' '
  )

  return {art, url, caption}
}

const getArtInlineKeyboard = () => {
  return [
    [
      {
        text: 'Save',
        callback_data: 'art-save',
      },
      {
        text: 'Next',
        callback_data: 'art-next',
      },
    ],
    [
      {
        text: 'Replace',
        callback_data: 'art-replace',
      },
    ],
  ];
}

bot.catch((err, c) => {
  console.error(err)
  c.reply('Unknown error', {
    reply_markup: {
      inline_keyboard: [[{text: 'Remove', callback_data: 'kb-remove'}]],
    },
  })
})

bot.on(message('text'), async (c) => {
  if (c.message.from.is_bot) {
    console.log('from bot', c.message)
    return
  }

  if (c.message.text === '/start') {
    return c.reply(`Hello ${c.message.from.first_name}`)
  }

  if (c.message.text === '/update') {
    return bot.telegram.setMyCommands([
      {command: '/art', description: 'sends art'},
    ])
  }

  if (c.message.text === '/art') {
    const art = await getArt()
    if (!art) return c.reply('Internal error')

    return c.replyWithPhoto(art.url, {
      disable_notification: true,
      caption: art.caption,
      has_spoiler: art.art.rating === 'e',
      reply_markup: {
        inline_keyboard: getArtInlineKeyboard(),
      },
    })
  }

  if (c.message.text === '/test') {
    // bot.telegram.sendMessage(c.chat.id, 'Command not found')
    return c.reply(JSON.stringify(c.message, null, 2))
  }
})

bot.on(callbackQuery('data'), async (c) => {
  console.log(`${c.callbackQuery.from.username} => ${c.callbackQuery.data}`)

  if (c.callbackQuery.data === 'kb-remove') {
    // return c.editMessageReplyMarkup({
    // inline_keyboard: [],
    // })
    return c.deleteMessage()
  }

  if (c.callbackQuery.data === 'art-save') {
    return c.editMessageReplyMarkup({
      inline_keyboard: [],
    })
  }

  if (c.callbackQuery.data === 'art-replace') {
    const art = await getArt()
    if (!art) return c.reply('Internal error')

    await c.editMessageMedia({
      type: 'photo',
      media: art.url,
      caption: art.caption,
      has_spoiler: art.art.rating === 'e',
    })

    await delay(900)
    return c.editMessageReplyMarkup({
      inline_keyboard: getArtInlineKeyboard(),
    })
  }

  if (c.callbackQuery.data === 'art-next') {
    const art = await getArt()
    if (!art) return c.reply('Internal error')

    // remove current buttons
    await c.editMessageReplyMarkup({
      inline_keyboard: [],
    })

    // post new message
    return c.replyWithPhoto(art.url, {
      disable_notification: true,
      caption: art.caption,
      has_spoiler: art.art.rating === 'e',
      reply_markup: {
        inline_keyboard: getArtInlineKeyboard(),
      },
    })
  }
})

// bot.telegram.sendMessage(-1001740581520, 'Run bot', {disable_notification: true})
// bot.telegram.sendMessage(320086393, 'Run bot', {disable_notification: true}) // me
// const art = await getArt()
// if (art) bot.telegram.sendPhoto(-1001740581520, art.url, {
//   disable_notification: true,
//   caption: art.caption,
//   has_spoiler: art.art.rating === 'e',
//   reply_markup: {
//     inline_keyboard: getArtInlineKeyboard(),
//   },
// })

if (Deno.env.has('KEY') && Deno.env.has('CERT')) {
  const key = Deno.readTextFileSync(Deno.env.get('KEY')!).replaceAll('EC ', '') // for compatibility
  const cert = Deno.readTextFileSync(Deno.env.get('CERT')!)
  Deno.serve({key, cert, port: 443}, (r, info) => app.fetch(r, {info}))
}

addEventListener('unhandledrejection', (e) => {
  console.error(e)
  e.preventDefault()
})
