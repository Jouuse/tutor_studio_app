document.addEventListener('DOMContentLoaded', () => {
    // Se l'utente è già loggato, reindirizza
    if (localStorage.getItem('user')) {
        window.location.href = '/dashboard.html';
    }

    const loginForm = document.getElementById('loginForm');
    const submitBtn = document.getElementById('submitBtn');

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const nome = document.getElementById('nome').value.trim();
        const cognome = document.getElementById('cognome').value.trim();
        const corso_laurea = document.getElementById('corso_laurea').value.trim();
        const tipo_laurea = document.getElementById('tipo_laurea').value;

        if (!nome || !cognome) {
            alert('Inserisci Nome e Cognome!');
            return;
        }

        submitBtn.disabled = true;
        submitBtn.textContent = 'Caricamento...';

        try {
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ nome, cognome, corso_laurea, tipo_laurea })
            });

            if (!response.ok) {
                throw new Error('Errore durante il login/registrazione');
            }

            const data = await response.json();
            
            // Salva id e info utente
            localStorage.setItem('user', JSON.stringify(data.user));
            
            // Reindirizza alla dashboard
            window.location.href = '/dashboard.html';
            
        } catch (error) {
            console.error(error);
            alert('Si è verificato un errore di connessione con il server.');
            submitBtn.disabled = false;
            submitBtn.textContent = 'Entra 🚀';
        }
    });
});
