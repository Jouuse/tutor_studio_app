document.addEventListener('DOMContentLoaded', () => {
    // Controllo login
    const userStr = localStorage.getItem('user');
    if (!userStr) {
        window.location.href = '/index.html';
        return;
    }

    const user = JSON.parse(userStr);
    document.getElementById('userGreeting').textContent = `Benvenuto/a, ${user.nome} ${user.cognome} (${user.corso_laurea})`;

    // Logout
    document.getElementById('logoutBtn').addEventListener('click', () => {
        localStorage.removeItem('user');
        window.location.href = '/index.html';
    });

    // Carica materie
    fetchMaterie(user.id);

    // Gestione form
    const materiaForm = document.getElementById('materiaForm');
    materiaForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const formData = new FormData();
        formData.append('utente_id', user.id);
        formData.append('nome_materia', document.getElementById('nome_materia').value.trim());
        formData.append('cfu', document.getElementById('cfu').value.trim() || 0);
        formData.append('anno', document.getElementById('anno').value.trim() || 1);
        formData.append('scheda_trasparenza', document.getElementById('scheda_trasparenza').value.trim());
        formData.append('appunti', document.getElementById('appunti').value.trim());
        
        const fileInput = document.getElementById('file_appunti');
        if (fileInput.files.length > 0) {
            formData.append('file_appunti', fileInput.files[0]);
        }

        const submitBtn = document.getElementById('submitMateriaBtn');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Salvataggio in corso...';

        try {
            const response = await fetch('/api/materie', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                throw new Error('Errore durante il salvataggio');
            }

            // Resetta form e ricarica list
            materiaForm.reset();
            alert('Materia salvata con successo!');
            fetchMaterie(user.id);

        } catch (error) {
            console.error(error);
            alert('Errore di connessione o salvataggio fallito.');
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Salva Materia 💾';
        }
    });
});

async function fetchMaterie(userId) {
    const listContainer = document.getElementById('materieList');
    
    try {
        const response = await fetch(`/api/materie?utente_id=${userId}`);
        if (!response.ok) throw new Error('Network error');
        
        const materie = await response.json();
        
        listContainer.innerHTML = '';
        
        if (materie.length === 0) {
            listContainer.innerHTML = '<p class="text-secondary">Non hai ancora aggiunto nessuna materia. Aggiungine una dal form qui sopra!</p>';
            return;
        }

        materie.forEach(materia => {
            const card = document.createElement('div');
            card.className = 'materia-card';
            
            card.innerHTML = `
                <div>
                    <h3 class="materia-title">${materia.nome_materia}</h3>
                    <div class="materia-info">
                        Anno: ${materia.anno} | CFU: ${materia.cfu}
                    </div>
                </div>
                <div>
                    <button class="btn-secondary" onclick="modificaMateria(${materia.id})">Modifica Materiale</button>
                    <button onclick="iniziaStudiare(${materia.id})">Inizia a Studiare 🚀</button>
                </div>
            `;
            
            listContainer.appendChild(card);
        });
        
    } catch (error) {
        console.error(error);
        listContainer.innerHTML = '<p class="text-danger">Errore nel caricamento delle materie.</p>';
    }
}

// Funzioni per bottoni
window.modificaMateria = (materiaId) => {
    // Al momento un semplice alert, espandibile in futuro
    alert("Funzionalità 'Modifica Materiale' in arrivo! Per ora aggiungili come nuova materia o usa il DB direttamente.");
};

window.iniziaStudiare = (materiaId) => {
    // Salva l'id della materia corrente
    localStorage.setItem('currentMateriaId', materiaId);
    window.location.href = '/studio.html';
};
