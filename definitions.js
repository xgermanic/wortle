const BADGE_DEFINITIONS = {
    // Existing Badges
    genius: { name: 'Genius 🧠', description: 'Solved a Wørtle in 2 guesses or fewer.' },
    flawless: { name: 'Flawless Victory 🏆', description: 'Won without guessing any incorrect (absent) letters.' },
    prolific_host: { name: 'Prolific Host ✍️', description: 'Hosted 10 or more games.' },
    social_butterfly: { name: 'Social Butterfly 🦋', description: 'Played 25 or more games.' },

    // New Skill & Difficulty Badges
    prodigy: { name: 'Prodigy 🤯', description: 'Solved the Wørtle on the first guess.' },
    clutch_victory: { name: 'Clutch Victory 😮‍💨', description: 'Solved the Wørtle on the final guess.' },
    natural_talent: { name: 'Natural Talent 😎', description: 'Won a game without using any hints.' },
    vowel_virtuoso: { name: 'Vowel Virtuoso 🎤', description: 'Solved a word with at least 4 unique vowels.' },
    consonant_crusher: { name: 'Consonant Crusher ⛏️', description: 'Solved a word with at least 4 unique consonants.' },

    // New Streaks & Consistency Badges
    on_a_roll: { name: 'On a Roll 🔥', description: 'Achieved a 3-game winning streak.' },
    dominating: { name: 'Dominating 🚀', description: 'Achieved a 10-game winning streak.' },
    daily_dedication: { name: 'Daily Dedication 🗓️', description: 'Played a game every day for 7 consecutive days.' },
    night_owl: { name: 'Night Owl 🦉', description: 'Solved a puzzle between midnight and 4:00 AM.' },
    early_bird: { name: 'Early Bird 🐦', description: 'Solved a puzzle between 5:00 AM and 8:00 AM.' },

    // New Community & Hosting Badges
    crowd_pleaser: { name: 'Crowd Pleaser 🎉', description: 'Hosted a game that was played by at least 10 other people.' },
    master_hintsmith: { name: 'Master Hintsmith 🎯', description: 'Created a game with all 4 hints and a fun fact.' },
    wortle_wanderer: { name: 'Wørtle Wanderer 🗺️', description: 'Played games created by 10 different hosts.' },
    community_pillar: { name: 'Community Pillar 🏛️', description: 'Hosted 25 or more games.' }, // Simplified from original idea
    star_novelist: { name: 'Star Novelist 📖', description: 'Wrote a fun fact with over 120 words.' },

    // New Language & Exploration Badges
    umlaut_enthusiast: { name: 'Umlaut Enthusiast 🇩🇪', description: 'Solved a word containing an umlaut (Ä, Ö, or Ü).' },
    nordic_explorer: { name: 'Nordic Explorer 🇳🇴', description: 'Solved a word containing a Nordic character (Æ, Ø, or Å).' },
    polyglot: { name: 'Polyglot 🌐', description: 'Solved at least one word from each of the 5 supported languages.' },
    globetrotter: { name: 'Globetrotter 🌎', description: 'Solved at least one word from each of your non-native languages.' },

    // Persistence & Playstyle
    the_comeback_kid: { name: 'The Comeback Kid 💪', description: 'Won a game right after losing the previous one.' },
    super_sleuth: { name: 'Super Sleuth 🕵️‍♀️', description: 'Used all available hints to solve a puzzle.' },
    unique_streak: { name: 'Unique Streak ✨', description: 'Your first three guesses in a single game contained 15 unique letters.' },
    
    // Advanced Community & Hosting
    linguistic_ambassador: { name: 'Linguistic Ambassador 🧑‍🏫', description: 'Hosted games in at least 3 different languages.' },
    dedicated_fan: { name: 'Dedicated Fan 🙌', description: 'Played 10 games created by the same host.' },

    // Holiday & Time-Based
    festive_guesser: { name: 'Festive Guesser 🎄', description: 'Solved a game during the last two weeks of December.' },
    spooky_solver: { name: 'Spooky Solver 🎃', description: 'Solved a game during the last week of October.' },
};
