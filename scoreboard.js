// scoreboard.js

// 1. --- Firebase Configuration ---
const firebaseConfig = {
  apiKey: "AIzaSyDGepZP9hu3hHAL1wfrp4gjIurEPLPUbaw",
  authDomain: "woertle-7dc73.firebaseapp.com",
  databaseURL: "https://woertle-7dc73-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "woertle-7dc73",
  storageBucket: "woertle-7dc73.firebasestorage.app",
  messagingSenderId: "97063588719",
  appId: "1:97063588719:web:dc734f9c0772d49e5b0e9a"
};

firebase.initializeApp(firebaseConfig);
const database = firebase.database();


// --- START: ADD FLAG HELPERS ---
const languageToCountryCode = {
  bulgarian: 'BG', croatian: 'HR', czech: 'CZ', danish: 'DK',
  dutch: 'NL', english: 'GB', estonian: 'EE', finnish: 'FI',
  french: 'FR', german: 'DE', greek: 'GR', hungarian: 'HU',
  irish: 'IE', italian: 'IT', latvian: 'LV', lithuanian: 'LT',
  maltese: 'MT', polish: 'PL', portuguese: 'PT', romanian: 'RO',
  slovak: 'SK', slovenian: 'SI', spanish: 'ES', swedish: 'SE',
  norwegian: 'NO', russian: 'RU', turkish: 'TR'
};

function getFlagEmoji(countryCode) {
  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map(char => 127397 + char.charCodeAt());
  return String.fromCodePoint(...codePoints);
}
// --- END: ADD FLAG HELPERS ---


// 2. --- Main Function to Fetch and Display Data ---
async function displayGlobalScoreboard() {
    const container = document.getElementById('scoreboard-container');
    const userProfilesRef = database.ref('userProfiles');

    try {
        const snapshot = await userProfilesRef.once('value');
        if (!snapshot.exists()) {
            container.innerHTML = '<p>No player data found.</p>';
            return;
        }

        const profiles = snapshot.val();
        const players = [];

        // 3. --- Process Each Player's Stats & BADGES ---
        for (const key in profiles) {
            const profile = profiles[key];
            const stats = profile.stats;

            if (stats && stats.gamesPlayed > 0) {
                const winPct = (stats.wins / stats.gamesPlayed) * 100;
                const avgGuesses = stats.wins > 0 ? (stats.totalGuesses / stats.wins) : 0;

                players.push({
                    username: key.replace(/_/g, ''),
                    // --- MODIFIED: Fetch native language ---
                    nativeLanguage: profile.nativeLanguage || null,
                    gamesPlayed: stats.gamesPlayed,
                    wins: stats.wins,
                    winPct: winPct,
                    avgGuesses: avgGuesses,
                    badges: profile.badges || {}
                });
            }
        }

        // 4. --- Rank the Players ---
        players.sort((a, b) => {
            if (b.winPct !== a.winPct) return b.winPct - a.winPct;
            if (a.avgGuesses !== b.avgGuesses) {
                if (a.avgGuesses === 0) return 1;
                if (b.avgGuesses === 0) return -1;
                return a.avgGuesses - b.avgGuesses;
            }
            return b.wins - a.wins;
        });
        
        // 5. --- Generate and Display the HTML Table ---
        renderTable(players, container);

    } catch (error) {
        console.error("Error fetching scoreboard data:", error);
        container.innerHTML = '<p>Could not load scoreboard data.</p>';
    }
}

// Helper function to create the table HTML
function renderTable(players, container) {
    let tableHTML = `
        <table class="scoreboard-table">
            <thead>
                <tr>
                    <th class="col-rank">Rank</th>
                    <th class="col-flag"></th> 
                    <th class="col-player">Player</th>
                    <th class="col-badges">Badges</th>
                    <th class="col-stats">Games</th>
                    <th class="col-stats">Wins</th>
                    <th class="col-stats">Win %</th>
                    <th class="col-stats col-avg-guesses">Avg. Guesses</th>
                </tr>
            </thead>
            <tbody>
    `;

    players.forEach((player, index) => {
        let badgesHTML = '';
        if (player.badges) {
            for (const badgeId in player.badges) {
                if (player.badges[badgeId] === true && BADGE_DEFINITIONS[badgeId]) {
                    const badge = BADGE_DEFINITIONS[badgeId];
                    const emoji = badge.name.split(' ').pop();
                    badgesHTML += `<span class="badge-icon" title="${badge.name}: ${badge.description}">${emoji}</span>`;
                }
            }
        }

        // --- START: MODIFIED FLAG LOGIC ---
        // The flag is now generated into its own variable.
        let flagHTML = '';
        if (player.nativeLanguage) {
            const countryCode = languageToCountryCode[player.nativeLanguage.toLowerCase()];
            if (countryCode) {
                flagHTML = getFlagEmoji(countryCode);
            }
        }
        // --- END: MODIFIED FLAG LOGIC ---

        tableHTML += `
            <tr>
                <td class="col-rank">${index + 1}</td>
                <td class="col-flag">${flagHTML}</td>
                <td class="col-player" title="${player.username}">${player.username}</td>
                <td class="col-badges">${badgesHTML || '-'}</td>
                <td class="col-stats">${player.gamesPlayed}</td>
                <td class="col-stats">${player.wins}</td>
                <td class="col-stats">${player.winPct.toFixed(1)}%</td>
                <td class="col-stats col-avg-guesses">${player.avgGuesses > 0 ? player.avgGuesses.toFixed(2) : '-'}</td>
            </tr>
        `;
    });

    tableHTML += '</tbody></table>';
    container.innerHTML = tableHTML;
}

document.addEventListener('DOMContentLoaded', () => {
  displayGlobalScoreboard();
});
