// theme.js - Injected into the <head> of all pages to prevent Flash of Unstyled Content (FOUT)
(function() {
    const savedTheme = localStorage.getItem('app_theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);

    window.toggleTheme = function() {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('app_theme', newTheme);
        updateThemeButtons(newTheme);

        if (window.applyChatStyle) {
            let currentStyle = parseInt(localStorage.getItem('chat_style_idx') || '1');
            if (newTheme === 'dark' && (currentStyle === 1 || currentStyle === 8)) {
                localStorage.setItem('chat_style_idx', '2');
                window.applyChatStyle(2);
            } else if (newTheme === 'light') {
                localStorage.setItem('chat_style_idx', '1');
                window.applyChatStyle(1);
            }
        }
    };

    window.updateThemeButtons = function(theme) {
        document.querySelectorAll('.theme-toggle-btn').forEach(btn => {
            if (btn.classList.contains('icon-only')) {
                btn.innerHTML = theme === 'light' ? '🌙' : '☀️';
            } else {
                btn.innerHTML = theme === 'light' ? '🌙 Modalità Scura' : '☀️ Modalità Chiara';
            }
        });
    };

    document.addEventListener('DOMContentLoaded', () => {
        updateThemeButtons(savedTheme);
        document.querySelectorAll('.theme-toggle-btn').forEach(btn => {
            btn.addEventListener('click', window.toggleTheme);
        });
    });
})();
