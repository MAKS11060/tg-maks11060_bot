#!/usr/bin/env -S deno run -A

const kv = await Deno.openKv('https://api.deno.com/databases/1b06fc52-4af1-4726-84f8-8c13ce753da5/connect')
console.log(await Array.fromAsync(kv.list({prefix: []})))

await kv.delete(['wg-uses'])
// await kv.delete(['wg-stats', '01JJ71DNKYEZQ4M0M8H24WAM0P'])
