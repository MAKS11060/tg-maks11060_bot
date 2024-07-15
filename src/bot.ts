import 'jsr:@std/dotenv/load'
import {Telegraf} from 'telegraf'

export const bot = new Telegraf(Deno.env.get('BOT_TOKEN')!)

bot.launch()