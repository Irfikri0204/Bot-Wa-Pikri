const {
    default: makeWASocket,
    useMultiFileAuthState,
    fetchLatestBaileysVersion
} = require("@whiskeysockets/baileys")
const pino = require("pino")
const readline = require("readline")
const fs = require("fs")
const path = require("path")
const { default: chalk } = require("chalk")

const commands = {}
const commandsPath = path.join(__dirname, "../commands")
const commandFiles = fs.readdirSync(commandsPath)

for (const file of commandFiles) {
    const command = require(path.join(commandsPath, file))
    commands[command.name] = command
}

function question(q){
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    })
    return new Promise(res => rl.question(q, ans=>{
        rl.close()
        res(ans)
    }))
}

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState("session")
    const { version } = await fetchLatestBaileysVersion()

    const sock = makeWASocket({
        auth: state,
        version,
        printQRInTerminal: false,
        logger: pino({ level: "silent" }),
        browser: ["Ubuntu","Chrome","20.0.04"]
    })

    sock.ev.on("creds.update", saveCreds)

    // Pairing code
    if (!sock.authState.creds.registered) {
        const number = await question("Masukkan nomor (628xxx): ")
        const code = await sock.requestPairingCode(number)
        console.log("Pairing Code:", code)
    }

    sock.ev.on("connection.update", ({ connection, lastDisconnect }) => {
        if (connection === "open") {
            console.log("Bot berhasil terhubung")
        }

        if (connection === "close") {
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== 401
            console.log("Koneksi terputus")
            if (shouldReconnect) {
                console.log("Mencoba reconnect...")
                startBot()
            }
        }
    })

    sock.ev.on('messages.upsert', async ({ messages }) => {
        const msgObj = messages[0]
        if (!msgObj.message) return
        if (msgObj.key.fromMe) return

        const msg = msgObj.message
        const text =
            msg.conversation ||
            msg.extendedTextMessage?.text ||
            msg.imageMessage?.caption ||
            msg.videoMessage?.caption ||
            ""

        if (!text.startsWith("!")) return

        const parts = text.trim().split(/\s+/)
        const cmd = parts[0].slice(1).toLowerCase()
        const args = parts.slice(1)  // args tetap array
        const sender = msgObj.key.remoteJid
        const context = { sender, args, textMessage: text }

        // Terminal log
        const listColor = ["red","green","yellow","blue","magenta","cyan","white"]
        const randomColor = listColor[Math.floor(Math.random() * listColor.length)] 

        console.log(
            chalk.yellow.bold('Credit: @irfikri0204'),
            chalk.green.bold('[Whatsapp]'),
            chalk[randomColor](msgObj.pushName || "User"),
            chalk[randomColor](' : '),
            chalk.white(cmd)
        )
        // --- Cari command ---
        let commandFile = commands[cmd]  // cek nama
        if (!commandFile) {
            // cek alias
            commandFile = Object.values(commands).find(c => c.aliases?.includes(cmd))
        }

        if (commandFile) {
            try {
                await commandFile.execute(sock, msgObj, context)
            } catch(err) {
                console.log("Command error:", err)
            }
        }
    })
}

module.exports = { startBot }
