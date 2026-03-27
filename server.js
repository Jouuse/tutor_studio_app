require('dotenv').config();
const express = require('express');
const mysql = require('mysql2/promise');
const multer = require('multer');
const path = require('path');
const cors = require('cors');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Assicura che la directory uploads esista
const uploadsDir = path.join(__dirname, 'public', 'uploads_appunti');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Multer Setup
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadsDir);
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname.replace(/\s+/g, '_'));
    }
});
const upload = multer({ storage: storage });

// Database Connection
const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'tutor_studio'
};

let pool;
try {
    pool = mysql.createPool(dbConfig);
    console.log("Connessione al database configurata.");
} catch (err) {
    console.error("Errore di configurazione DB:", err);
}

// Gemini API Setup
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || 'YOUR_API_KEY_HERE');

// --- Endpoints ---

// 1. Login/Registrazione
app.post('/api/login', async (req, res) => {
    try {
        const { nome, cognome, corso_laurea, tipo_laurea } = req.body;

        if (!nome || !cognome) {
            return res.status(400).json({ error: 'Nome e cognome sono obbligatori' });
        }

        // Cerca utente
        const [rows] = await pool.execute(
            'SELECT * FROM utenti WHERE nome = ? AND cognome = ?',
            [nome, cognome]
        );

        if (rows.length > 0) {
            return res.json({ message: 'Login effettuato', user: rows[0] });
        }

        // Registra nuovo utente se non esiste
        const [result] = await pool.execute(
            'INSERT INTO utenti (nome, cognome, corso_laurea, tipo_laurea) VALUES (?, ?, ?, ?)',
            [nome, cognome, corso_laurea, tipo_laurea]
        );

        const newUser = {
            id: result.insertId,
            nome, cognome, corso_laurea, tipo_laurea
        };

        res.status(201).json({ message: 'Utente registrato', user: newUser });

    } catch (err) {
        console.error("Errore in /api/login:", err);
        res.status(500).json({ error: 'Errore del server' });
    }
});

// 2. Recupera materie per un utente
app.get('/api/materie', async (req, res) => {
    try {
        const userId = req.query.utente_id;
        if (!userId) {
            return res.status(400).json({ error: 'utente_id è richiesto' });
        }

        const [rows] = await pool.execute('SELECT * FROM materie WHERE utente_id = ?', [userId]);
        res.json(rows);
    } catch (err) {
        console.error("Errore in GET /api/materie:", err);
        res.status(500).json({ error: 'Errore del server' });
    }
});

// 3. Aggiungi nuova materia con file
app.post('/api/materie', upload.single('file_appunti'), async (req, res) => {
    try {
        const { utente_id, nome_materia, cfu, anno, scheda_trasparenza, appunti } = req.body;
        const file_appunti = req.file ? req.file.filename : null;

        if (!utente_id || !nome_materia) {
            return res.status(400).json({ error: 'Dati mancanti' });
        }

        const [result] = await pool.execute(
            'INSERT INTO materie (utente_id, nome_materia, cfu, anno, scheda_trasparenza, appunti, file_appunti) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [utente_id, nome_materia, cfu, anno, scheda_trasparenza, appunti, file_appunti]
        );

        res.status(201).json({ message: 'Materia salvata', materia_id: result.insertId });
    } catch (err) {
        console.error("Errore in POST /api/materie:", err);
        res.status(500).json({ error: 'Errore del server' });
    }
});

// 4. Chat con Gemini
app.post('/api/chat', async (req, res) => {
    try {
        const { materia_id, message, history } = req.body;

        if (!materia_id || !message) {
            return res.status(400).json({ error: 'materia_id e message sono richiesti' });
        }

        // Recupera dati materia
        const [rows] = await pool.execute('SELECT * FROM materie WHERE id = ?', [materia_id]);
        if (rows.length === 0) {
            return res.status(404).json({ error: 'Materia non trovata' });
        }

        const materia = rows[0];

        // Costruisci le System Instructions
        let systemInstruction = `Sei un tutor severo ma utile, esperto della materia "${materia.nome_materia}". `;
        systemInstruction += `Devi rispondere SOLO a domande riguardanti questa materia. Se l'utente fa domande su altri argomenti, rifiutati di rispondere e riportalo allo studio con tono severo ma costruttivo.\n\n`;

        if (materia.scheda_trasparenza) {
            systemInstruction += `Il programma (Scheda Trasparenza) è il seguente:\n${materia.scheda_trasparenza}\n\n`;
        }
        if (materia.appunti) {
            systemInstruction += `Gli appunti dello studente sono:\n${materia.appunti}\n\n`;
        }

        // Al momento, il file PDF viene solo segnalato per contesto.
        // L'analisi diretta del PDF con Google Generative AI File API richiederebbe l'upload sui server di Google
        // cosa che possiamo implementare ma per il momento forniamo il nome del file nelle istruzioni.
        if (materia.file_appunti) {
            systemInstruction += `Lo studente ha un file allegato: "${materia.file_appunti}". Usalo come riferimento.\n\n`;
        }

        const model = genAI.getGenerativeModel({
            model: "gemini-flash-latest",
            systemInstruction: systemInstruction,
            generationConfig: {
                temperature: 0.3,
            }
        });

        // Avvia chat con eventuale history
        const chatSession = model.startChat({
            history: history || []
        });

        const result = await chatSession.sendMessage(message);

        res.json({ response: result.response.text() });

    } catch (err) {
        console.error("Errore in /api/chat:", err);
        res.status(500).json({ error: 'Errore durante la comunicazione con Gemini' });
    }
});

// Start Server
app.listen(PORT, () => {
    console.log(`Server Tutor Studio in ascolto sulla porta ${PORT}`);
});
