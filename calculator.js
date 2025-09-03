// calculator.js
document.addEventListener('DOMContentLoaded', () => {
    const SUPPORTED_LANGUAGES = ['german', 'norwegian', 'english', 'swedish', 'danish'];
    const INFREQUENT_LETTERS = new Set(['j', 'q', 'x', 'z', 'æ', 'ø', 'å', 'ö', 'ä', 'ü', 'ẞ']);
    const wordLists = new Map();
    let allWords = new Set();
    let possibleWords = new Set();
    let secretWord = null;
    let letterFrequencies = null;

    const setupContainer = document.getElementById('setup-container');
    const calculatorContainer = document.getElementById('calculator-container');
    const secretWordInput = document.getElementById('secret-word-input');
    const startBtn = document.getElementById('start-btn');
    const currentSecretWordDisplay = document.getElementById('current-secret-word');
    const countDisplay = document.getElementById('possible-words-count');
    const wordListContainer = document.getElementById('word-list');
    const suggestionContainer = document.getElementById('suggestion-container');
    const suggestionList = document.getElementById('suggestion-list');
    const fillerSuggestionContainer = document.getElementById('filler-suggestion-container');
    const fillerSuggestionList = document.getElementById('filler-suggestion-list');
    const frequencyContainer = document.getElementById('frequency-container');
    const frequencyBars = document.getElementById('frequency-bars');
    const historyContainer = document.getElementById('guess-history');
    const guessInput = document.getElementById('guess-input');
    const submitBtn = document.getElementById('submit-guess-btn');
    const softResetBtn = document.getElementById('soft-reset-btn');
    const hardResetBtn = document.getElementById('hard-reset-btn');

    async function loadAllWordLists() {
        const promises = SUPPORTED_LANGUAGES.map(lang =>
            fetch(`${lang}.txt`).then(response => response.text()).then(text => ({ lang, text }))
        );
        const results = await Promise.all(promises);
        results.forEach(({ lang, text }) => {
            const words = text.split(/\s+/).filter(w => w.length === 5);
            wordLists.set(lang, new Set(words));
            words.forEach(word => allWords.add(word.toLowerCase()));
        });
        console.log(`Loaded ${allWords.size} unique words.`);
        calculateBaselineFrequency(allWords); 
    }

    function getColorPattern(guess, secret) {
        const guessChars = guess.split('');
        const secretChars = secret.split('');
        const colors = Array(5).fill('absent');
        for (let i = 0; i < 5; i++) {
            if (guessChars[i] === secretChars[i]) {
                colors[i] = 'correct';
                secretChars[i] = null;
            }
        }
        for (let i = 0; i < 5; i++) {
            if (colors[i] !== 'correct') {
                const charIndex = secretChars.indexOf(guessChars[i]);
                if (charIndex !== -1) {
                    colors[i] = 'present';
                    secretChars[charIndex] = null;
                }
            }
        }
        return colors;
    }

    function updateCount() {
        countDisplay.textContent = possibleWords.size;
        wordListContainer.innerHTML = '';
        if (possibleWords.size > 0 && possibleWords.size <= 10) {
            const sortedWords = [...possibleWords].sort();
            sortedWords.forEach(word => {
                const wordElement = document.createElement('div');
                wordElement.className = 'possible-word';
                wordElement.textContent = word;
                wordListContainer.appendChild(wordElement);
            });
        }
    }

    // ✅ NEW: Letter Frequency Visualizer Logic
    function updateFrequencyVisualizer() {
        const knownLetters = new Set();
        const guessRows = document.querySelectorAll('#guess-history .guess-row');
        guessRows.forEach(row => {
            const tiles = row.querySelectorAll('.tile');
            tiles.forEach(tile => {
                if (tile.classList.contains('correct') || tile.classList.contains('present')) {
                    knownLetters.add(tile.textContent.toLowerCase());
                }
            });
        });

        if (possibleWords.size > 1 && possibleWords.size <= 3000) {
            frequencyContainer.classList.remove('hidden');
            const freq = {};
            let totalUnknownLetters = 0; // ✅ 1. Variable to store the total count

            for (const word of possibleWords) {
                for (const char of word) {
                    if (!knownLetters.has(char)) {
                        freq[char] = (freq[char] || 0) + 1;
                        totalUnknownLetters++; // ✅ 2. Increment the total
                    }
                }
            }
            
            const sortedFreq = Object.entries(freq).sort((a, b) => b[1] - a[1]);
            const top7 = sortedFreq.slice(0, 7);
            const maxCount = top7.length > 0 ? top7[0][1] : 1;

            frequencyBars.innerHTML = '';
            top7.forEach(([letter, count]) => {
                const percentage = (count / totalUnknownLetters) * 100; // ✅ 3. Calculate percentage

                const barWrapper = document.createElement('div');
                barWrapper.className = 'freq-bar-wrapper';
                
                const bar = document.createElement('div');
                bar.className = 'freq-bar';
                bar.style.height = `${(count / maxCount) * 100}%`;
                bar.textContent = `${percentage.toFixed(0)}%`; // ✅ 4. Display percentage on the bar

                const label = document.createElement('div');
                label.className = 'freq-label';
                label.textContent = letter;

                barWrapper.appendChild(bar);
                barWrapper.appendChild(label);
                frequencyBars.appendChild(barWrapper);
            });
        } else {
            frequencyContainer.classList.add('hidden');
        }
    }

    function hardReset() {
        possibleWords = new Set(allWords);
        secretWord = null;
        historyContainer.innerHTML = '';
        guessInput.value = '';
        secretWordInput.value = '';
        guessInput.disabled = false;
        submitBtn.disabled = false;
        document.getElementById('difficulty-rating').innerHTML = '';
        calculatorContainer.classList.add('hidden');
        suggestionContainer.classList.add('hidden');
        fillerSuggestionContainer.classList.add('hidden');
        frequencyContainer.classList.add('hidden'); // Also hide this
        setupContainer.classList.remove('hidden');
        secretWordInput.focus();
    }

    function softReset() {
        possibleWords = new Set(allWords);
        historyContainer.innerHTML = '';
        updateCount();
        suggestionContainer.classList.add('hidden');
        fillerSuggestionContainer.classList.add('hidden');
        frequencyContainer.classList.add('hidden'); // Also hide this
        guessInput.disabled = false;
        submitBtn.disabled = false;
        guessInput.value = '';
        guessInput.focus();
    }
    
    function handleStart() {
        const word = secretWordInput.value.toLowerCase();
        if (word.length !== 5 || !allWords.has(word)) {
            alert('Invalid secret word. Please enter a 5-letter word from the lists.');
            return;
        }
        secretWord = word;
        possibleWords = new Set(allWords);
        currentSecretWordDisplay.textContent = `Testing against: ${secretWord.toUpperCase()}`;
        
        const rating = rateWordDifficulty(secretWord);
        const ratingEl = document.getElementById('difficulty-rating');
        ratingEl.innerHTML = `Difficulty: <span class="stars">${rating.stars}</span> (${rating.text})`;

        setupContainer.classList.add('hidden');
        calculatorContainer.classList.remove('hidden');
        updateCount();
        updateFrequencyVisualizer(); // Initial visualization
        guessInput.focus();
    }

    function handleGuessSubmit() {
        if (!secretWord) return;
        const guess = guessInput.value.toLowerCase();
        if (guess.length !== 5) return;

        const wordsBefore = possibleWords.size; // ✅ Track count before filtering

        const colors = getColorPattern(guess, secretWord);
        const rowContainer = document.createElement('div'); // Create a wrapper
        rowContainer.className = 'guess-row-container';
        
        const row = document.createElement('div');
        row.className = 'guess-row';
        for (let i = 0; i < 5; i++) {
            const tile = document.createElement('div');
            tile.className = 'tile';
            tile.textContent = guess[i];
            tile.classList.add(colors[i]);
            row.appendChild(tile);
        }
        
        rowContainer.appendChild(row); // Add the row to the wrapper
        historyContainer.appendChild(rowContainer); // Add wrapper to history

        filterPossibleWords(guess, colors);
        
        // ✅ Guess Grader Logic
        const wordsAfter = possibleWords.size;
        const eliminated = wordsBefore - wordsAfter;
        if (wordsBefore > 1 && guess !== secretWord) { 
            const percentEliminated = (eliminated / wordsBefore) * 100;
            let grade = 'Good.';
            if (percentEliminated > 98) grade = 'Optimal!';
            else if (percentEliminated > 90) grade = 'Excellent!';
            else if (percentEliminated > 70) grade = 'Great!';

            const analysisDiv = document.createElement('div');
            analysisDiv.className = 'guess-analysis';
            analysisDiv.textContent = `Eliminated ${eliminated} of ${wordsBefore} words (${percentEliminated.toFixed(1)}%). ${grade}`;
            rowContainer.appendChild(analysisDiv); // Add analysis to the wrapper
        }
        
        guessInput.value = '';
        guessInput.focus();
        updateFrequencyVisualizer(); // Update chart after guess

        if (guess === secretWord) {
            suggestionContainer.classList.add('hidden');
            fillerSuggestionContainer.classList.add('hidden');
            guessInput.disabled = true;
            submitBtn.disabled = true;
        } else {
            findBestGuesses();
        }
    }

    function filterPossibleWords(guess, colors) {
        const newPossibleWords = new Set();
        for (const word of possibleWords) {
            if (isValidCandidate(word, guess, colors)) {
                newPossibleWords.add(word);
            }
        }
        possibleWords = newPossibleWords;
        updateCount();
    }

    function isValidCandidate(word, guess, colors) {
        const guessChars = guess.split('');
        const wordChars = word.split('');
        for (let i = 0; i < 5; i++) {
            if (colors[i] === 'correct' && wordChars[i] !== guessChars[i]) return false;
        }
        for (let i = 0; i < 5; i++) {
            if (colors[i] === 'present') {
                if (wordChars[i] === guessChars[i]) return false;
                if (!wordChars.includes(guessChars[i])) return false;
            }
        }
        for (let i = 0; i < 5; i++) {
            if (colors[i] === 'absent') {
                const nonAbsentCount = guessChars.reduce((count, char, index) => (char === guessChars[i] && colors[index] !== 'absent') ? count + 1 : count, 0);
                const wordCount = wordChars.filter(char => char === guessChars[i]).length;
                if (wordCount > nonAbsentCount) return false;
            }
        }
        const presentLetters = {};
        for (let i = 0; i < 5; i++) {
            if (colors[i] === 'present' || colors[i] === 'correct') {
                const char = guessChars[i];
                presentLetters[char] = (presentLetters[char] || 0) + 1;
            }
        }
        for (const letter in presentLetters) {
            const countInWord = wordChars.filter(c => c === letter).length;
            if (countInWord < presentLetters[letter]) return false;
        }
        return true;
    }

    async function findBestGuesses() {
            const candidates = Array.from(possibleWords);
            if (candidates.length > 3000) {
                suggestionContainer.classList.add('hidden');
                fillerSuggestionContainer.classList.add('hidden'); // Hide filler too
                return;
            }

            suggestionContainer.classList.remove('hidden');
            suggestionList.innerHTML = '<span>Calculating...</span>';
            
            // Hide and clear filler container by default
            fillerSuggestionContainer.classList.add('hidden');
            fillerSuggestionList.innerHTML = '';

            await new Promise(resolve => setTimeout(resolve, 0));

            if (candidates.length <= 2) {
                suggestionList.innerHTML = '';
                candidates.forEach(word => {
                    const wordEl = document.createElement('div');
                    wordEl.className = 'suggested-word';
                    wordEl.textContent = word;
                    suggestionList.appendChild(wordEl);
                });
                if (candidates.length === 0) {
                    suggestionContainer.classList.add('hidden');
                }
                return; // No need for fillers if 2 or fewer words left
            }

            const guessPool = candidates;
            const scores = [];
            for (const guess of guessPool) {
                const patternMap = new Map();
                for (const secret of candidates) {
                    const pattern = getColorPattern(guess, secret).join('');
                    patternMap.set(pattern, (patternMap.get(pattern) || 0) + 1);
                }
                let sumOfSquares = 0;
                for (const count of patternMap.values()) {
                    sumOfSquares += count * count;
                }
                const score = sumOfSquares / candidates.length;
                scores.push({ word: guess, score: score });
            }
            scores.sort((a, b) => a.score - b.score);
            suggestionList.innerHTML = '';
            const top3 = scores.slice(0, 3);
            top3.forEach((item, index) => {
                const wordEl = document.createElement('div');
                wordEl.className = 'suggested-word';
                wordEl.textContent = `${index + 1}. ${item.word}`;
                suggestionList.appendChild(wordEl);
            });

            // --- ✅ NEW FILLER WORD LOGIC ---
            if (candidates.length <= 10 && candidates.length > 1) {
                fillerSuggestionContainer.classList.remove('hidden');
                fillerSuggestionList.innerHTML = '<span>Calculating filler...</span>';
                await new Promise(resolve => setTimeout(resolve, 0));

                // 1. Find all definitively gray/absent letters
                const absentLetters = new Set();
                document.querySelectorAll('#guess-history .tile.absent').forEach(tile => {
                    absentLetters.add(tile.textContent.toLowerCase());
                });

                // 2. Create a pool of filler words from the entire list
                const fillerPool = [];
                for (const word of allWords) {
                    if (!possibleWords.has(word) && ![...word].some(char => absentLetters.has(char))) {
                        fillerPool.push(word);
                    }
                }

                // 3. Score the filler words against the remaining candidates
                const fillerScores = [];
                for (const guess of fillerPool) {
                    const patternMap = new Map();
                    for (const secret of candidates) {
                        const pattern = getColorPattern(guess, secret).join('');
                        patternMap.set(pattern, (patternMap.get(pattern) || 0) + 1);
                    }
                    let sumOfSquares = 0;
                    for (const count of patternMap.values()) {
                        sumOfSquares += count * count;
                    }
                    const score = sumOfSquares / candidates.length;
                    fillerScores.push({ word: guess, score: score });
                }

                // 4. Display the best filler word
                fillerScores.sort((a, b) => a.score - b.score);
                fillerSuggestionList.innerHTML = '';
                const topFiller = fillerScores[0];

                if (topFiller) {
                    const wordEl = document.createElement('div');
                    wordEl.className = 'suggested-word filler';
                    wordEl.textContent = topFiller.word;
                    fillerSuggestionList.appendChild(wordEl);
                } else {
                    fillerSuggestionList.innerHTML = '<span>No optimal filler found.</span>';
                }
            }
        }

        // ✅ ADD THIS ENTIRE NEW FUNCTION
    function calculateBaselineFrequency(wordSet) {
        const freq = {};
        for (const word of wordSet) {
            for (const char of word) {
                freq[char] = (freq[char] || 0) + 1;
            }
        }
        letterFrequencies = freq;
    }

    function rateWordDifficulty(word) {
        // Factor 1: Letter Rarity Score
        // Gives a baseline score based on how rare the letters are.
        let rarityScore = 0;
        const uniqueLetters = [...new Set(word)];
        for (const char of uniqueLetters) {
            rarityScore += 1 / (letterFrequencies[char] || 1);
        }
        rarityScore = Math.min(rarityScore * 2500, 50); // Normalized to a max of 50

        // Factor 2: The "Trap" Score (Worst-Case Scenario)
        // Finds the single position with the most rhyming/similar words.
        let maxMatchesInOnePosition = 0;
        for (let i = 0; i < 5; i++) {
            const pattern = new RegExp(`^${word.substring(0, i)}.${word.substring(i + 1)}$`);
            let currentMatches = 0;
            for (const w of allWords) {
                if (w !== word && pattern.test(w)) {
                    currentMatches++;
                }
            }
            if (currentMatches > maxMatchesInOnePosition) {
                maxMatchesInOnePosition = currentMatches;
            }
        }
        // The score grows exponentially as the number of "trap" words increases.
        const neighborhoodScore = Math.pow(maxMatchesInOnePosition, 1.5) * 5;

        // Factor 3: Duplicate Letter Penalty
        const duplicatePenalty = (5 - uniqueLetters.length) * 10;

        // Combine the scores, giving the most weight to the "trap" factor.
         let finalScore = rarityScore + neighborhoodScore + duplicatePenalty;

        // 1. Count how many unique infrequent letters the word has.
        const infrequentLetterCount = uniqueLetters.filter(char => INFREQUENT_LETTERS.has(char)).length;

        // 2. If there are 2 or more, ensure the score is at least "Tricky" (30).
        if (infrequentLetterCount >= 2 && finalScore < 30) {
            // ...boost it to the minimum score FOR "Tricky".
            finalScore = 30;
        }

        // 3. Otherwise, if there is 1, ensure the score is at least "Average" (15).
        else if (infrequentLetterCount === 1 && finalScore < 15) {
            finalScore = 15;
        }

        if (finalScore < 15) return { stars: '★☆☆☆☆', text: 'Easy' };
        if (finalScore < 30) return { stars: '★★☆☆☆', text: 'Average' };
        if (finalScore < 50) return { stars: '★★★☆☆', text: 'Tricky' };
        if (finalScore < 80) return { stars: '★★★★☆', text: 'Hard' };
        return { stars: '★★★★★', text: 'Expert' };
    }

    async function init() {
        await loadAllWordLists();
        startBtn.addEventListener('click', handleStart);
        secretWordInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') startBtn.click(); });
        submitBtn.addEventListener('click', handleGuessSubmit);
        guessInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') submitBtn.click(); });
        softResetBtn.addEventListener('click', softReset);
        hardResetBtn.addEventListener('click', hardReset);
        secretWordInput.focus();
    }

    init();
});