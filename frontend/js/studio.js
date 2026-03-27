document.addEventListener('DOMContentLoaded', () => {
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user) { 
        console.log('Nessun utente trovato'); 
        return; 
    }
    
    let currentMateriaId = localStorage.getItem('currentMateriaId');
    let chatHistory = [];
    
    // Elementi DOM
    const sidebarList = document.getElementById('sidebarMaterieList');
    const chatContainer = document.getElementById('chatContainer');
    const emptyState = document.getElementById('emptyState');
    const chatTitle = document.getElementById('chatTitle');
    const chatArea = document.getElementById('chatArea');
    const chatForm = document.getElementById('chatForm');
    const chatInput = document.getElementById('chatInput');
    const sendBtn = document.getElementById('sendBtn');
    
    // Tools
    const btnPomodoro = document.getElementById('btnPomodoro');
    const btnAiuto = document.getElementById('btnAiuto');
    const btnDistraggo = document.getElementById('btnDistraggo');
    const backBtn = document.getElementById('backToDashBtn');

    // Sfondo e controlli chat
    const btnCambiaStile = document.getElementById('btnCambiaStile');
    const btnResetChat = document.getElementById('btnResetChat');

    // Sidebar uploads
    const studioAddFileInput = document.getElementById('studioAddFileInput');
    let currentUploadMateriaId = null;

    if (backBtn) {
        backBtn.addEventListener('click', () => {
            window.location.href = 'dashboard.html';
        });
    }

    let currentStyleIdx = localStorage.getItem('chat_style_idx') || '1';

    window.applyChatStyle = function(idx) {
        // Rimuovi vecchio stile
        for(let i=1; i<=8; i++) {
            document.querySelectorAll('.studio-main').forEach(el => el.classList.remove(`chat-style-${i}`));
        }
        // Applica nuovo
        document.querySelectorAll('.studio-main').forEach(el => {
            if(el.id !== 'emptyState') {
                el.classList.add(`chat-style-${idx}`);
                el.style.backgroundImage = ''; // Clear inline styles if they had one
            }
        });
        currentStyleIdx = idx; // Update the internal ticker when swapped externally
    };

    // Caricamento Dati e Inizializzazione Sfondo
    async function init() {
        window.applyChatStyle(currentStyleIdx);

        try {
            const response = await fetch(`http://localhost:3000/api/materie?utente_id=${user.id}`);
            const materie = await response.json();
            
            sidebarList.innerHTML = '';
            
            if (materie.length === 0) {
                sidebarList.innerHTML = '<p style="padding: 1rem;" class="text-secondary">Nessuna materia. Vai in Dashboard per crearla!</p>';
            }

            materie.forEach(m => {
                const outerDiv = document.createElement('div');
                outerDiv.className = 'materia-container';

                const itemDiv = document.createElement('div');
                itemDiv.className = `materia-item ${m.id == currentMateriaId ? 'active' : ''}`;
                itemDiv.innerHTML = `
                    <div class="materia-title-list">${m.nome_materia}</div>
                    <div class="materia-desc-list">CFU: ${m.cfu}</div>
                `;
                
                const filesDiv = document.createElement('div');
                filesDiv.className = 'materia-files hidden';
                filesDiv.id = `files-${m.id}`;
                filesDiv.style.padding = '0.5rem 1.5rem 1rem 1.5rem';
                filesDiv.style.backgroundColor = '#F8F9FA';
                filesDiv.innerHTML = `
                    <p class="text-secondary" style="font-size: 0.8rem; margin-bottom: 0.5rem;">File inclusi:</p>
                    <ul id="list-files-${m.id}" style="font-size: 0.85rem; padding-left: 1.2rem; margin-bottom: 0.8rem; color: var(--text-secondary);">
                        <li>${m.file_appunti ? '📁 Principale' : 'Nessun file'}</li>
                    </ul>
                    <button class="btn-secondary add-file-studio-btn" data-id="${m.id}" style="width: 100%; padding: 0.4rem; font-size: 0.8rem; border-radius: 8px;">📎 Aggiungi Materiale</button>
                `;

                outerDiv.appendChild(itemDiv);
                outerDiv.appendChild(filesDiv);
                sidebarList.appendChild(outerDiv);
                
                itemDiv.addEventListener('click', () => {
                    selezionaMateria(m);
                    document.querySelectorAll('.materia-files').forEach(el => el.classList.add('hidden'));
                    filesDiv.classList.remove('hidden');
                    fetchExtraFiles(m.id);
                });

                if (m.id == currentMateriaId) {
                    selezionaMateria(m, false);
                    filesDiv.classList.remove('hidden');
                    fetchExtraFiles(m.id);
                }
            });

            // Bind add buttons
            document.querySelectorAll('.add-file-studio-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    currentUploadMateriaId = e.target.dataset.id;
                    studioAddFileInput.click();
                });
            });

        } catch (e) {
            console.error(e);
            sidebarList.innerHTML = '<p class="text-danger" style="padding: 1rem;">Errore di caricamento.</p>';
        }
    }

    btnCambiaStile.addEventListener('click', () => {
        currentStyleIdx = parseInt(currentStyleIdx) + 1;
        if(currentStyleIdx > 8) currentStyleIdx = 1;
        localStorage.setItem('chat_style_idx', currentStyleIdx.toString());
        window.applyChatStyle(currentStyleIdx);
    });

    // Reset Chat
    btnResetChat.addEventListener('click', () => {
        if(!confirm("Vuoi davvero cancellare l'intera conversazione?")) return;
        chatHistory = [];
        const subjectName = document.getElementById('chatTitle').textContent;
        chatArea.innerHTML = `
            <div class="message ai">
                Chat riavviata. Ho ricaricato il contesto per <strong>${subjectName}</strong>.<br>
                Come posso aiutarti a studiare oggi?
            </div>
        `;
    });

    async function fetchExtraFiles(id) {
        try {
            const res = await fetch(`http://localhost:3000/api/materie/${id}/materiali`);
            const files = await res.json();
            const ul = document.getElementById(`list-files-${id}`);
            if(!ul) return;
            
            // Keep first li (principale) and remove others to refresh
            while (ul.children.length > 1) {
                ul.removeChild(ul.lastChild);
            }

            files.forEach(f => {
                const li = document.createElement('li');
                li.innerHTML = `📄 ${(f.nome_file || 'File').substring(0, 20)}...`;
                ul.appendChild(li);
            });
        } catch (e) { console.error(e); }
    }

    studioAddFileInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file || !currentUploadMateriaId) return;

        const formData = new FormData();
        formData.append('file_appunti', file);
        document.querySelector(`.add-file-studio-btn[data-id="${currentUploadMateriaId}"]`).textContent = 'Caricamento...';

        try {
            const response = await fetch(`http://localhost:3000/api/materie/${currentUploadMateriaId}/materiali`, {
                method: 'POST', body: formData
            });

            if (response.ok) {
                fetchExtraFiles(currentUploadMateriaId);
                alert('Materiale aggiunto alla materia!');
            } else alert('Errore upload.');
        } catch (error) {
            console.error(error);
        } finally {
            document.querySelector(`.add-file-studio-btn[data-id="${currentUploadMateriaId}"]`).textContent = '📎 Aggiungi Materiale';
            studioAddFileInput.value = '';
        }
    });

    function selezionaMateria(materia, clickEvent = true) {
        currentMateriaId = materia.id;
        localStorage.setItem('currentMateriaId', currentMateriaId);
        
        document.querySelectorAll('.materia-item').forEach(item => {
            item.classList.remove('active');
            if(item.innerHTML.includes(materia.nome_materia)) item.classList.add('active');
        });

        emptyState.classList.add('hidden');
        emptyState.style.display = 'none';
        chatContainer.style.display = 'flex';
        chatTitle.textContent = materia.nome_materia;
        
        chatHistory = [];
        chatArea.innerHTML = `
            <div class="message ai">
                Ho caricato la scheda e i tuoi appunti per <strong>${materia.nome_materia}</strong>.<br>
                Come posso aiutarti a studiare oggi?
            </div>
        `;
    }

    function addMessage(text, role) {
        const div = document.createElement('div');
        div.className = `message ${role}`;
        
        if(role === 'ai') {
            text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
            text = text.replace(/\n/g, '<br>');
        }

        div.innerHTML = text;
        chatArea.appendChild(div);
        chatArea.scrollTop = chatArea.scrollHeight;
    }

    async function inviaMessaggio(testoVisuale, testoNascosto = null) {
        if (!currentMateriaId) return;
        
        const messageToSend = testoNascosto || testoVisuale;
        
        addMessage(testoVisuale, 'user');
        chatInput.value = '';
        chatInput.focus();
        sendBtn.disabled = true;

        const loadingId = 'loading-' + Date.now();
        const loadingDiv = document.createElement('div');
        loadingDiv.className = 'message ai text-secondary';
        loadingDiv.id = loadingId;
        loadingDiv.textContent = 'Sto pensando...';
        chatArea.appendChild(loadingDiv);
        chatArea.scrollTop = chatArea.scrollHeight;

        try {
            const response = await fetch('http://localhost:3000/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    materia_id: currentMateriaId,
                    message: messageToSend,
                    history: chatHistory
                })
            });
            
            if (!response.ok) throw new Error('Errore di connessione');

            const data = await response.json();
            document.getElementById(loadingId).remove();
            
            addMessage(data.response, 'ai');
            if (window.MathJax) { 
                MathJax.typesetPromise().then(() => { console.log('Math rendered'); }); 
            }
            
            chatHistory.push({ role: 'user', parts: [{ text: messageToSend }] });
            chatHistory.push({ role: 'model', parts: [{ text: data.response }] });

        } catch (e) {
            console.error(e);
            document.getElementById(loadingId).remove();
            addMessage('Errore comunicando col server.', 'ai');
        } finally {
            sendBtn.disabled = false;
        }
    }

    chatForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const msg = chatInput.value.trim();
        if(msg) inviaMessaggio(msg);
    });

    let pomodoroInterval;
    let timeRemaining = 25 * 60;
    
    btnPomodoro.addEventListener('click', () => {
        if (pomodoroInterval) {
            clearInterval(pomodoroInterval);
            pomodoroInterval = null;
            timeRemaining = 25 * 60;
            btnPomodoro.textContent = '⏱️ 25:00';
            return;
        }
        pomodoroInterval = setInterval(() => {
            timeRemaining--;
            let mins = Math.floor(timeRemaining / 60);
            let secs = timeRemaining % 60;
            btnPomodoro.textContent = `⏱️ ${mins.toString().padStart(2,'0')}:${secs.toString().padStart(2,'0')}`;
            if(timeRemaining <= 0) {
                clearInterval(pomodoroInterval);
                pomodoroInterval = null;
                alert("Pomodoro terminato!");
                btnPomodoro.textContent = '⏱️ 25:00';
            }
        }, 1000);
    });

    btnAiuto.addEventListener('click', () => {
        const promptVisibile = "(Aiuto concetto)";
        const promptNascosto = "L'utente non ha capito l'ultima risposta. Spiega in modo semplicissimo come faresti con un principiante.";
        inviaMessaggio(promptVisibile, promptNascosto);
    });

    btnDistraggo.addEventListener('click', () => {
        const promptVisibile = "(Distrazione)";
        const promptNascosto = "L'utente si sta distraendo. Intervieni subito facendogli una domanda interattiva per ripristinare la concentrazione.";
        inviaMessaggio(promptVisibile, promptNascosto);
    });

    init();
});
