import {fmt, link} from '@grammyjs/parse-mode'
import {createCachedFetch} from '@maks11060/web'
import {danbooruTagsBuilder} from 'danbooru'
import {Composer, InlineKeyboard, InlineQueryResultBuilder} from 'grammy'
import {isDev} from '../config.ts'
import {danbooruApi, DanbooruPost, danbooruUri} from '../lib/danbooru/danbooru.ts'

const bot = new Composer()
export {bot as inline_query}

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

const fetchDanbooru = await createCachedFetch({
  name: 'danbooru',
  ttl: 60 * 30, // 30 min
  log: isDev,
})

const postToText = ({id, tag_string_artist, tag_string_character, tag_string_copyright}: DanbooruPost) => {
  const removeUnderscore = (v: string) => v.replaceAll('_', ' ').trim()
  const toUri = (tags: string) => {
    const uri = new URL('/posts', danbooruUri)
    uri.searchParams.set('tags', tags)
    return uri.toString()
  }

  const copyrightTags = tag_string_copyright?.split(' ') || []
  const characterTags = tag_string_character?.split(' ') || []

  const charactersGroups = copyrightTags
    .map((copyright) => {
      const chars = characterTags.filter((char) => char.endsWith(`_(${copyright})`))
      return [copyright, chars]
    })
    .filter(([, chars]) => chars.length) as [string, string[]][]

  // Находим персонажей без копирайтов
  const charactersAny = new Set(charactersGroups.flatMap((v) => v[1]))
    .symmetricDifference(new Set(characterTags))
    .values()
    .toArray()
  // const charactersAny = Array.from(
  // new Set(characterTags.filter((char) => !charactersGroups.some(([_, chars]) => chars.includes(char))))
  // ).map(removeUnderscore)

  const formatCharacterGroup = ([copyright, characters]: [string, string[]]) =>
    fmt([
      fmt` ${link(removeUnderscore(copyright), toUri(copyright))}(`,
      ...characters
        .map((char) => char.replace(`_(${copyright})`, ''))
        .map((char, i) => fmt`${link(removeUnderscore(char), toUri(char))}${i !== characters.length - 1 ? ', ' : ''}`),
      ')',
    ])

  const fPostLink = fmt`${link(tag_string_artist || id.toString(), new URL(`/posts/${id}`, danbooruUri).toString())}`
  const fCharacters = [
    ...charactersGroups.map(formatCharacterGroup),
    ...charactersAny.map((char) => fmt` ${link(removeUnderscore(char), toUri(char))}`),
  ]

  const {text: caption, entities: caption_entities} = fmt([fPostLink, ...fCharacters])
  return {
    caption,
    caption_entities,
    raw: {
      copyrights: copyrightTags,
      characters: characterTags,
    },
    fmt: {
      postLink: fPostLink,
      characters: fCharacters,
    },
  }
}

const postToInlineResult = (post: DanbooruPost) => {
  const uri =
    post.file_size >= 5242880 // 5 MiB tg limit
      ? post.large_file_url
      : post?.file_url!

  const id = `post-${post.id}`
  const {caption, caption_entities, raw, fmt} = postToText(post)

  if (post.file_ext === 'gif') {
    return InlineQueryResultBuilder.gif(id, uri, post.preview_file_url, {
      thumbnail_mime_type: 'image/jpeg',
      caption,
      caption_entities,
      title: 'Title',
    })
  }

  if (post.file_ext === 'jpg' || post.file_ext === 'png') {
    return InlineQueryResultBuilder.photo(id, uri, {
      thumbnail_url: post.preview_file_url,
      caption,
      caption_entities,
    })
  }

  // TODO: test video/webm/mp4
  if (post.file_ext === 'mp4') {
    return InlineQueryResultBuilder.videoMp4(id, 'Video', post.file_url, post.preview_file_url, {
      caption,
      caption_entities,
    })
  }

  if (post.file_ext === 'webm') {
    return
  }

  // unknown post format
  if (post.file_ext) {
    return InlineQueryResultBuilder.article(id, fmt.postLink.text + ` (${post.file_ext})`, {
      description: fmt.characters.map((v) => v.text).join(' '),
      url: new URL(`/posts/${post.id}`, danbooruUri).toString(),
      thumbnail_url: post.preview_file_url,
    }).text(fmt.postLink.text, {
      entities: fmt.postLink.entities,
    })
  }
}

// @bot id 1 2 123
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

        if (post) return postToInlineResult(post)
      })
    )

    return await c
      .answerInlineQuery(posts.filter(Boolean) as [], {
        is_personal: true,
        cache_time: 10,
      })
      .catch((e) => {
        console.error('Answer Err', e)
      })
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

// @bot fav
// @bot favorite[s]
bot.inlineQuery(/^fav(orite.?)?$/i, async (c, next) => {
  const offset = parseInt(c.inlineQuery.offset) || 1
  const {data: posts} = await danbooruApi.GET('/posts.json', {
    fetch: fetchDanbooru,
    params: {
      query: {
        tags: danbooruTagsBuilder() //
          .ordfav('maks11060')
          .tag('status:banned', true)
          .toString(),
        limit: 50,
        page: offset,
        only,
      },
    },
  })

  if (!posts) return await next()

  return await c.answerInlineQuery(posts?.map(postToInlineResult).filter(Boolean) as [], {
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
          .tag('status:banned', true)
          .toString(),
        limit: 50,
        page: offset,
        only,
      },
    },
  })
  if (!posts) return await next()

  return await c
    .answerInlineQuery(posts?.map(postToInlineResult).filter(Boolean) as [], {
      // cache_time: 30,
      is_personal: true,
      next_offset: `${offset + 1}`,
    })
    .catch((e) => {
      console.error('Answer Err', e)
    })
})

// @bot s
// @bot saves
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
        only,
      },
    },
  })

  if (!posts) return await next()

  return await c.answerInlineQuery(posts?.map(postToInlineResult).filter(Boolean) as [], {
    cache_time: 60,
    next_offset: `${offset + 1}`,
  })
})

bot.on('inline_query', async (c) => {
  console.log('%cUnknown inline query', 'color: orange', c.inlineQuery.query)

  const offset = parseInt(c.inlineQuery.offset) || 1
  const {data: posts} = await danbooruApi.GET('/posts.json', {
    fetch: fetchDanbooru,
    params: {
      query: {
        tags: danbooruTagsBuilder() //
          .tag('user:maks11060')
          .tag('status:banned', true)
          .toString(),
        limit: 49,
        page: offset,
        only,
      },
    },
  })

  return await c.answerInlineQuery(
    [
      InlineQueryResultBuilder.article('t:help', 'Search help', {
        reply_markup: new InlineKeyboard() //
          .switchInlineCurrent('Hot', 'hot')
          .switchInlineCurrent('Fav', 'fav')
          .switchInlineCurrent('Saved', 'saved')
          .toTransposed(),
      }).text('Search help'),
      ...(posts?.map(postToInlineResult).filter(Boolean) as []),
    ],
    {
      is_personal: true,
      cache_time: 15,
    }
  )
})
