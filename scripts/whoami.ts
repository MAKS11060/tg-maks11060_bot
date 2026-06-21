#!/usr/bin/env -S deno run -A --env-file

import {Bot} from 'grammy'

const bot = new Bot(Deno.env.get('BOT_TOKEN')!)
const me = await bot.api.getMe()

const envData = `# .env
BOT_INFO='${JSON.stringify(me)}'`

console.log(envData)
