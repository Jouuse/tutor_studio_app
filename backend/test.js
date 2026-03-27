require('dotenv').config();

fetch('https://generativelanguage.googleapis.com/v1beta/models?key=' + process.env.GEMINI_API_KEY)
    .then(res => res.json())
    .then(data => {
        if (data.models) {
            console.log("✅ I modelli che puoi usare sono:");
            // Filtriamo solo quelli che si chiamano "gemini"
            data.models
                .map(m => m.name.replace('models/', ''))
                .filter(name => name.includes('gemini'))
                .forEach(name => console.log("- " + name));
        } else {
            console.log("❌ Errore con l'API Key:", data);
        }
    })
    .catch(err => console.error("Errore di connessione:", err));