const { exec } = require('child_process')
const path = require('path')
const fs = require('fs')
const util = require('util')
const axios = require('axios')

const execPromise = util.promisify(exec)

const PLATFORM_CONFIG = [
    { name: 'TikTok', hosts: ['tiktok.com'], endpoint: 'tiktok' },
    { name: 'Facebook', hosts: ['facebook.com', 'fb.watch'], endpoint: 'facebook' },
    { name: 'Instagram', hosts: ['instagram.com'], endpoint: 'instagram' },
    { name: 'Twitter', hosts: ['twitter.com','x.com'], endpoint: 'twitter' },
    { name: 'YouTube', hosts: ['youtube.com','youtu.be'], endpoint: 'youtube' },
]

module.exports = {

    name: "dl",
    aliases: ["download","ytdl"],
    description: "Download media dari berbagai platform",

    async execute(sock, msgObj, context) {

        const sender = context.sender
        const args = context.args

        const url = args.trim()

        if(!url){
            return sock.sendMessage(sender,{
                text:"Usage: !dl [url]"
            },{ quoted: msgObj })
        }

        const tempDir = path.join(process.cwd(),"temp")
        if(!fs.existsSync(tempDir)) fs.mkdirSync(tempDir)

        const filename = `dl_${Date.now()}.mp4`
        const outputPath = path.join(tempDir,filename)

        try{

            await sock.sendMessage(sender,{
                react:{ text:"⏳", key: msgObj.key }
            })

            // =====================
            // API DOWNLOADER
            // =====================

            const platform = PLATFORM_CONFIG.find(p =>
                p.hosts.some(h => url.includes(h))
            )

            if(platform){

                try{

                    const apiKey = process.env.GIMITA_API_KEY

                    const res = await axios.get(
                        `https://api.gimita.id/api/downloader/${platform.endpoint}`,
                        {
                            params:{ url },
                            headers:{
                                Authorization:`Bearer ${apiKey}`
                            },
                            timeout:45000
                        }
                    )

                    const data = res.data?.data

                    if(data){

                        const videoUrl =
                            data.video?.hd ||
                            data.video?.sd ||
                            data.video?.url ||
                            data.video

                        if(videoUrl){

                            const video = await axios.get(videoUrl,{
                                responseType:"arraybuffer"
                            })

                            await sock.sendMessage(sender,{
                                video:Buffer.from(video.data),
                                caption:`✅ ${platform.name} Download`
                            },{ quoted: msgObj })

                            await sock.sendMessage(sender,{
                                react:{ text:"✅", key: msgObj.key }
                            })

                            return
                        }
                    }

                }catch(err){
                    console.log("API Failed:",err.message)
                }

            }

            // =====================
            // FALLBACK YT-DLP
            // =====================

            const cmd = `yt-dlp -f mp4 --no-playlist --max-filesize 50M -o "${outputPath}" "${url}"`

            await execPromise(cmd)

            if(fs.existsSync(outputPath)){

                await sock.sendMessage(sender,{
                    video: fs.readFileSync(outputPath),
                    caption:`✅ Nih cuy videonya`
                },{ quoted: msgObj })

                await sock.sendMessage(sender,{
                    react:{ text:"✅", key: msgObj.key }
                })

            }else{

                throw new Error("Download gagal")

            }

        }catch(err){

            console.log(err)

            await sock.sendMessage(sender,{
                text:`❌ Gagal download\n${err.message}`
            },{ quoted: msgObj })

            await sock.sendMessage(sender,{
                react:{ text:"❌", key: msgObj.key }
            })

        }finally{

            if(fs.existsSync(outputPath)){
                fs.unlinkSync(outputPath)
            }

        }

    }
}
