require('dotenv').config();
const express = require('express');
const mysql = require('mysql2/promise');
const multer = require('multer');
const path = require('path');
const cors = require('cors');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
const prompts = require('./prompts');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'frontend')));

// Assicura che la directory uploads esista
const uploadsDir = path.join(__dirname, '..', 'frontend', 'uploads_appunti');
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
    
    // Auto-migrate new table for multi-file suppport
    pool.execute(`
        CREATE TABLE IF NOT EXISTS materiali_extra (
            id INT AUTO_INCREMENT PRIMARY KEY,
            materia_id INT NOT NULL,
            nome_file VARCHAR(255) NOT NULL,
            creato_il TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (materia_id) REFERENCES materie(id) ON DELETE CASCADE
        )
    `).then(() => console.log("Tabella materiali_extra verificata"))
    .catch(err => console.error("Errore creazione tabella materiali_extra:", err));

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
        let systemInstruction = `${prompts.systemInstruction}\n\nAttualmente stai aiutando lo studente nella materia: "${materia.nome_materia}".\n\n`;

        if (materia.scheda_trasparenza) {
            systemInstruction += `Il programma (Scheda Trasparenza) è il seguente:\n${materia.scheda_trasparenza}\n\n`;
        }
        if (materia.appunti) {
            systemInstruction += `Gli appunti dello studente sono:\n${materia.appunti}\n\n`;
        }

        if (materia.file_appunti) {
            systemInstruction += `Lo studente ha un file principale allegato: "${materia.file_appunti}". Usalo come riferimento.\n\n`;
        }

        // Aggiungi file extra dal database
        const [extraFiles] = await pool.execute('SELECT nome_file FROM materiali_extra WHERE materia_id = ?', [materia_id]);
        if (extraFiles.length > 0) {
            systemInstruction += `Lo studente ha anche aggiunto questi altri materiali alla materia (riferimento a file caricati): `;
            const fileNames = extraFiles.map(f => `"${f.nome_file}"`).join(', ');
            systemInstruction += `${fileNames}.\n\n`;
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

// 5. Materiali Aggiuntivi: Recupera
app.get('/api/materie/:id/materiali', async (req, res) => {
    try {
        const { id } = req.params;
        const [rows] = await pool.execute('SELECT * FROM materiali_extra WHERE materia_id = ?', [id]);
        res.json(rows);
    } catch (err) {
        console.error("Errore in GET /api/materie/:id/materiali:", err);
        res.status(500).json({ error: 'Errore del server' });
    }
});

// 6. Materiali Aggiuntivi: Carica
app.post('/api/materie/:id/materiali', upload.single('file_appunti'), async (req, res) => {
    try {
        const { id } = req.params;
        const file_appunti = req.file ? req.file.filename : null;

        if (!file_appunti) {
            return res.status(400).json({ error: 'Nessun file caricato' });
        }

        const [result] = await pool.execute(
            'INSERT INTO materiali_extra (materia_id, nome_file) VALUES (?, ?)',
            [id, file_appunti]
        );

        res.status(201).json({ message: 'File aggiunto', id: result.insertId, nome_file: file_appunti });
    } catch (err) {
        console.error("Errore in POST /api/materie/:id/materiali:", err);
        res.status(500).json({ error: 'Errore del server' });
    }
});

// 7. Elimina materia
app.delete('/api/materie/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const [result] = await pool.execute('DELETE FROM materie WHERE id = ?', [id]);
        if (result.affectedRows === 0) return res.status(404).json({ error: 'Materia non trovata' });
        res.json({ message: 'Materia eliminata' });
    } catch (err) {
        console.error("Errore in DELETE /api/materie:", err);
        res.status(500).json({ error: 'Errore del server' });
    }
});

// 6. Rinomina materia
app.put('/api/materie/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { nome_materia } = req.body;
        if (!nome_materia) return res.status(400).json({ error: 'Nome richiesto' });
        
        const [result] = await pool.execute('UPDATE materie SET nome_materia = ? WHERE id = ?', [nome_materia, id]);
        if (result.affectedRows === 0) return res.status(404).json({ error: 'Materia non trovata' });
        res.json({ message: 'Materia rinominata' });
    } catch (err) {
        console.error("Errore in PUT /api/materie:", err);
        res.status(500).json({ error: 'Errore del server' });
    }
});

// Start Server
app.listen(PORT, () => {
    console.log(`Server Tutor Studio in ascolto sulla porta ${PORT}`);
});
