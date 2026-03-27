# 📚 Tutor Studio App di VITO CIRO vito.ciro@community.unipa.it / vitociro13@gmail.com

 Questo è il repository del **Tutor Studio**. L'idea è creare un ambiente di studio assistito dall'IA che non sia solo una chat, ma un vero hub organizzato. 

## 🛠️ Com'è strutturato (Architettura)
Ho diviso il progetto in due macro-aree per non impazzire con i file:
- **/frontend**: Tutta la parte visiva (HTML, CSS moderno con Glassmorphism e JS per la UI).
- **/backend**: Il "motore" in Node.js che gestisce le chiamate alle API di Gemini e il caricamento dei file.

## 🌿 I Branch (Checkpoint del lavoro)
Ho lavorato a pezzi usando i branch, così se rompevo qualcosa potevo tornare indietro:

1. **`versione-ordinata`**: Qui ho fatto il restyle grafico totale. Ho sistemato i bug dello sfondo (che prima era statico e noioso) e ho aggiunto le prime feature per rendere l'app meno vuota.
2. **`architettura-separata`**: Il core del refactoring. Ho spostato tutto nelle sottocartelle frontend/backend.
3. **`pausa-scacchi`**: Una feature aggiunta al volo per staccare tra una sessione di studio e l'altra (trovi il tasto nella dashboard).

## 🚀 Come farlo girare
1. Vai nella cartella `backend`.
2. Lancia `npm install` (se hai aggiunto nuove dipendenze).
3. `node server.js` e sei online su `localhost:3000`.

## 📌 Note tecniche
- **MathJax**: Gestisce le formule LaTeX (integrali, derivate, ecc.) così l'IA non scrive geroglifici.
- **LocalStorage**: Salva la tua scelta dello sfondo della chat, così non devi rimetterlo ogni volta.
