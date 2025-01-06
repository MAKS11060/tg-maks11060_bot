import {Composer} from "npm:grammy"

export const shared = new Composer()

shared.callbackQuery('self-delete', async (c) => {
  return await c.deleteMessage()
})