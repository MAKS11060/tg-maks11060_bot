#!/usr/bin/env -S node --env-file .env

import {Api} from 'grammy'

const BOT_TOKEN = process.env['BOT_TOKEN']

const api = new Api(BOT_TOKEN!)

console.log(
  'setMyCommands',
  await api.setMyCommands([
    {command: 'start', description: 'Print hello'},
    {command: 'help', description: 'Show help'},
    {command: 'menu', description: 'Show inline commands'},
  ]),
)
