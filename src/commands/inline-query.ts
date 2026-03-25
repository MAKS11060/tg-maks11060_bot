import {FormattedString} from '@grammyjs/parse-mode'
import {Fetch, fetchCache} from '@maks11060/web/fetch'
import {Composer, InlineKeyboard, InlineQueryResultBuilder} from 'grammy'
import {isDev} from '../config.ts'
import {danbooruApi, DanbooruPost, danbooruUri} from '../lib/danbooru/danbooru.ts'
import {danbooruTagsBuilder} from '../lib/danbooru/tags.ts'

const bot = new Composer()
export { bot as inline_query }

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

const fetchDanbooru = Fetch()
  .use(
    await fetchCache({
      name: 'danbooru',
      ttl: 60 * 30, // 30 min
      log: isDev,
    }),
  )

const createPostFmtMessage = ({id, tag_string_artist, tag_string_character, tag_string_copyright}: DanbooruPost) => {
  const removeUnderscore = (v: string) => v.replaceAll('_', ' ').trim()
  const toUri = (tags: string) => {
    const uri = new URL('/posts', danbooruUri)
    uri.searchParams.set('tags', tags)
    return uri.toString()
  }

  const postLink = FormattedString.link(`${tag_string_artist || id}`, new URL(`/posts/${1}`, danbooruUri).toString())

  const copyrightTags = tag_string_copyright?.split(' ') || []
  const characterTags = tag_string_character?.split(' ') || []

  const charactersGroups = copyrightTags
    .map((copyright) => [
      copyright,
      characterTags.filter((char) => char.endsWith(`_(${copyright})`)),
    ])
    .filter(([, chars]) => chars.length) as [string, string[]][]

  const charactersAny = new Set(charactersGroups.flatMap((v) => v[1]))
    .symmetricDifference(new Set(characterTags))
    .values()
    .toArray()

  const formatCharacterGroup = ([copyright, characters]: [string, string[]]) => {
    return FormattedString.link(removeUnderscore(copyright), toUri(copyright))
      .plain('(')
      .concat(
        FormattedString.join(
          characters.map((char) =>
            FormattedString.link(removeUnderscore(char.replace(`_${copyright}`, '')), toUri(char))
          ),
          ', ',
        ),
      )
      .plain(')')
  }

  return FormattedString.join([
    postLink,
    ...charactersGroups.map(formatCharacterGroup),
    FormattedString.join(
      charactersAny.map((char) => FormattedString.link(removeUnderscore(char), toUri(char)), ' '),
    ),
  ])
}

Deno.test('Test 657483', async (t) => {
  const data = {
    'id': 11027130,
    'created_at': '2026-03-25T20:43:42.052+02:00',
    'uploader_id': 554505,
    'score': 0,
    'source': 'https://x.com/anjohink/status/1844025266898878645',
    'md5': '5936774d9c75a918a6f1c0c6119a0c7f',
    'last_comment_bumped_at': null,
    'rating': 'g',
    'image_width': 1448,
    'image_height': 2048,
    'tag_string':
      '1boy alien anjohink baltan_seijin booska chibi color_timer colored_skin colorful_background commentary creator_connection dada_(ultra_series) eleking flying gomora green_background highres kaiju kaiju_booska male_focus monster multicolored_skin pigmon pink_background red_skin science_fiction serious silver_skin sparkle tokusatsu ultra_beam ultra_series yellow_background yellow_eyes',
    'fav_count': 0,
    'file_ext': 'jpg',
    'last_noted_at': null,
    'parent_id': null,
    'has_children': false,
    'approver_id': null,
    'tag_count_general': 23,
    'tag_count_artist': 1,
    'tag_count_character': 6,
    'tag_count_copyright': 2,
    'file_size': 391958,
    'up_score': 0,
    'down_score': 0,
    'is_pending': false,
    'is_flagged': false,
    'is_deleted': false,
    'tag_count': 34,
    'updated_at': '2026-03-25T20:43:52.867+02:00',
    'is_banned': false,
    'pixiv_id': null,
    'last_commented_at': null,
    'has_active_children': false,
    'bit_flags': 0,
    'tag_count_meta': 2,
    'has_large': true,
    'has_visible_children': false,
    'media_asset': {
      'id': 47173691,
      'created_at': '2026-03-25T20:29:20.885+02:00',
      'updated_at': '2026-03-25T20:29:22.423+02:00',
      'md5': '5936774d9c75a918a6f1c0c6119a0c7f',
      'file_ext': 'jpg',
      'file_size': 391958,
      'image_width': 1448,
      'image_height': 2048,
      'duration': null,
      'status': 'active',
      'file_key': 'Ud9YlZaJN',
      'is_public': true,
      'pixel_hash': '03d19ecf3d313b150ec655f7291fbf46',
      'variants': [
        {
          'type': '180x180',
          'url': 'https://cdn.donmai.us/180x180/59/36/5936774d9c75a918a6f1c0c6119a0c7f.jpg',
          'width': 127,
          'height': 180,
          'file_ext': 'jpg',
        },
        {
          'type': '360x360',
          'url': 'https://cdn.donmai.us/360x360/59/36/5936774d9c75a918a6f1c0c6119a0c7f.jpg',
          'width': 255,
          'height': 360,
          'file_ext': 'jpg',
        },
        {
          'type': '720x720',
          'url': 'https://cdn.donmai.us/720x720/59/36/5936774d9c75a918a6f1c0c6119a0c7f.webp',
          'width': 509,
          'height': 720,
          'file_ext': 'webp',
        },
        {
          'type': 'sample',
          'url': 'https://cdn.donmai.us/sample/59/36/sample-5936774d9c75a918a6f1c0c6119a0c7f.jpg',
          'width': 850,
          'height': 1202,
          'file_ext': 'jpg',
        },
        {
          'type': 'original',
          'url': 'https://cdn.donmai.us/original/59/36/5936774d9c75a918a6f1c0c6119a0c7f.jpg',
          'width': 1448,
          'height': 2048,
          'file_ext': 'jpg',
        },
      ],
    },
    'tag_string_general':
      '1boy alien chibi color_timer colored_skin colorful_background creator_connection flying green_background kaiju male_focus monster multicolored_skin pink_background red_skin science_fiction serious silver_skin sparkle tokusatsu ultra_beam yellow_background yellow_eyes',
    'tag_string_character': 'baltan_seijin booska dada_(ultra_series) eleking gomora pigmon',
    'tag_string_copyright': 'kaiju_booska ultra_series',
    'tag_string_artist': 'anjohink',
    'tag_string_meta': 'commentary highres',
    'file_url': 'https://cdn.donmai.us/original/59/36/5936774d9c75a918a6f1c0c6119a0c7f.jpg',
    'large_file_url': 'https://cdn.donmai.us/sample/59/36/sample-5936774d9c75a918a6f1c0c6119a0c7f.jpg',
    'preview_file_url': 'https://cdn.donmai.us/180x180/59/36/5936774d9c75a918a6f1c0c6119a0c7f.jpg',
  }

  console.log(createPostFmtMessage(data as unknown as DanbooruPost))
})

const createPostInline = (post: DanbooruPost) => {
  const fileUrl = post.file_size >= 5242880 // 5 MiB tg limit
    ? post.large_file_url
    : post?.file_url!

  const id = `post-${post.id}`
  const message = createPostFmtMessage(post)

  if (post.file_ext === 'gif') {
    return InlineQueryResultBuilder.gif(id, fileUrl, post.preview_file_url, {
      thumbnail_mime_type: 'image/jpeg',
      caption: message.caption,
      caption_entities: message.caption_entities,
      // ...message,
    })
  }

  if (post.file_ext === 'jpg' || post.file_ext === 'png') {
    return InlineQueryResultBuilder.photo(id, fileUrl, {
      thumbnail_url: post.preview_file_url,
      caption: message.caption,
      caption_entities: message.caption_entities,
    })
  }

  // TODO: test video/webm/mp4
  if (post.file_ext === 'mp4') {
    return InlineQueryResultBuilder.videoMp4(
      id,
      'Video',
      post.file_url,
      post.preview_file_url,
      {caption: message.caption, caption_entities: message.caption_entities},
    )
  }

  if (post.file_ext === 'webm') {
    return
  }

  // unknown post format
  if (post.file_ext) {
    return
    // return InlineQueryResultBuilder.article(
    //   id,
    //   fmt.postLink.text + ` (${post.file_ext})`,
    //   {
    //     description: fmt.characters.map((v) => v.text).join(' '),
    //     url: new URL(`/posts/${post.id}`, danbooruUri).toString(),
    //     thumbnail_url: post.preview_file_url,
    //   },
    // ).text(fmt.postLink.text, {
    //   entities: fmt.postLink.entities,
    // })
  }
}

// @bot id 1 2 123
bot.inlineQuery(/^id\s+(?<numbers>(?:\d+\s*){1,11})/, async (c, next) => {
  const match = c.match as RegExpMatchArray
  if (match && match.groups) {
    const ids = match.groups.numbers.split(/\s+/).map(Number)
    const posts = await Promise.all(
      ids.map(async (id) => {
        const {data} = await danbooruApi
          .GET('/posts/{id}.json', {
            params: {path: {id}},
            fetch: fetchDanbooru.fetch,
          })

        if (data) return createPostInline(data)
      }),
    )

    return await c
      .answerInlineQuery(posts.filter(Boolean) as [], {
        is_personal: true,
        cache_time: 6,
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
    fetch: fetchDanbooru.fetch,

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

  return await c.answerInlineQuery(
    posts?.map(createPostInline).filter(Boolean) as [],
    {
      next_offset: `${offset + 1}`,
    },
  )
})

bot.inlineQuery(/hot/i, async (c, next) => {
  const offset = parseInt(c.inlineQuery.offset) || 1

  const {data: posts} = await danbooruApi.GET('/posts.json', {
    fetch: fetchDanbooru.fetch,
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
    .answerInlineQuery(posts?.map(createPostInline).filter(Boolean) as [], {
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
    fetch: fetchDanbooru.fetch,
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

  return await c.answerInlineQuery(
    posts?.map(createPostInline).filter(Boolean) as [],
    {
      cache_time: 60,
      next_offset: `${offset + 1}`,
    },
  )
})

bot.on('inline_query', async (c) => {
  console.log('%cUnknown inline query', 'color: orange', c.inlineQuery.query)

  const offset = parseInt(c.inlineQuery.offset) || 1
  const {data: posts} = await danbooruApi.GET('/posts.json', {
    fetch: fetchDanbooru.fetch,
    params: {
      query: {
        tags: danbooruTagsBuilder()
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
      ...(posts?.map(createPostInline).filter(Boolean) as []),
    ],
    {
      is_personal: true,
      cache_time: 15,
    },
  )
})
