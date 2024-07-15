
const tg = window.Telegram.WebApp
const el = document.querySelector('pre')!

// @ts-ignore
globalThis.tg = tg

el.innerText = JSON.stringify({tg}, null, 2)
