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

    // --- NEW: Helper functions for creating flags (copied from your main script) ---
    const languageToCountryCode = {
        bulgarian: 'BG', croatian: 'HR', czech: 'CZ', danish: 'DK',
        dutch: 'NL', english: 'GB', estonian: 'EE', finnish: 'FI',
        french: 'FR', german: 'DE', greek: 'GR', hungarian: 'HU',
        irish: 'IE', italian: 'IT', latvian: 'LV', lithuanian: 'LT',
        polish: 'PL', portuguese: 'PT', romanian: 'RO',
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

    // --- Helper functions for creating game URLs ---
    function base64Encode(str) { return btoa(unescape(encodeURIComponent(str))); }
    function generateShareURL(word, hint1, hint2, hint3, hint4, funFact) {
        const url = new URL("/wortle/", window.location.origin); 
        url.searchParams.set("w", base64Encode(word));
        if (hint1) url.searchParams.set("h1", base64Encode(hint1));
        if (hint2) url.searchParams.set("h2", base64Encode(hint2));
        if (hint3) url.searchParams.set("h3", base64Encode(hint3));
        if (hint4) url.searchParams.set("h4", base64Encode(hint4));
        if (funFact) url.searchParams.set("ff", base64Encode(funFact));
        return url.href;
    }

    const gameListContainer = document.getElementById('game-list');
    const loader = document.getElementById('loader');
    const searchInput = document.getElementById('searchInput');
    const statusFilter = document.getElementById('statusFilter');
    const hostFilter = document.getElementById('hostFilter');
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
                    playedGamesSet = new Set(Object.keys(snapshot.val()));
                }
            }

            const gamesRef = database.ref('games');
            const snapshot = await gamesRef.once('value');
            const gamesData = snapshot.val();

            if (!gamesData) {
                gameListContainer.innerHTML = '<p>No games have been created yet!</p>';
                return;
            }

            // --- UPDATED: Calculate player count while fetching ---
            const gamesArray = Object.keys(gamesData).map(word => {
                const game = gamesData[word];
                if (game.metadata) {
                    // Count all keys that are not 'metadata' or 'players'
                    const playerCount = Object.keys(game).filter(key => key !== 'metadata' && key !== 'players').length;
                    return { ...game.metadata, word, playerCount };
                }
                return null;
            }).filter(Boolean);

            gamesArray.sort((a, b) => (b.gameNumber || 0) - (a.gameNumber || 0));
            
            allGames = gamesArray;
            populateHostFilter(allGames);
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

    function applyFilters() {
        // ... (This function remains unchanged)
        const query = searchInput.value.toLowerCase().trim();
        const selectedStatus = statusFilter.value;
        const selectedHost = hostFilter.value;
        let filteredGames = [...allGames];
        if (selectedStatus === 'played') {
            filteredGames = filteredGames.filter(game => playedGamesSet.has(game.word));
        } else if (selectedStatus === 'unplayed') {
            filteredGames = filteredGames.filter(game => !playedGamesSet.has(game.word));
        }
        if (selectedHost !== 'all') {
            filteredGames = filteredGames.filter(game => game.host === selectedHost);
        }
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
            card.href = generateShareURL(game.word, game.hint1, game.hint2, game.hint3, game.hint4, game.funFact);
            
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
    
    searchInput.addEventListener('input', applyFilters);
    statusFilter.addEventListener('change', applyFilters);
    hostFilter.addEventListener('change', applyFilters);

    fetchAllGames();
});
