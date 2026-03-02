// services/ramadanService.js
const axios = require('axios');
const chalk = require('chalk');
const { summarizeIslamicContent } = require('./aiService');

// Default Location
const DEFAULT_CITY = 'Makassar';
const DEFAULT_COUNTRY = 'Indonesia';

/**
 * Ambil jadwal sholat dari Aladhan API
 */
async function getPrayerTimes(city = DEFAULT_CITY, country = DEFAULT_COUNTRY) {
    try {
        const date = new Date();
        const url = `https://api.aladhan.com/v1/timingsByCity/${date.getDate()}-${date.getMonth() + 1}-${date.getFullYear()}?city=${city}&country=${country}&method=20`;

        const response = await axios.get(url);
        if (response.data && response.data.code === 200) {
            const data = response.data.data;
            return {
                success: true,
                timings: data.timings,
                date: data.date,
                meta: data.meta
            };
        }
        throw new Error('API Error');
    } catch (e) {
        console.error(chalk.red('[RAMADAN] Prayer API Error:'), e.message);
        return { success: false, error: e.message };
    }
}

/**
 * Ambil ayat acak dari EQuran.id
 */
async function getRandomAyat() {
    try {
        const surah = Math.floor(Math.random() * 114) + 1;
        const url = `https://equran.id/api/v2/surat/${surah}`;
        const response = await axios.get(url);

        if (response.data && response.data.code === 200) {
            const data = response.data.data;
            const ayatCount = data.ayat.length;
            const ayatIndex = Math.floor(Math.random() * ayatCount);
            const ayat = data.ayat[ayatIndex];

            return {
                success: true,
                type: 'ayat',
                content: {
                    surah: data.namaLatin,
                    nomor: ayat.nomorAyat,
                    ayat: ayat.nomorAyat,
                    arab: ayat.teksArab,
                    latin: ayat.teksLatin,
                    terjemahan: await summarizeIslamicContent(ayat.teksIndonesia)
                }
            };
        }
        throw new Error('API Error');
    } catch (e) {
        console.error(chalk.red('[RAMADAN] Ayat API Error:'), e.message);
        return { success: false, error: e.message };
    }
}

/**
 * Ambil hadits acak dari GadingDev API
 */
async function getRandomHadith() {
    try {
        const books = ['muslim', 'bukhari', 'tirmidzi', 'nasai', 'abu-daud', 'ibnu-majah', 'ahmad', 'malik'];
        const book = books[Math.floor(Math.random() * books.length)];
        const rangeStart = Math.floor(Math.random() * 100) + 1;
        const rangeEnd = rangeStart + 10;
        const url = `https://api.hadith.gading.dev/books/${book}?range=${rangeStart}-${rangeEnd}`;

        const response = await axios.get(url);
        if (response.data && response.data.code === 200) {
            const data = response.data.data;
            const hadiths = data.hadiths;
            if (hadiths.length > 0) {
                const randomHadith = hadiths[Math.floor(Math.random() * hadiths.length)];
                return {
                    success: true,
                    type: 'hadith',
                    content: {
                        perawi: data.name,
                        nomor: randomHadith.number,
                        arab: randomHadith.arab,
                        terjemahan: await summarizeIslamicContent(randomHadith.id)
                    }
                };
            }
        }
        throw new Error('API Error or Empty');
    } catch (e) {
        return getRandomAyat();
    }
}

/**
 * Randomly pilih ayat (60%) atau hadith (40%)
 */
async function getRandomContent() {
    if (Math.random() > 0.4) {
        return await getRandomAyat();
    } else {
        return await getRandomHadith();
    }
}

module.exports = {
    getPrayerTimes,
    getRandomAyat,
    getRandomHadith,
    getRandomContent
};
