document.addEventListener('DOMContentLoaded', () => {
    const user = JSON.parse(localStorage.getItem('user'));
    
    if (!user) { 
        console.log('Nessun utente trovato'); 
        document.getElementById('userGreeting').textContent = 'Benvenuto!';
    } else {
        document.getElementById('userGreeting').textContent = `Bentornato, ${user.nome}!`;
    }

    // Inizia a studiare
    document.getElementById('startStudyBtn').addEventListener('click', () => {
        window.location.href = 'studio.html';
    });

    // Logout
    document.getElementById('logoutBtn').addEventListener('click', () => {
        localStorage.clear();
        window.location.href = 'index.html';
    });

    if (!user) return;

    // Elementi
    const materieGrid = document.getElementById('materieGrid');
    const openAddMateriaBtn = document.getElementById('openAddMateriaBtn');
    const closeModalBtn = document.getElementById('closeModalBtn');
    const materiaModal = document.getElementById('materiaModal');
    const materiaForm = document.getElementById('materiaForm');

    // Modale
    openAddMateriaBtn.addEventListener('click', () => materiaModal.classList.remove('hidden'));
    closeModalBtn.addEventListener('click', () => materiaModal.classList.add('hidden'));

    // Caricamento Extra File Logic
    const dashboardAddFileInput = document.getElementById('dashboardAddFileInput');
    let currentDashboardMateriaId = null;

    dashboardAddFileInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file || !currentDashboardMateriaId) return;

        const formData = new FormData();
        formData.append('file_appunti', file);

        try {
            const response = await fetch(`http://localhost:3000/api/materie/${currentDashboardMateriaId}/materiali`, {
                method: 'POST',
                body: formData
            });

            if (response.ok) {
                alert('File caricato con successo!');
            } else {
                alert('Errore durante il caricamento del file.');
            }
        } catch (error) {
            console.error(error);
            alert('Errore di connessione.');
        } finally {
            dashboardAddFileInput.value = ''; // reset input
        }
    });

    // Caricamento Dati
    async function fetchMaterie() {
        try {
            const response = await fetch(`http://localhost:3000/api/materie?utente_id=${user.id}`);
            const materie = await response.json();
            
            materieGrid.innerHTML = '';
            
            if (materie.length === 0) {
                materieGrid.innerHTML = '<p class="text-secondary">Nessuna materia aggiunta. Creane una nuova!</p>';
                return;
            }

            materie.forEach(m => {
                const card = document.createElement('div');
                card.className = 'materia-card';
                card.innerHTML = `
                    <div>
                        <div class="materia-card-header">
                            <span style="font-size: 1.5rem;">📚</span>
                            <div class="materia-card-title">${m.nome_materia}</div>
                        </div>
                        <p class="text-secondary" style="font-size: 0.85rem;">CFU: ${m.cfu} - Anno: ${m.anno}</p>
                    </div>
                    <div class="materia-card-actions">
                        <button class="btn-icon btn-secondary btn-rename" data-id="${m.id}" data-nome="${m.nome_materia}">✏️</button>
                        <button class="btn-icon btn-secondary btn-add-file" data-id="${m.id}">📎 File</button>
                        <button class="btn-icon btn-danger btn-delete" data-id="${m.id}">🗑️</button>
                    </div>
                `;
                materieGrid.appendChild(card);
            });

            // Bind events
            document.querySelectorAll('.btn-add-file').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    currentDashboardMateriaId = e.target.dataset.id;
                    dashboardAddFileInput.click();
                });
            });
            document.querySelectorAll('.btn-delete').forEach(btn => {
                btn.addEventListener('click', (e) => deleteMateria(e.target.dataset.id));
            });

            document.querySelectorAll('.btn-rename').forEach(btn => {
                btn.addEventListener('click', (e) => renameMateria(e.target.dataset.id, e.target.dataset.nome));
            });

        } catch (error) {
            console.error(error);
            materieGrid.innerHTML = '<p class="text-danger">Errore di caricamento.</p>';
        }
    }

    // Aggiungi
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
        submitBtn.textContent = 'Salvataggio...';

        try {
            const response = await fetch('http://localhost:3000/api/materie', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) throw new Error('Errore di connessione');

            materiaForm.reset();
            materiaModal.classList.add('hidden');
            fetchMaterie();

        } catch (error) {
            console.error(error);
            alert('Errore di connessione o salvataggio fallito.');
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Salva';
        }
    });

    // Elimina
    async function deleteMateria(id) {
        if (!confirm('Sei sicuro di voler eliminare questa materia e tutti i suoi appunti?')) return;

        try {
            const res = await fetch(`http://localhost:3000/api/materie/${id}`, { method: 'DELETE' });
            if (res.ok) {
                // Rimuovi dal layout local storage se è quella attiva
                if(localStorage.getItem('currentMateriaId') == id) localStorage.removeItem('currentMateriaId');
                fetchMaterie();
            } else {
                alert('Errore eliminazione.');
            }
        } catch (e) {
            console.error(e);
        }
    }

    // Rinomina
    async function renameMateria(id, oldName) {
        const newName = prompt('Nuovo nome della materia:', oldName);
        if (!newName || newName.trim() === '' || newName === oldName) return;

        try {
            const res = await fetch(`http://localhost:3000/api/materie/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nome_materia: newName })
            });

            if (res.ok) fetchMaterie();
            else alert('Errore rinomina.');
        } catch (e) {
            console.error(e);
        }
    }

    fetchMaterie();
});
