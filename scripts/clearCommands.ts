#!/usr/bin/env -S node --watch --env-file .env

import {Api} from 'grammy'

const BOT_TOKEN = process.env['BOT_TOKEN']

const api = new Api(BOT_TOKEN!)

console.log(
  'setMyCommands clear',
  await api.setMyCommands([]),
)
