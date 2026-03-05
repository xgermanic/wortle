document.addEventListener('DOMContentLoaded', () => {
    // Firebase configuration...
    const firebaseConfig = {
      apiKey: "AIzaSyDGepZP9hu3hHAL1wfrp4gjIurEPLPUbaw",
      authDomain: "woertle-7dc73.firebaseapp.com",
      databaseURL: "https://woertle-7dc73-default-rtdb.europe-west1.firebasedatabase.app",
      projectId: "woertle-7dc73",
      storageBucket: "woertle-7dc73.firebasestorage.app",
      messagingSenderId: "97063588719",
      appId: "1:97063588719:web:dc734f9c0772d49e5b0e9a"
    };

    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
    }
    const database = firebase.database();

    // Helper functions for flags...
    const languageToCountryCode = { bulgarian: 'BG', croatian: 'HR', czech: 'CZ', danish: 'DK', dutch: 'NL', english: 'GB', estonian: 'EE', finnish: 'FI', french: 'FR', german: 'DE', greek: 'GR', hungarian: 'HU', irish: 'IE', italian: 'IT', latvian: 'LV', lithuanian: 'LT', polish: 'PL', portuguese: 'PT', romanian: 'RO', slovak: 'SK', slovenian: 'SI', spanish: 'ES', swedish: 'SE', norwegian: 'NO', russian: 'RU', turkish: 'TR' };
    function getFlagEmoji(countryCode) { const codePoints = countryCode.toUpperCase().split('').map(char => 127397 + char.charCodeAt()); return String.fromCodePoint(...codePoints); }

    // Helper functions for URLs...
    function base64Encode(str) { 
        return btoa(unescape(encodeURIComponent(str))); 
    }

    function generateShareURL(word) {
        // This points to your main game page (/wortle/)
        const url = new URL("/wortle/", window.location.origin);
        
        // We only attach the encoded word. 
        // The game page will use this to fetch hints/facts from Firebase.
        url.searchParams.set("w", base64Encode(word));
        
        return url.href;
    }

    // --- UPDATED: Get references to ALL UI elements ---
    const gameListContainer = document.getElementById('game-list');
    const loader = document.getElementById('loader');
    const searchInput = document.getElementById('searchInput');
    const statusFilter = document.getElementById('statusFilter');
    const hostFilter = document.getElementById('hostFilter');
    const languageFilter = document.getElementById('languageFilter'); // ADDED THIS
    const gameCountHeader = document.getElementById('game-count');

    let allGames = [];
    let playedGamesSet = new Set();

    async function fetchAllGames() {
        loader.style.display = 'block';
        gameListContainer.innerHTML = '';

        try {
        const username = localStorage.getItem("gerNordleUsername");
        const sanitizedUsername = username ? username.replace(/[.#$[\]]/g, '_') : null;
        
        playedGamesSet.clear();
        if (sanitizedUsername) {
            const playedGamesRef = database.ref(`userProfiles/${sanitizedUsername}/playedGames`);
            const snapshot = await playedGamesRef.once('value');
            
            if (snapshot.exists()) {
                const games = snapshot.val();
                // ✅ FIX: Only add to the "Revealed" set if the game is actually finished
                Object.entries(games).forEach(([word, data]) => {
                    // Check if 'status' is 'won' or 'lost', OR if 'guesses' > 0 
                    // Adjust this condition based on exactly how you save a "finished" game
                    if (data.status === 'won' || data.status === 'lost') {
                        playedGamesSet.add(word);
                    }
                });
            }
        }

            const gamesRef = database.ref('games');
            const snapshot = await gamesRef.once('value');
            const gamesData = snapshot.val();

            if (!gamesData) {
                gameListContainer.innerHTML = '<p>No games have been created yet!</p>';
                return;
            }

            const gamesArray = Object.keys(gamesData).map(word => {
                const game = gamesData[word];
                if (game.metadata) {
                    const playerCount = Object.keys(game).filter(key => key !== 'metadata' && key !== 'players').length;
                    return { ...game.metadata, word, playerCount };
                }
                return null;
            }).filter(Boolean);

            gamesArray.sort((a, b) => (b.gameNumber || 0) - (a.gameNumber || 0));
            
            allGames = gamesArray;
            populateHostFilter(allGames);
            populateLanguageFilter(allGames); // ADDED THIS CALL
            applyFilters();

        } catch (error) {
            console.error("Error fetching game directory:", error);
            gameListContainer.innerHTML = '<p>Could not load the game directory.</p>';
        } finally {
            loader.style.display = 'none';
        }
    }
    
    function populateHostFilter(games) {
        const hosts = new Set(games.map(game => game.host).filter(Boolean));
        const sortedHosts = [...hosts].sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));

        while (hostFilter.options.length > 1) {
            hostFilter.remove(1);
        }

        sortedHosts.forEach(host => {
            const option = document.createElement('option');
            option.value = host;
            option.textContent = host;
            hostFilter.appendChild(option);
        });
        }

    function populateLanguageFilter(games) {
        // This now populates based on ALL games in the directory
        const languages = new Set(games.map(game => game.hint1).filter(Boolean));
        const sortedLanguages = [...languages].sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));

        while (languageFilter.options.length > 1) {
            languageFilter.remove(1);
        }

        sortedLanguages.forEach(lang => {
            const option = document.createElement('option');
            option.value = lang.toLowerCase();
            option.textContent = lang;
            languageFilter.appendChild(option);
        });
    }
function applyFilters() {
    const query = searchInput.value.toLowerCase().trim();
    let selectedStatus = statusFilter.value;
    const selectedHost = hostFilter.value;
    const selectedLanguage = languageFilter.value;
    
    // If a language is selected, automatically switch the status filter to "played".
    if (selectedLanguage !== 'all') {
        selectedStatus = 'played';
        statusFilter.value = 'played'; // Update the dropdown UI to match
    }
    
    let filteredGames = [...allGames];

    // 1. Apply Status Filter (now includes empty/with_players logic)
    if (selectedStatus === 'played') {
        filteredGames = filteredGames.filter(game => playedGamesSet.has(game.word));
    } else if (selectedStatus === 'unplayed') {
        filteredGames = filteredGames.filter(game => !playedGamesSet.has(game.word));
    } else if (selectedStatus === 'empty') {
        filteredGames = filteredGames.filter(game => game.playerCount === 0);
    } else if (selectedStatus === 'with_players') {
        filteredGames = filteredGames.filter(game => game.playerCount > 0);
    }
    
    // 2. Apply Host Filter
    if (selectedHost !== 'all') {
        filteredGames = filteredGames.filter(game => game.host === selectedHost);
    }

    // 3. Apply Language Filter
    if (selectedLanguage !== 'all') {
        filteredGames = filteredGames.filter(game => (game.hint1 || '').toLowerCase() === selectedLanguage);
    }
    
    // 4. Apply Search Filter
    if (query) {
        filteredGames = filteredGames.filter(game => {
            const hasPlayed = playedGamesSet.has(game.word);
            const host = (game.host || '').toLowerCase();
            const gameNumber = String(game.gameNumber || '');
            if (host.includes(query) || gameNumber.includes(query)) return true;
            if (hasPlayed) {
                const word = game.word.toLowerCase();
                if (word.includes(query)) return true;
            }
            return false;
        });
    }
    
    renderGames(filteredGames);
}

    function renderGames(gamesToRender) {
        const count = gamesToRender.length;
        const gameText = count === 1 ? 'game' : 'games';
        gameCountHeader.textContent = `Showing ${count} ${gameText}`;
        gameCountHeader.style.display = 'block';
        gameListContainer.innerHTML = '';
        if (count === 0) return;

        gamesToRender.forEach(game => {
            const card = document.createElement('a');
            const hasPlayed = playedGamesSet.has(game.word);
            const displayWord = hasPlayed ? game.word : '?????';
            const wordClass = hasPlayed ? 'revealed' : 'hidden';

            // --- NEW: Generate player count HTML (if count > 0) ---
            const playerCountHtml = game.playerCount > 0 
                ? `<span class="player-count">👤 ${game.playerCount}</span>` 
                : '<span></span>'; // Empty span to maintain layout

            // --- NEW: Generate flag HTML (if game has been played) ---
            let flagHtml = '';
            if (hasPlayed) {
                const lang = (game.hint1 || '').toLowerCase();
                const code = languageToCountryCode[lang];
                if (code) {
                    flagHtml = `<span class="language-flag">${getFlagEmoji(code)}</span>`;
                }
            }

            card.className = `game-card ${hasPlayed ? 'played' : 'unplayed'}`;
            card.href = generateShareURL(game.word);
            
            // --- UPDATED: New card layout with header and footer ---
            card.innerHTML = `
                <div class="game-card-header">
                    <span class="game-number">#${game.gameNumber || '???'}</span>
                    ${flagHtml}
                </div>
                <div class="game-word ${wordClass}">${displayWord}</div>
                <div class="game-card-footer">
                    ${playerCountHtml}
                    <div class="game-host">by <span>${game.host || 'Unknown'}</span></div>
                </div>
            `;
            gameListContainer.appendChild(card);
        });
    }

    // All basic filters just call applyFilters
    searchInput.addEventListener('input', applyFilters);
    hostFilter.addEventListener('change', applyFilters);

    // The language filter has special logic
    languageFilter.addEventListener('change', () => {
        // If the user selects a language, it must be for played games.
        // This implicitly forces the filter.
        if (statusFilter.value !== 'played') {
            statusFilter.value = 'played';
        }
        applyFilters();
    });

    // The status filter now controls the language filter's state
    statusFilter.addEventListener('change', () => {
        if (statusFilter.value === 'played') {
            // ENABLE the language filter only when 'My Played Games' is selected
            languageFilter.disabled = false;
        } else {
            // DISABLE the language filter for all other statuses
            languageFilter.disabled = true;
            // Also reset its value to avoid getting stuck
            languageFilter.value = 'all';
        }
        // Then, apply all filters with the new state
        applyFilters();
    });

fetchAllGames();
});
