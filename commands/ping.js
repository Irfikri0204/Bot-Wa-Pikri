module.exports = {
    name: "ping",

    async execute(sock, msgObj) {

        const from = msgObj.key.remoteJid

        await sock.sendMessage(from, {
            text: "Pong 🏓"
        })
    }
}
