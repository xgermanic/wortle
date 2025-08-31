const { onSchedule } = require("firebase-functions/v2/scheduler");
const { logger } = require("firebase-functions");
const admin = require("firebase-admin");
admin.initializeApp();

// This function runs every Monday at 00:01 Copenhagen time.
// It saves a snapshot of everyone's stats to mark the start of the week.
exports.snapshotWeeklyStats = onSchedule({
    schedule: "every monday 00:01",
    timeZone: "Europe/Copenhagen",
}, async (event) => {
    logger.info("Creating weekly stats snapshot...");

    const db = admin.database();
    const profilesRef = db.ref("/userProfiles");
    // Use the event timestamp for a unique weekly ID
    const snapshotRef = db.ref(`/weeklySnapshots/${event.timestamp}`);
    const metaRef = db.ref("/metadata");

    const [profilesSnapshot, metaSnapshot] = await Promise.all([
        profilesRef.once("value"),
        metaRef.once("value"),
    ]);

    if (!profilesSnapshot.exists()) {
        logger.info("No user profiles found. Exiting.");
        return null;
    }
    
    const metadata = metaSnapshot.val() || {};

    await snapshotRef.set({
        users: profilesSnapshot.val(),
        startTotalGames: metadata.totalGames || 0,
    });

    logger.info("Weekly snapshot successfully created.");
    return null;
});


// This function runs every Sunday at 23:59 Copenhagen time.
// It calculates the weekly winners and saves them.
exports.calculateWeeklyWinners = onSchedule({
    schedule: "every sunday 23:59",
    timeZone: "Europe/Copenhagen",
}, async (event) => {
    logger.info("Calculating weekly winners...");
    const db = admin.database();

    // 1. Get the most recent weekly snapshot (the "before" picture)
    const lastSnapshotQuery = db.ref("/weeklySnapshots")
        .orderByKey().limitToLast(1);
    const snapshotData = await lastSnapshotQuery.once("value");

    if (!snapshotData.exists()) {
        logger.info("No weekly snapshot found. Cannot calculate winners.");
        return null;
    }

    const snapshot = Object.values(snapshotData.val())[0];
    const startProfiles = snapshot.users || {};
    const startTotalGames = snapshot.startTotalGames || 0;

    // 2. Get the current user profiles and game data (the "after" picture)
    const [currentProfilesSnapshot, metaSnapshot, allGamesSnapshot] = await Promise.all([
        db.ref("/userProfiles").once("value"),
        db.ref("/metadata").once("value"),
        db.ref("/games").once("value"),
    ]);

    const currentProfiles = currentProfilesSnapshot.val() || {};
    const allGames = allGamesSnapshot.val() || {};
    const metadata = metaSnapshot.val() || {};

    // 3. Prepare to find the winners
    let winners = {
        socialButterfly: { username: "-", value: "0 games" },
        bestGuesser: { username: "-", value: "N/A" },
        mostHosted: { username: "-", value: "0 games" },
        bestImprovement: { username: "-", value: "+0 ranks" },
    };
    
    let maxGamesPlayed = -1;
    let minAvgGuesses = Infinity;
    let maxHosted = -1;
    let maxRankImp = -1;
    const userHostCounts = {};

    // --- Calculate "Hostess with the mostess" ---
    for (const word in allGames) {
        const game = allGames[word];
        if (game.metadata?.gameNumber > startTotalGames) {
            const host = game.metadata.host;
            if (host) {
                userHostCounts[host] = (userHostCounts[host] || 0) + 1;
            }
        }
    }
    for (const host in userHostCounts) {
        if (userHostCounts[host] > maxHosted) {
            maxHosted = userHostCounts[host];
            winners.mostHosted = {
                username: host,
                value: `${maxHosted} new game${maxHosted > 1 ? "s" : ""}`,
            };
        }
    }
    
    // --- Calculate current and previous rankings for "Best Improvement" ---
    const calculateRanks = (profiles) => {
      const players = Object.entries(profiles).map(([id, p]) => {
        const s = p.stats || {};
        const winPct = (s.gamesPlayed > 0) ? (s.wins / s.gamesPlayed) * 100 : 0;
        const avgG = (s.wins > 0) ? (s.totalGuesses / s.wins) : 0;
        return { id, winPct, avgG, wins: s.wins || 0 };
      });
      players.sort((a, b) => {
        if (b.winPct !== a.winPct) return b.winPct - a.winPct;
        if (b.wins !== a.wins) return b.wins - a.wins;
        return a.avgG - b.avgG;
      });
      const ranks = {};
      players.forEach((p, i) => { ranks[p.id] = i + 1; });
      return ranks;
    };
    const startRanks = calculateRanks(startProfiles);
    const endRanks = calculateRanks(currentProfiles);

    // --- Calculate other weekly stats ---
    for (const userId in currentProfiles) {
      const startProfile = startProfiles[userId] || {};
      const endProfile = currentProfiles[userId];
      const startStats = startProfile.stats || { gamesPlayed: 0, wins: 0, totalGuesses: 0 };
      const endStats = endProfile.stats || { gamesPlayed: 0, wins: 0, totalGuesses: 0 };

      // Social Butterfly
      const gamesPlayedThisWeek = endStats.gamesPlayed - startStats.gamesPlayed;
      if (gamesPlayedThisWeek > maxGamesPlayed) {
        maxGamesPlayed = gamesPlayedThisWeek;
        winners.socialButterfly = { username: endProfile.original || userId, value: `${maxGamesPlayed} game${maxGamesPlayed > 1 ? "s" : ""}` };
      }

      // Best Guesser
      const winsThisWeek = endStats.wins - startStats.wins;
      if (winsThisWeek >= 1) { // Require at least one win this week
        const guessesThisWeek = endStats.totalGuesses - startStats.totalGuesses;
        const avgGuessesThisWeek = guessesThisWeek / winsThisWeek;
        if (avgGuessesThisWeek < minAvgGuesses) {
          minAvgGuesses = avgGuessesThisWeek;
          winners.bestGuesser = { username: endProfile.original || userId, value: `${minAvgGuesses.toFixed(2)} avg guesses` };
        }
      }

      // Best Improvement
      const startRank = startRanks[userId] || (Object.keys(endRanks).length + 1); // If new, start at the bottom
      const endRank = endRanks[userId];
      if (endRank) { // Only consider players who have a final rank
          const rankImprovement = startRank - endRank;
          if (rankImprovement > maxRankImp) {
            maxRankImp = rankImprovement;
            winners.bestImprovement = { username: endProfile.original || userId, value: `+${maxRankImp} rank${maxRankImp > 1 ? "s" : ""}` };
          }
      }
    }

    await db.ref("/weeklyWinners/current").set(winners);
    logger.info("Weekly winners successfully calculated and saved:", winners);
    return null;
});
