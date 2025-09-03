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


// --- START: ADDED FLAG HELPERS ---
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
// --- END: ADDED FLAG HELPERS ---


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

        // 3. --- Process Each Player's Stats ---
        for (const key in profiles) {
            const profile = profiles[key];
            const stats = profile.stats;

            if (stats && stats.gamesPlayed > 0) {
                const winPct = (stats.wins / stats.gamesPlayed) * 100;
                const avgGuesses = stats.wins > 0 ? (stats.totalGuesses / stats.wins) : 0;

                // --- NEW: Calculate Hard Mode Win Percentage ---
                let hardModeWins = 0;
                let totalOfficialWins = 0;
                const currentPlayerName = profile.original || key;

                if (profile.playedGames) {
                    for (const gameId in profile.playedGames) {
                        const game = profile.playedGames[gameId];
        
                        // --- THIS IS THE CORRECTED, ROBUST CHECK ---
                        // It now checks that the 'host' field EXISTS and is not the current player.
                        if (game.status === 'won' && game.host && game.host !== currentPlayerName) {
                            totalOfficialWins++;
                            if (game.wasHardMode !== false) {
                                hardModeWins++;
                            }
                        }
                    }
                }

                const hardModePct = totalOfficialWins > 0 ? (hardModeWins / totalOfficialWins) * 100 : 0;
                // --- END OF NEW LOGIC ---

                players.push({
                    username: profile.original || key,
                    nativeLanguage: profile.nativeLanguage || null,
                    gamesPlayed: stats.gamesPlayed,
                    wins: stats.wins,
                    winPct: winPct,
                    avgGuesses: avgGuesses,
                    hardModePct: hardModePct,
                    badges: profile.badges || {},
                    lastGameTrend: stats.lastGameTrend || null
                });
            }
        }

        // 4. --- ✅ RANK THE PLAYERS (NEW RANKING LOGIC) ---
        players.sort((a, b) => {
            // 1. Primary: Sort by Total Wins (highest first)
            if (b.wins !== a.wins) {
                return b.wins - a.wins;
            }

            // 2. Secondary: Sort by Win Percentage (highest first)
            if (b.winPct !== a.winPct) {
                return b.winPct - a.winPct;
            }

            // 3. Tertiary: Sort by Hard Mode Percentage (highest first)
            if (b.hardModePct !== a.hardModePct) {
                return b.hardModePct - a.hardModePct;
            }

            // 4. Final Tie-breaker: Sort by Average Guesses (lowest first)
            if (a.avgGuesses !== b.avgGuesses) {
                if (a.avgGuesses === 0) return 1; // Pushes players with 0 wins down
                if (b.avgGuesses === 0) return -1;
                return a.avgGuesses - b.avgGuesses;
            }

            // Return 0 if players are perfectly equal
            return 0;
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
                    <th class="col-stats">Wins</th>
                    <th class="col-trend"></th>
                    <th class="col-stats">Played</th>
                    <th class="col-stats">Win %</th>
                    <th class="col-avg-guesses">Avg. Guesses</th>
                    <th class="col-stats">Hard Mode %</th> </tr>
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

        let flagHTML = '';
        if (player.nativeLanguage) {
            const countryCode = languageToCountryCode[player.nativeLanguage.toLowerCase()];
            if (countryCode) {
                flagHTML = getFlagEmoji(countryCode);
            }
        }

        let trendHTML = '';
        if (player.lastGameTrend === 'up') {
            trendHTML = `<span style="color: green;" title="Ranking Up">▲</span>`;
        } else if (player.lastGameTrend === 'down') {
            trendHTML = `<span style="color: red;" title="Ranking Down">▼</span>`;
        }

        tableHTML += `
            <tr>
                <td class="col-rank">${index + 1}</td>
                <td class="col-flag">${flagHTML}</td>
                <td class="col-player" title="${player.username}">${player.username}</td>
                <td class="col-badges">${badgesHTML || '-'}</td>
                <td class="col-stats">${player.wins}</td>
                <td class="col-trend">${trendHTML}</td>
                <td class="col-stats">${player.gamesPlayed}</td>
                <td class="col-stats">${player.winPct.toFixed(1)}%</td>
                <td class="col-avg-guesses">${player.avgGuesses > 0 ? player.avgGuesses.toFixed(2) : '-'}</td>
                <td class="col-stats">${player.wins > 0 ? player.hardModePct.toFixed(1) + '%' : '-'}</td>
            </tr>
        `;
    });

    tableHTML += '</tbody></table>';
    container.innerHTML = tableHTML;
}

document.addEventListener('DOMContentLoaded', () => {
  displayGlobalScoreboard();
});

async function displayWeeklyWinners() {
    const winnersRef = database.ref('weeklyWinners/current');
    try {
        const snapshot = await winnersRef.once('value');
        if (!snapshot.exists()) {
            console.log("No weekly winners found yet.");
            return;
        }
        const winners = snapshot.val();

        const populateCard = (id, data) => {
            const nameEl = document.querySelector(`#${id} .winner-name`);
            const statEl = document.querySelector(`#${id} .winner-stat`);
            if (nameEl && statEl && data) {
                nameEl.textContent = data.username;
                statEl.textContent = data.value;
            }
        };

        populateCard('weekly-guesser', winners.bestGuesser);
        populateCard('weekly-host', winners.mostHosted);
        populateCard('weekly-improver', winners.bestImprovement);
        populateCard('weekly-butterfly', winners.socialButterfly);

    } catch (error) {
        console.error("Could not load weekly winners:", error);
    }
}

// In scoreboard.js, make sure to call the function
document.addEventListener('DOMContentLoaded', () => {
  displayGlobalScoreboard();
  displayWeeklyWinners(); // Call the new function
});
