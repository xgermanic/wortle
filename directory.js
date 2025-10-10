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

    // Helper functions...
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

    // --- Get references to all UI elements ---
    const gameListContainer = document.getElementById('game-list');
    const loader = document.getElementById('loader');
    const searchInput = document.getElementById('searchInput');
    const statusFilter = document.getElementById('statusFilter');
    const hostFilter = document.getElementById('hostFilter');
    const gameCountHeader = document.getElementById('game-count'); // NEW: Get the counter element

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

            const gamesArray = Object.keys(gamesData).map(word => {
                const game = gamesData[word];
                return game.metadata ? { ...game.metadata, word } : null;
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

                if (host.includes(query) || gameNumber.includes(query)) {
                    return true;
                }
                if (hasPlayed) {
                    const word = game.word.toLowerCase();
                    if (word.includes(query)) {
                        return true;
                    }
                }
                return false;
            });
        }
        
        renderGames(filteredGames);
    }

        // --- UPDATED: This function now also manages the counter ---
    function renderGames(gamesToRender) {
        const count = gamesToRender.length;
        const gameText = count === 1 ? 'game' : 'games'; // Correctly handles pluralization for 0, 1, or more

        // --- UPDATED LOGIC ---
        // 1. Always update and display the counter header, even for zero.
        gameCountHeader.textContent = `Showing ${count} ${gameText}`;
        gameCountHeader.style.display = 'block';

        // 2. Always clear the main list container.
        gameListContainer.innerHTML = '';

        // 3. If there are no games, simply stop here, leaving the container empty.
        if (count === 0) {
            return;
        }
        // --- END OF UPDATED LOGIC ---

        // This part only runs if count > 0
        gamesToRender.forEach(game => {
            const card = document.createElement('a');
            const hasPlayed = playedGamesSet.has(game.word);
            const displayWord = hasPlayed ? game.word : '?????';
            const wordClass = hasPlayed ? 'revealed' : 'hidden';

            card.className = `game-card ${hasPlayed ? 'played' : 'unplayed'}`;
            card.href = generateShareURL(game.word, game.hint1, game.hint2, game.hint3, game.hint4, game.funFact);
            
            card.innerHTML = `
                <div class="game-card-header">
                    <span class="game-number">#${game.gameNumber || '???'}</span>
                </div>
                <div class="game-word ${wordClass}">${displayWord}</div>
                <div class="game-host">by <span>${game.host || 'Unknown'}</span></div>
            `;
            gameListContainer.appendChild(card);
        });
    }
    
    // Add event listeners to all filter controls
    searchInput.addEventListener('input', applyFilters);
    statusFilter.addEventListener('change', applyFilters);
    hostFilter.addEventListener('change', applyFilters);

    fetchAllGames();
});