import {fmt, link} from 'npm:@grammyjs/parse-mode'
import {Composer, Context, InlineKeyboard} from 'npm:grammy'
import {GetArtOptions, stateManager} from '../commands/_state.ts'
import {DanbooruPost, danbooruUri, getPost, getRandomPost, getRandomUserFav} from '../lib/danbooru/danbooru.ts'

export const art = new Composer()

const fmtPost = (post: DanbooruPost) => {
  const img =
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

  const caption = fmt([fmt`${artLink}`, ...characters])

  return {
    post,
    img,
    caption,
    has_spoiler: post.rating === 'e',
  }
}

const extractId = (input: string) => {
  const regex = /\/posts\/(\d+)|^(\d+)$/
  const match = input.trim().match(regex)

  if (match) return Number(match[1] || match[2])
  return null
}

const getArtKB = (options?: GetArtOptions) => {
  const kb = new InlineKeyboard()
    .text('remove', 'self-delete')
    .text('save', stateManager.createState({type: 'art-save'}))

  if (!options?.id) {
    kb.row().text('new art', stateManager.createState({type: 'art-retry', options}))
  }

  return kb
}

const replyPost = (c: Context, post: DanbooruPost, options?: GetArtOptions) => {
  const {img, caption, has_spoiler} = fmtPost(post)

  if (post.file_ext === 'gif') {
    return c.replyWithAnimation(img, {
      disable_notification: true,
      reply_markup: getArtKB(options),
      caption_entities: caption.entities,
      caption: caption.text,
      has_spoiler,
    })
  }

  return c.replyWithPhoto(img, {
    disable_notification: true,
    reply_markup: getArtKB(options),
    caption_entities: caption.entities,
    caption: caption.text,
    has_spoiler,
  })
}

art.command('art', async (c) => {
  await c.deleteMessage()

  try {
    const postId = extractId(c.match)
    const options = {
      ...(postId && {id: postId}),
      ...(c.match.startsWith('u:') && {user: c.match.slice(2)}),
      ...(c.match.startsWith('user:') && {user: c.match.slice(5)}),
    }

    const post = options.id
      ? await getPost(options.id)
      : options.user
      ? await getRandomUserFav(options.user)
      : await getRandomPost()

    return replyPost(c, post, options)
  } catch (e) {
    console.error(e)
    return c.reply('Error', {
      reply_markup: new InlineKeyboard().text('remove', 'self-delete'),
      // reply_markup: new InlineKeyboard().text('retry', 'art-retry'),
    })
  }
})

art.on('callback_query:data', async (c, next) => {
  const state = stateManager.fromState(c.callbackQuery.data)

  if (state.type === 'art-save') {
    return c.editMessageReplyMarkup({reply_markup: undefined})
  }

  if (state.type === 'art-retry') {
      const options = state.options
      const post = options?.id
        ? await getPost(options.id)
        : options?.user
        ? await getRandomUserFav(options.user)
        : await getRandomPost()

    return replyPost(c, post, options)
  }

  await next()
})
