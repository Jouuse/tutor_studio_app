# 📚 Tutor Studio App di VITO CIRO vito.ciro@community.unipa.it / vitociro13@gmail.com

# LINK YT VIDEO RISULTATO FINALE -> https://youtu.be/zV1vgnv7LeU


 Questo è il repository del **Tutor Studio**. L'idea è creare un ambiente di studio assistito dall'IA che non sia solo una chat, ma un vero hub organizzato. 
## 🌿 I Branch (Checkpoint del lavoro)
Ho lavorato a pezzi usando i branch, così se rompevo qualcosa potevo tornare indietro, sono tre versioni del progetto, quella finale è **`pausa-scacchi`** in cui c'è tutto, ho lasciato tutti i branch così che si potesse vedere lo storico degli aggiornamenti:

1. **`versione-ordinata`**: Qui ho fatto il restyle grafico totale. Ho sistemato i bug dello sfondo (che prima era statico e noioso) e ho aggiunto le prime feature per rendere l'app meno vuota.
2. **`architettura-separata`**: Il core del refactoring. Ho spostato tutto nelle sottocartelle frontend/backend.
3. **`pausa-scacchi`**: Una feature aggiunta al volo per staccare tra una sessione di studio e l'altra (trovi il tasto nella dashboard).

## 🛠️ Com'è strutturato (Architettura)
Ho diviso il progetto in due macro-aree per non impazzire con i file:
- **/frontend**: Tutta la parte visiva (HTML, CSS moderno con Glassmorphism e JS per la UI).
- **/backend**: Il "motore" in Node.js che gestisce le chiamate alle API di Gemini e il caricamento dei file.
## 🗄️ Gestione Dati (SQL)
Per rendere l'app seria, non ho salvato i dati "a caso". Ho usato **SQL** per gestire il database:
* **Persistenza**: Gli utenti e le sessioni di studio sono salvati nel DB, così anche se riavvio il server non si perde nulla.
* **Relazioni**: Ho strutturato le tabelle per collegare ogni materia al file corretto, evitando duplicati o errori nel caricamento.


## 🚀 Come farlo girare
1. Vai nella cartella `backend`.
2. Lancia `npm install` (se hai aggiunto nuove dipendenze).
3. `node server.js` e sei online su `localhost:3000`.

## 📌 Note tecniche
- **MathJax**: Gestisce le formule LaTeX (integrali, derivate, ecc.) così l'IA non scrive geroglifici.
- **LocalStorage**: Salva la tua scelta dello sfondo della chat, così non devi rimetterlo ogni volta.
