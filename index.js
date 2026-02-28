const { startBot } = require("./handler/messageHandler")

async function start() {
    console.log("Menghubungkan ke Whatsapp...")
    await startBot()
}

start()