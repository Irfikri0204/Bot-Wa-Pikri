// commands/ramadhan.js
const { getPrayerTimes, getRandomContent } = require('../services/ramadhanService');
const { jidNormalizedUser } = require('@whiskeysockets/baileys');
const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

// Resolve relative to this file so it works no matter the process cwd
const specialUsersPath = path.join(__dirname, '..', 'data', 'user.json'); // file special users

function readJSONSync(filePath) {
    try {
        return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch {
        return [];
    }
}

module.exports = {
    name: 'ramadan',
    aliases: ['imsak', 'imsakiyah', 'buka', 'berbuka', 'sholat', 'jadwalsholat', 'sahur', 'puasa'],
    description: 'Fitur Ramadhan: Jadwal Imsak, Buka Puasa, dan Pengingat',

    async execute(sock, message, context) {
        const { remoteJid } = message.key;
        const { args, textMessage } = context;

        const cmdName = textMessage.split(' ')[0].replace(/^!/, '').toLowerCase();
        const city = args && args.length > 0 ? args.join(' ') : 'Makassar';

        // Ambil nomor murni pengirim (handle group + device suffixes)
        // Prefer alt JIDs (full WhatsApp format) if Baileys provides them
        const rawJid =
            message.key.participantAlt ||
            message.key.remoteJidAlt ||
            message.key.participant ||
            message.key.remoteJid;
        const normalizedJid = jidNormalizedUser(rawJid);
        const senderNumber = normalizedJid.split('@')[0];

        // Debug dump to see what Baileys gives us
        console.log('[RAMADAN] message.key:', message.key);

        // Cek special user
        const specialUsers = readJSONSync(specialUsersPath);
        // Cocokkan dengan JID alt yang sudah dinormalisasi (bukan hanya nomor)
        const isSpecial = specialUsers.some(entry => jidNormalizedUser(entry) === normalizedJid);

        console.log(`[RAMADAN] Raw JID: ${rawJid}`);
        console.log(`[RAMADAN] Normalized JID: ${normalizedJid}`);
        console.log(`[RAMADAN] Sender Number: ${senderNumber}`);
        console.log(`[RAMADAN] Is Special: ${isSpecial}`);

        try {
            const result = await getPrayerTimes(city);
            if (!result.success) {
                await sock.sendMessage(remoteJid, { text: `⚠️ Gagal mengambil data kota *${city}*.` }, { quoted: message });
                return;
            }

            const t = result.timings;
            const now = new Date();

            const timeToDate = (timeStr) => {
                const [h, m] = timeStr.split(':').map(Number);
                const date = new Date();
                date.setHours(h, m, 0, 0);
                return date;
            };

            // --- COMMAND: !imsak / !imsakiyah ---
            if (['imsak', 'imsakiyah'].includes(cmdName)) {
                const imsakDate = timeToDate(t.Imsak || t.Fajr);
                let text;
                if (imsakDate < now) {
                    text = isSpecial 
                        ? `⏰ Waktu imsak hari ini sudah lewat.\nSemoga lancar puasanya anggiiiii🐱!` 
                        : `⏰ Waktu imsak hari ini sudah lewat.\nSemoga puasanya lancar!`;
                } else {
                    const diff = imsakDate - now;
                    const hours = Math.floor(diff / (1000 * 60 * 60));
                    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                    text = `⏰ Menuju Imsak (${t.Imsak}) dalam *${hours} jam ${mins} menit*.`; 
                }
                await sock.sendMessage(remoteJid, { text }, { quoted: message });
                return;
            }

            // --- COMMAND: !buka / !berbuka / !puasa ---
            if (['buka', 'berbuka', 'puasa'].includes(cmdName)) {
                const maghribDate = timeToDate(t.Maghrib);
                let text;
                if (maghribDate < now) {
                    text = isSpecial
                        ? `🌙 Waktu berbuka (${t.Maghrib}) sudah lewat.\nSelamat berbuka anggiiiii🐱!`
                        : `🌙 Waktu berbuka (${t.Maghrib}) sudah lewat.\nSelamat berbuka!`;
                } else {
                    const diff = maghribDate - now;
                    const hours = Math.floor(diff / (1000 * 60 * 60));
                    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                    text = isSpecial
                        ? `🌙 Berbuka dalam *${hours} jam ${mins} menit*.\nSemangat puasanya anggiiiii🐱!`
                        : `🌙 Berbuka dalam *${hours} jam ${mins} menit*.\nSemangat puasanya!`;
                }
                await sock.sendMessage(remoteJid, { text }, { quoted: message });
                return;
            }

            // --- COMMAND: !sholat / !jadwalsholat ---
            if (['sholat', 'jadwalsholat'].includes(cmdName)) {
                const prayerList = [
                    { name: 'Subuh', time: t.Fajr },
                    { name: 'Dzuhur', time: t.Dhuhr },
                    { name: 'Ashar', time: t.Asr },
                    { name: 'Maghrib', time: t.Maghrib },
                    { name: 'Isya', time: t.Isha }
                ];

                let nextPrayer = null;
                let minDiff = Infinity;

                for (const p of prayerList) {
                    const pDate = timeToDate(p.time);
                    if (pDate > now) {
                        const diff = pDate - now;
                        if (diff < minDiff) {
                            minDiff = diff;
                            nextPrayer = p;
                        }
                    }
                }

                let text;
                if (nextPrayer) {
                    const hours = Math.floor(minDiff / (1000 * 60 * 60));
                    const mins = Math.floor((minDiff % (1000 * 60 * 60)) / (1000 * 60));
                    text = `🕌 Menuju *${nextPrayer.name}* (${nextPrayer.time}) dalam:\n*${hours} jam ${mins} menit*\n\n_Lokasi: ${city}_`;
                } else {
                    text = `🕌 Semua jadwal sholat hari ini di *${city}* sudah selesai.\nSubuh besok: ${t.Fajr}`;
                }
                await sock.sendMessage(remoteJid, { text }, { quoted: message });
                return;
            }

            // --- COMMAND: !sahur ---
            if (['sahur'].includes(cmdName)) {
                const contentRes = await getRandomContent();
                let text = `🥣 *Waktunya Sahur*\n\n`;

                if (contentRes.success) {
                    const c = contentRes.content;
                    if (contentRes.type === 'ayat') {
                        text += `QS. ${c.surah}: ${c.nomor}\n"${c.terjemahan}"`;
                    } else {
                        text += `HR. ${c.perawi}\n"${c.terjemahan}"`;
                    }
                } else {
                    text += `"Makan sahurlah kalian, karena pada sahur itu terdapat keberkahan."`;
                }

                await sock.sendMessage(remoteJid, { text }, { quoted: message });
                return;
            }

        } catch (e) {
            console.error(chalk.red('[RAMADAN] Command Error:'), e);
            await sock.sendMessage(remoteJid, { text: '❌ Terjadi kesalahan saat mengambil data Ramadhan.' }, { quoted: message });
        }
    }
};
