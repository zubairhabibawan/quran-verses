const axios = require('axios');

async function getAccessToken(baseUrl, clientId, clientSecret) {

    const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

    try {
        const response = await axios({
            method: 'post',
            url: `${baseUrl}oauth2/token`,
            headers: {
                'Authorization': `Basic ${auth}`,
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            data: 'grant_type=client_credentials&scope=content'
        });

        return response.data.access_token;
    } catch (error) {
        console.error('Error getting access token:', error);
    }
}

// Surah data with verse counts
const surahData = {
    1: 7,
    2: 286,
    3: 200,
    4: 176,
    5: 120,
    6: 165,
    7: 206,
    8: 75,
    9: 129,
    10: 109,
    11: 123,
    12: 111,
    13: 43,
    14: 52,
    15: 99,
    16: 128,
    17: 111,
    18: 110,
    19: 98,
    20: 135,
    21: 112,
    22: 78,
    23: 118,
    24: 64,
    25: 77,
    26: 227,
    27: 93,
    28: 88,
    29: 69,
    30: 60,
    31: 34,
    32: 30,
    33: 73,
    34: 54,
    35: 45,
    36: 83,
    37: 182,
    38: 88,
    39: 75,
    40: 85,
    41: 54,
    42: 53,
    43: 89,
    44: 59,
    45: 37,
    46: 35,
    47: 38,
    48: 29,
    49: 18,
    50: 45,
    51: 60,
    52: 49,
    53: 62,
    54: 55,
    55: 78,
    56: 96,
    57: 29,
    58: 22,
    59: 24,
    60: 13,
    61: 14,
    62: 11,
    63: 11,
    64: 18,
    65: 12,
    66: 12,
    67: 30,
    68: 52,
    69: 52,
    70: 44,
    71: 28,
    72: 28,
    73: 20,
    74: 56,
    75: 40,
    76: 31,
    77: 50,
    78: 40,
    79: 46,
    80: 42,
    81: 29,
    82: 19,
    83: 36,
    84: 25,
    85: 22,
    86: 17,
    87: 19,
    88: 26,
    89: 30,
    90: 20,
    91: 15,
    92: 21,
    93: 11,
    94: 8,
    95: 8,
    96: 19,
    97: 5,
    98: 8,
    99: 8,
    100: 11,
    101: 11,
    102: 8,
    103: 3,
    104: 9,
    105: 5,
    106: 4,
    107: 7,
    108: 3,
    109: 6,
    110: 3,
    111: 5,
    112: 4,
    113: 5,
    114: 6
};

// Function to fetch all verses from a specific surah
async function getSurahVerses(baseUrl, accessToken, clientId, surahNumber, verseCount, existingAyahs = {}) {
    console.log(`Fetching Surah ${surahNumber} with ${verseCount} verses...`);

    const allVerses = [];

    for (let verseNumber = 1; verseNumber <= verseCount; verseNumber++) {
        const verseKey = `${surahNumber}:${verseNumber}`;

        // Check if this ayah already exists in our saved data
        if (existingAyahs[verseKey]) {
            console.log(`Ayah ${verseKey} already exists, skipping...`);
            allVerses.push(existingAyahs[verseKey]);
            continue;
        }

        console.log(`Fetching verse ${verseKey}...`);

        try {
            const verseData = await getQuranVerses(baseUrl, accessToken, clientId, verseKey);
            if (verseData) {
                allVerses.push(verseData);

                // Save this ayah immediately to the JSON file
                await saveAyahToFile(verseKey, verseData);
            }

            // Add a small delay to avoid overwhelming the API
            await new Promise(resolve => setTimeout(resolve, 100));

        } catch (error) {
            console.error(`Error fetching verse ${verseKey}:`, error.message);
        }
    }

    return allVerses;
}

// Function to save a single ayah to the JSON file
async function saveAyahToFile(verseKey, verseData) {
    const fs = require('fs');
    const fileName = 'all_ayahs.json';

    try {
        let allAyahs = {};

        // Read existing data if file exists
        if (fs.existsSync(fileName)) {
            const fileContent = fs.readFileSync(fileName, 'utf8');
            allAyahs = JSON.parse(fileContent);
        }

        // Add the new ayah
        allAyahs[verseKey] = verseData;

        // Write back to file
        fs.writeFileSync(fileName, JSON.stringify(allAyahs, null, 2));
        console.log(`✓ Saved ayah ${verseKey} to ${fileName}`);

    } catch (error) {
        console.error(`Error saving ayah ${verseKey}:`, error.message);
    }
}

// Function to load existing ayahs from file
function loadExistingAyahs() {
    const fs = require('fs');
    const fileName = 'all_ayahs.json';

    if (fs.existsSync(fileName)) {
        try {
            const fileContent = fs.readFileSync(fileName, 'utf8');
            const allAyahs = JSON.parse(fileContent);
            console.log(`Loaded ${Object.keys(allAyahs).length} existing ayahs from ${fileName}`);
            return allAyahs;
        } catch (error) {
            console.error('Error loading existing ayahs:', error.message);
        }
    }

    return {};
}

// Function to get next ayah to process
function getNextAyahToProcess(existingAyahs) {
    for (const [surahNumber, verseCount] of Object.entries(surahData)) {
        for (let verseNumber = 1; verseNumber <= verseCount; verseNumber++) {
            const verseKey = `${surahNumber}:${verseNumber}`;
            if (!existingAyahs[verseKey]) {
                return { surahNumber: parseInt(surahNumber), verseNumber, verseKey };
            }
        }
    }
    return null; // All ayahs are processed
}

// Function to fetch all verses from all surahs with resume capability
async function getAllQuranVerses(baseUrl, accessToken, clientId) {
    console.log('Starting to fetch all Quran verses with resume capability...');

    // Load existing ayahs
    const existingAyahs = loadExistingAyahs();

    // Find the next ayah to process
    const nextAyah = getNextAyahToProcess(existingAyahs);

    if (!nextAyah) {
        console.log('All ayahs have been processed!');
        return existingAyahs;
    }

    console.log(`Resuming from ayah ${nextAyah.verseKey}`);

    // Process from the next ayah onwards
    for (const [surahNumber, verseCount] of Object.entries(surahData)) {
        const currentSurahNumber = parseInt(surahNumber);

        // Skip surahs that are completely processed
        if (currentSurahNumber < nextAyah.surahNumber) {
            console.log(`Skipping Surah ${surahNumber} (already completed)`);
            continue;
        }

        console.log(`\n=== Processing Surah ${surahNumber} ===`);

        try {
            const surahVerses = await getSurahVerses(baseUrl, accessToken, clientId, currentSurahNumber, verseCount, existingAyahs);

            // Add a longer delay between surahs
            await new Promise(resolve => setTimeout(resolve, 1000));

        } catch (error) {
            console.error(`Error fetching Surah ${surahNumber}:`, error.message);
        }
    }

    console.log('\nAll ayahs have been processed and saved to all_ayahs.json');
    return existingAyahs;
}

// Function to generate surah files from all_ayahs.json
function generateSurahFiles() {
    const fs = require('fs');
    const fileName = 'all_ayahs.json';

    if (!fs.existsSync(fileName)) {
        console.log('all_ayahs.json not found. Please run the fetch process first.');
        return;
    }

    try {
        const fileContent = fs.readFileSync(fileName, 'utf8');
        const allAyahs = JSON.parse(fileContent);

        // Group ayahs by surah
        const surahs = {};

        for (const [verseKey, verseData] of Object.entries(allAyahs)) {
            const [surahNumber] = verseKey.split(':');

            if (!surahs[surahNumber]) {
                surahs[surahNumber] = [];
            }

            surahs[surahNumber].push(verseData);
        }

        // Save each surah file
        for (const [surahNumber, verses] of Object.entries(surahs)) {
            const surahFileName = `surah_${surahNumber}.json`;
            fs.writeFileSync(surahFileName, JSON.stringify({ surah: surahNumber, verses }, null, 2));
            console.log(`Generated ${surahFileName} with ${verses.length} verses`);
        }

        // Save complete Quran file
        fs.writeFileSync('complete_quran.json', JSON.stringify(surahs, null, 2));
        console.log('Generated complete_quran.json');

    } catch (error) {
        console.error('Error generating surah files:', error.message);
    }
}

// Modify getQuranVerses to return data instead of just logging
async function getQuranVerses(baseUrl, accessToken, clientId, verseKey) {
    console.log(`Fetching verse ${verseKey}...`);
    let url = `${baseUrl}content/api/v4/verses/by_key/${verseKey}` // Added 'content/' back to match working structure
    console.log(url)
        // Get English word-level translations
    let configEnglish = {
        method: 'get',
        maxBodyLength: Infinity,
        url: url,
        headers: {
            'Accept': 'application/json',
            'x-auth-token': accessToken,
            'x-client-id': clientId
        },
        params: {
            words: true,
            language: "en", // English word-level translations
            translations: "131,6", // 131 = English (Sahih International), 6 = Urdu (Fateh Muhammad Jalandhri)
            translation_fields: "text,language_name",
            fields: "chapter_id,text_indopak,text_imlaei_simple,text_imlaei,text_uthmani,text_uthmani_simple,text_uthmani_tajweed,text_qpc_hafs,qpc_uthmani_hafs,text_qpc_nastaleeq_hafs,text_qpc_nastaleeq,text_indopak_nastaleeq,image_url,image_width,code_v1,code_v2,page_number,v1_page,v2_page",
            word_fields: "verse_id,chapter_id,text_uthmani,text_indopak,text_imlaei_simple,text_imlaei,text_uthmani_simple,text_uthmani_tajweed,text_qpc_hafs,verse_key,location,code_v1,code_v2,v1_page,v2_page,line_number,line_v2,line_v1"
        }
    };

    // Get Urdu word-level translations
    let configUrdu = {
        method: 'get',
        maxBodyLength: Infinity,
        url: url,
        headers: {
            'Accept': 'application/json',
            'x-auth-token': accessToken,
            'x-client-id': clientId
        },
        params: {
            words: true,
            language: "ur", // Urdu word-level translations
            translations: "131,6", // 131 = English (Sahih International), 6 = Urdu (Fateh Muhammad Jalandhri)
            translation_fields: "text,language_name",
            fields: "chapter_id,text_indopak,text_imlaei_simple,text_imlaei,text_uthmani,text_uthmani_simple,text_uthmani_tajweed,text_qpc_hafs,qpc_uthmani_hafs,text_qpc_nastaleeq_hafs,text_qpc_nastaleeq,text_indopak_nastaleeq,image_url,image_width,code_v1,code_v2,page_number,v1_page,v2_page",
            word_fields: "verse_id,chapter_id,text_uthmani,text_indopak,text_imlaei_simple,text_imlaei,text_uthmani_simple,text_uthmani_tajweed,text_qpc_hafs,verse_key,location,code_v1,code_v2,v1_page,v2_page,line_number,line_v2,line_v1"
        }
    };

    try {
        // Make both API calls
        const [englishResponse, urduResponse] = await Promise.all([
            axios(configEnglish),
            axios(configUrdu)
        ]);

        // Combine the data
        const englishData = englishResponse.data;
        const urduData = urduResponse.data;

        // Merge word translations
        const combinedVerse = {
            ...englishData.verse,
            words: englishData.verse.words.map((englishWord, index) => {
                const urduWord = urduData.verse.words[index];
                // Remove redundant translation and transliteration fields
                const { translation, transliteration, ...wordWithoutTranslation } = englishWord;
                return {
                    ...wordWithoutTranslation,
                    translation_en: englishWord.translation,
                    translation_ur: urduWord.translation,
                    transliteration: englishWord.transliteration,
                };
            })
        };

        return { verse: combinedVerse };
    } catch (error) {
        console.log('Error:', error.message);
        return null;
    }
}

async function main() {
    let baseUrl = 'https://oauth2.quran.foundation/';
    let verseBaseURL = 'https://apis.quran.foundation/'; // Changed from api.quran.foundation to apis.quran.foundation
    let clientId = '3ef0dfc4-8c9d-40df-af25-273892579217';
    let clientSecret = '..JxsWKw~Oj6hUUuTLijT-hMKS';
    let accessToken = "eyJhbGciOiJSUzI1NiIsImtpZCI6ImY5MzAxZjgwLTdkY2QtNGNkMi04NWZlLTJjNWM5NjBhYTA2OSIsInR5cCI6IkpXVCJ9.eyJhdWQiOltdLCJjbGllbnRfaWQiOiIzZWYwZGZjNC04YzlkLTQwZGYtYWYyNS0yNzM4OTI1NzkyMTciLCJleHAiOjE3NTQyMDcyMzQsImV4dCI6e30sImlhdCI6MTc1NDIwMzYzNCwiaXNzIjoiaHR0cHM6Ly9vYXV0aDIucXVyYW4uZm91bmRhdGlvbiIsImp0aSI6ImYyNWU3OWI3LTA4N2MtNDdlMy04MDUyLWM5OTFhNDhjYjVlMCIsIm5iZiI6MTc1NDIwMzYzNCwic2NwIjpbImNvbnRlbnQiXSwic3ViIjoiM2VmMGRmYzQtOGM5ZC00MGRmLWFmMjUtMjczODkyNTc5MjE3In0.wnZ5dJznGpgJQawqQzqyXO-XYLGJF3IkYOx74W9qmp6ZrAasui-a-T5AjAR16SUYfZEdtU1ktKFrnFMqdaCyb1b6TNGku3GU0kuf--ip559yoZ9AFpqrG3lAM82ynWJ8kW4Us4QS-tf0nAU5dskTRrW5To5cDCWoea3wAXK7ZoVJDcXiNsBmXdIbqrhZjyW_fWiOALSrG80ols1tIjH9AfVyY6amQKnpNArynvUTIlqpw0BeUPSLZ9yI9ejtiF1rHF-pijVGR8XQ_Ps9wgOIb-upPFxcKMcw9CFUP79uxwIQ6yTtPX3zFIrgo_xiHDFKkOow7hlEu63Kk6TSh6ZoLeKAtjowYmeoQ0Q4S2wsR-URC5AqM5ePCOFVcFrv8Z18yLS3PQH0K8IQsdTiuFWMr4eM8hWjyc7NCA_9upMAHlRitqGRn1X0BG15A9wzpVB3BtxDX-7vd6ywU7F8GSpvMonoXD6qxw3qHNE5SFj45ueimJXUjFSEBEXsukeRE9S7JS-ug-fe1xUke3C_i9yXDxTtRJnkX6DIktdLQyWs-JX7jv3WJG3_9SYviSp1lcwroXUjgmG95UjKXH4c3s4AFbPVfOb1L9h6sp41HInC50oQf0HlA4LXNs15K7bSfUgqzhJlninzL9HFkKHP6OShn3ylOWfaGErTtBlAYzmd3TQ"
        // accessToken = await getAccessToken(baseUrl, clientId, clientSecret);
        // console.log(accessToken);

    // Choose one of these options:

    // Option 1: Fetch a single verse (for testing)
    await getQuranVerses(verseBaseURL, accessToken, clientId, "4:5");

    // Option 2: Fetch a specific surah
    // await getSurahVerses(verseBaseURL, accessToken, clientId, 1, 7); // Surah 1 with 7 verses

    // Option 3: Fetch all Quran verses with resume capability (this will take a very long time!)
    // await getAllQuranVerses(verseBaseURL, accessToken, clientId);

    // Option 4: Generate surah files from all_ayahs.json (run this after fetching is complete)
    // generateSurahFiles();
}
main();