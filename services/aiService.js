// services/aiService.js
// Simulasi ringkasan konten Islami
// Bisa diganti dengan API OpenAI atau AI lain jika mau lebih canggih
const chalk = require('chalk');

/**
 * Ringkas teks Islami menjadi versi singkat
 * @param {string} text
 * @returns {Promise<string>}
 */
async function summarizeIslamicContent(text) {
    try {
        if (!text || text.length === 0) return text;
        // Sederhanakan: ambil kalimat pertama atau 100 karakter pertama
        let summary = text.split('. ')[0];
        if (summary.length > 100) summary = summary.slice(0, 100) + '...';
        return summary;
    } catch (e) {
        console.error(chalk.red('[AI SERVICE] summarize error:'), e.message);
        return text;
    }
}

module.exports = {
    summarizeIslamicContent
};
