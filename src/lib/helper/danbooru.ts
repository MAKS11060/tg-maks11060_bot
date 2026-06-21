import {FormattedString} from '@grammyjs/parse-mode'
import {InlineQueryResultBuilder} from 'grammy'
import {MAX_PICTURE_SIZE} from '../../grammy/constants.ts'
import {type DanbooruPost, danbooruUri} from '../danbooru/danbooru.ts'

export const createPostFmtMessage = (
  {id, tag_string_artist, tag_string_character, tag_string_copyright}: DanbooruPost,
) => {
  const removeUnderscore = (v: string) => v.replaceAll('_', ' ').trim()
  const toUri = (tags: string) => {
    const uri = new URL('/posts', danbooruUri)
    uri.searchParams.set('tags', tags)
    return uri.toString()
  }

  const postLink = FormattedString.link(`${tag_string_artist || id}`, new URL(`/posts/${id}`, danbooruUri).toString())

  const copyrightTags = tag_string_copyright?.split(' ') || []
  const characterTags = tag_string_character?.split(' ') || []

  const charactersGroups = copyrightTags
    .map((copyright) =>
      [
        copyright,
        characterTags.filter((char) => char.endsWith(`_(${copyright})`)),
      ] as const
    )
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
            FormattedString.link(removeUnderscore(char.replace(`_(${copyright})`, '')), toUri(char))
          ),
          ', ',
        ),
      )
      .plain(')')
  }

  return FormattedString.join([
    postLink,
    ...charactersGroups.map(formatCharacterGroup),
    ...charactersAny.map((char) => FormattedString.link(removeUnderscore(char), toUri(char))),
  ], ' ')
}

export const createPostInline = (post: DanbooruPost) => {
  const fileUrl = post.file_size >= MAX_PICTURE_SIZE
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
