document.addEventListener('DOMContentLoaded', () => {
    // Controllo login
    const userStr = localStorage.getItem('user');
    if (!userStr) {
        window.location.href = '/index.html';
        return;
    }
    const user = JSON.parse(userStr);
    
    // Stato dell'app
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

    // Carica lista materie a sinistra
    async function init() {
        try {
            const response = await fetch(`/api/materie?utente_id=${user.id}`);
            const materie = await response.json();
            
            sidebarList.innerHTML = '';
            materie.forEach(m => {
                const div = document.createElement('div');
                div.className = `materia-item ${m.id == currentMateriaId ? 'active' : ''}`;
                div.innerHTML = `<strong>${m.nome_materia}</strong>`;
                div.addEventListener('click', () => selezionaMateria(m));
                sidebarList.appendChild(div);
                
                // Se era quella salvata, avviala
                if (m.id == currentMateriaId) {
                    selezionaMateria(m, false);
                }
            });
        } catch (e) {
            console.error(e);
        }
    }

    function selezionaMateria(materia, clickEvent = true) {
        currentMateriaId = materia.id;
        localStorage.setItem('currentMateriaId', currentMateriaId);
        
        // Update UI
        document.querySelectorAll('.materia-item').forEach(item => {
            item.classList.remove('active');
            if(item.innerHTML.includes(materia.nome_materia)) item.classList.add('active');
        });

        emptyState.style.display = 'none';
        chatContainer.style.display = 'flex';
        chatTitle.textContent = materia.nome_materia;
        
        // Reset chat history for visual and logic
        chatHistory = [];
        chatArea.innerHTML = `
            <div class="message ai">
                Ho caricato la scheda e i tuoi appunti per <strong>${materia.nome_materia}</strong>.<br>
                Come posso aiutarti a studiare oggi?
            </div>
        `;
    }

    // Aggiungi messaggio UI
    function addMessage(text, role) {
        const div = document.createElement('div');
        div.className = `message ${role}`; // 'user' o 'ai'
        
        // Se è testo AI, proviamo a mantenere gli a capo (base formatter)
        if(role === 'ai') {
            text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>'); // bold
            text = text.replace(/\n/g, '<br>');
        }

        div.innerHTML = text;
        chatArea.appendChild(div);
        chatArea.scrollTop = chatArea.scrollHeight;
    }

    // Invio form a Gemini
    async function inviaMessaggio(testoVisuale, testoNascosto = null) {
        if (!currentMateriaId) return;
        
        const messageToSend = testoNascosto || testoVisuale;
        
        // UI Update
        addMessage(testoVisuale, 'user');
        chatInput.value = '';
        chatInput.focus();
        sendBtn.disabled = true;

        // Temporary Loading AI Message
        const loadingId = 'loading-' + Date.now();
        const loadingDiv = document.createElement('div');
        loadingDiv.className = 'message ai text-secondary';
        loadingDiv.id = loadingId;
        loadingDiv.textContent = 'Pensando...';
        chatArea.appendChild(loadingDiv);
        chatArea.scrollTop = chatArea.scrollHeight;

        try {
            const response = await fetch('/api/chat', {
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
            
            // Remove loading
            document.getElementById(loadingId).remove();
            
            // Add to UI
            addMessage(data.response, 'ai');
            
            // Aggiorna history
            chatHistory.push({ role: 'user', parts: [{ text: messageToSend }] });
            chatHistory.push({ role: 'model', parts: [{ text: data.response }] });

        } catch (e) {
            console.error(e);
            document.getElementById(loadingId).remove();
            addMessage('Errore di comunicazione con il tutor. Riprova.', 'ai');
        } finally {
            sendBtn.disabled = false;
        }
    }

    chatForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const msg = chatInput.value.trim();
        if(msg) inviaMessaggio(msg);
    });

    // --- PULSANTI SPECIALI ---

    // 1. Pomodoro Timer
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
                alert("Pomodoro terminato! Fai una pausa!");
                btnPomodoro.textContent = '⏱️ 25:00';
            }
        }, 1000);
    });

    // 2. Aiuto
    btnAiuto.addEventListener('click', () => {
        const promptVisibile = "(Richiesta di aiuto per l'ultimo concetto)";
        const promptNascosto = "L'utente non ha capito. Spiega l'ultimo concetto in modo semplicissimo, come a un bambino, con un esempio pratico.";
        inviaMessaggio(promptVisibile, promptNascosto);
    });

    // 3. Mi Distraggo
    btnDistraggo.addEventListener('click', () => {
        const promptVisibile = "(Segnalazione distrazione)";
        const promptNascosto = "L'utente si sta distraendo. Rimproveralo simpaticamente e fagli una domanda a bruciapelo facilissima sull'argomento per farlo concentrare.";
        inviaMessaggio(promptVisibile, promptNascosto);
    });

    init();
});
