#!/usr/bin/env -S deno run -A

import 'jsr:@std/dotenv/load'
import {Bot} from 'npm:grammy'

const bot = new Bot(Deno.env.get('BOT_TOKEN')!)
const me = await bot.api.getMe()

const envData = `# .env
BOT_LINK=${me.username}
BOT_NAME="${me.first_name}"`

console.log(envData)
