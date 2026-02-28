const { execute } = require("./ping")

module.exports = {
    name: "menu",
    async execute (sock, msgObj) {

    const menu = `*Bot Keselek Whiskas*
author: irfikri0204

*List Fitur Bot*
1. !ping  | Biar dibalas Pong
2. !menu  | Menampilkan Menu
3. !s [reply foto/video]  | Set sticker
4. !dl [url]  | Download media dari sosmed

Jangan lupa follow ig @irfikri0204
    `
    const from = msgObj.key.remoteJid

    await sock.sendMessage(from, { 
        text: menu
     })
}
}
