#!/usr/bin/env -S deno run -A --unstable-hmr

import 'jsr:@std/dotenv/load'
import {fmt, link} from 'npm:@grammyjs/parse-mode'
import {Bot, InlineKeyboard} from 'npm:grammy'
import {Danbooru} from './src/danbooru.ts'

export const bot = new Bot(Deno.env.get('BOT_TOKEN')!)
const danbooru = new Danbooru({
  login: Deno.env.get('DANBOOURU_LOGIN')!,
  apikey: Deno.env.get('DANBOOURU_APIKEY')!,
})

bot.catch((e) => {
  console.error(e)
})

const getArt = async () => {
  // const art = await danbooru.userFavorites('maks11060')
  const art = await danbooru.saveSearchPosts()
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

const artKB = new InlineKeyboard()
  .text('remove', 'self-delete')
  .text('save', 'art-save')
  .row()
  .text('new art', 'art-retry')

bot.on('message', async (c) => {
  const {text} = c.message

  if (text === '/upd') {
    bot.api.setMyCommands([
      // {command: '/upd', description: 'Update bot commands'},
      {command: '/art', description: 'Danbooru art'},
    ])
  }

  if (text === '/start') {
    const kb = new InlineKeyboard()
      // .text('btn-1')
      // .text('btn-2')
      .text('remove', 'self-delete')
      .row()
      .webApp('open app', 'https://tg-maks11060.deno.dev/?utm=tg')

    await c.reply(
      `Hello ${c.message.from.username ?? c.message.from.first_name}`,
      {reply_markup: kb}
    )
  }

  if (text === '/art' || text === '/art@maks11060_bot') {
    await c.deleteMessage()

    try {
      const {uri, art, caption} = await getArt()
      return c.replyWithPhoto(uri, {
        disable_notification: true,
        reply_markup: artKB,
        has_spoiler: art.rating === 'e',
        caption: caption.text,
        caption_entities: caption.entities,
      })
    } catch (e) {
      console.error(e)
      return c.reply('Error', {
        reply_markup: new InlineKeyboard().text('remove', 'self-delete'),
        // reply_markup: new InlineKeyboard().text('retry', 'art-retry'),
      })
    }
  }

  console.error('unknown command', text)
})

bot.on('callback_query:data', async (c) => {
  const {data} = c.callbackQuery
  if (data === 'self-delete') {
    return c.deleteMessage()
  }

  if (data === 'art-save') {
    return c.editMessageReplyMarkup({reply_markup: undefined})
  }

  if (data === 'art-retry') {
    try {
      const {uri, art, caption} = await getArt()
      await c.editMessageMedia({
        type: 'photo',
        media: uri.toString(),
        has_spoiler: art.rating === 'e',
        caption: caption.text,
        caption_entities: caption.entities,
      })
      return c.editMessageReplyMarkup({reply_markup: artKB})
    } catch (e) {
      console.error(e)
      return c.reply('Error', {
        reply_markup: new InlineKeyboard().text('remove', 'self-delete'),
      })
    }
  }
})
