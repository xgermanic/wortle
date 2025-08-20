// theme.js

document.addEventListener('DOMContentLoaded', () => {
    const themeToggleBtn = document.getElementById('themeToggleBtn');
    const themeStylesheet = document.getElementById('theme-stylesheet');

    // Function to toggle the theme
    function toggleTheme() {
        if (!themeStylesheet) return; // Exit if stylesheet link isn't found

        const isLight = themeStylesheet.getAttribute('href') === 'style-light.css';

        if (isLight) {
            themeStylesheet.setAttribute('href', 'style-dark.css');
            if (themeToggleBtn) themeToggleBtn.innerHTML = '☀️';
            localStorage.setItem('theme', 'dark');
        } else {
            themeStylesheet.setAttribute('href', 'style-light.css');
            if (themeToggleBtn) themeToggleBtn.innerHTML = '🌙';
            localStorage.setItem('theme', 'light');
        }
    }

    // Function to set the theme when a page loads
    function applyInitialTheme() {
        if (!themeStylesheet) return;

        const savedTheme = localStorage.getItem('theme');

        if (savedTheme === 'dark') {
            themeStylesheet.setAttribute('href', 'style-dark.css');
            if (themeToggleBtn) themeToggleBtn.innerHTML = '☀️';
        } else {
            // Default to light theme
            themeStylesheet.setAttribute('href', 'style-light.css');
            if (themeToggleBtn) themeToggleBtn.innerHTML = '🌙';
        }
    }

    // Add click listener to the button if it exists on the page
    if (themeToggleBtn) {
        themeToggleBtn.addEventListener('click', toggleTheme);
    }

    // Apply the theme as soon as the page is ready
    applyInitialTheme();
});