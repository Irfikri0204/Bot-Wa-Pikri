const { downloadMediaMessage } = require('@whiskeysockets/baileys')
const { Sticker } = require('wa-sticker-formatter')
const ffmpeg = require('fluent-ffmpeg')
const fs = require('fs')
const path = require('path')
const crypto = require('crypto')

function compressVideo(buffer) {

    return new Promise((resolve, reject) => {

        const id = crypto.randomBytes(6).toString("hex")

        const input = path.join(__dirname, `../temp/${id}_input.mp4`)
        const output = path.join(__dirname, `../temp/${id}_output.mp4`)

        fs.writeFileSync(input, buffer)

        ffmpeg(input)
            .videoCodec('libx264')
            .size('512x512')
            .fps(12)
            .duration(10)
            .outputOptions([
                '-preset veryfast',
                '-crf 32',
                '-movflags faststart'
            ])
            .save(output)

            .on('end', () => {

                const outBuffer = fs.readFileSync(output)

                fs.unlinkSync(input)
                fs.unlinkSync(output)

                resolve(outBuffer)
            })

            .on('error', (err) => {

                if (fs.existsSync(input)) fs.unlinkSync(input)
                if (fs.existsSync(output)) fs.unlinkSync(output)

                reject(err)
            })
    })
}

module.exports = {
    name: "s",
    description: "Buat sticker dari gambar/video",

    async execute(sock, msgObj, context) {

        const sender = msgObj.key.remoteJid
        const msg = msgObj.message

        const image = msg?.imageMessage
        const video = msg?.videoMessage

        const quoted = msg?.extendedTextMessage?.contextInfo?.quotedMessage
        const quotedImage = quoted?.imageMessage
        const quotedVideo = quoted?.videoMessage

        try {

            await sock.sendMessage(sender,{
                react:{ text:"⏳", key: msgObj.key }
            })

            let mediaMsg
            let isVideo = false

            // kirim langsung
            if (image || video) {

                mediaMsg = msg
                if(video) isVideo = true

            }

            // reply media
            else if (quotedImage || quotedVideo) {

                mediaMsg = quoted
                if(quotedVideo) isVideo = true

            }

            if (!mediaMsg) {
                return sock.sendMessage(sender,{
                    text:"❌ Kirim gambar/video atau reply media dengan !s"
                },{ quoted: msgObj })
            }

            // cek durasi video
            const videoSeconds =
                video?.seconds ||
                quotedVideo?.seconds

            if (isVideo && videoSeconds > 10) {
                return sock.sendMessage(sender,{
                    text:"❌ Video maksimal 10 detik."
                },{ quoted: msgObj })
            }

            let buffer = await downloadMediaMessage(
                { message: mediaMsg },
                "buffer",
                {},
                {
                    logger: console,
                    reuploadRequest: sock.updateMediaMessage
                }
            )

            // compress video
            if (isVideo) {
                buffer = await compressVideo(buffer)
            }

            const sticker = new Sticker(buffer,{
                pack:"Bot Pikri",
                author:"Sticker",
                type:"full",
                quality:70
            })

            const stickerBuffer = await sticker.toBuffer()

            await sock.sendMessage(sender,{
                react:{ text:"✅", key: msgObj.key }
            })

            await sock.sendMessage(sender,{
                sticker: stickerBuffer
            },{ quoted: msgObj })

        } catch(err) {

            console.log("Sticker Error:", err)
            await sock.sendMessage(sender,{
                react:{ text:"❌", key: msgObj.key }
            })
            await sock.sendMessage(sender,{
                text:"❌ Gagal membuat sticker."
            },{ quoted: msgObj })

        }

    }
}
