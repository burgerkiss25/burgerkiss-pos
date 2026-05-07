# Online Datenbank einrichten (Firebase Realtime Database)

## Wo du gerade bist
Wenn du in Firebase **Realtime Database -> Data** siehst und dort oben eine URL wie
`https://...firebasedatabase.app` angezeigt wird, ist die Datenbank bereits erstellt.
Kopiere diese URL: Sie muss später als `databaseURL` in `firebase-config.js` stehen.

## 1) Firebase Projekt erstellen
1. Öffne Firebase Console.
2. Neues Projekt anlegen.
3. Web App hinzufügen.
4. Firebase Web Config kopieren.

## 2) Realtime Database aktivieren
1. In Firebase -> Build -> Realtime Database.
2. Datenbank erstellen.
3. Region wählen.
4. Start im Testmodus (oder Regeln unten setzen).

## 3) Anonymous Authentication aktivieren
Die POS-App meldet sich automatisch anonym bei Firebase an. Dafür muss der Provider aktiv sein:

1. In Firebase links **Authentication** öffnen.
2. **Get started** klicken, falls Authentication noch nicht eingerichtet ist.
3. Tab **Sign-in method** öffnen.
4. Provider **Anonymous** auswählen.
5. **Enable** aktivieren und speichern.

Ohne diesen Schritt blockieren die empfohlenen Regeln (`auth != null`) den Zugriff.

## 4) Web-App Config holen
1. In Firebase auf **Project Overview** gehen.
2. **Add app** klicken.
3. Web-App Symbol `</>` auswählen.
4. App-Namen eingeben, z. B. `burgerkiss-pos-web`.
5. App registrieren.
6. Den Config-Block kopieren.

Wichtig: Firebase zeigt manchmal Beispielcode mit `import { initializeApp } ...` und `const app = initializeApp(...)`.
Diese `import`- und Initialisierungszeilen nicht in `firebase-config.js` kopieren; die POS-App lädt die passenden Firebase-Skripte bereits in `index.html`.
Kopiere nur das Objekt mit den Werten in `window.FIREBASE_CONFIG`.

## 5) Konfigurationsdatei in der App
1. `firebase-config.example.js` nach `firebase-config.js` kopieren, falls du neu startest.
2. In `firebase-config.js` `window.FIREBASE_CONFIG` mit deinen Werten füllen.
3. Wichtig: Ergänze `databaseURL` mit der URL aus **Realtime Database -> Data**.
4. Optional Pfad/Slot ändern:
   - `window.BK_SYNC_PATH` (Standard: `/pos/live`)
   - `window.BK_SYNC_FORCE_SLOT` (Standard: `SN1`)

Beispiel:

```js
window.FIREBASE_CONFIG = {
  apiKey: '...',
  authDomain: 'burgerkiss-pos-system.firebaseapp.com',
  databaseURL: 'https://burgerkiss-pos-system-default-rtdb.europe-west1.firebasedatabase.app',
  projectId: 'burgerkiss-pos-system',
  storageBucket: 'burgerkiss-pos-system.appspot.com',
  messagingSenderId: '...',
  appId: '...'
};
```

## 6) Empfohlene Realtime Database Rules
In Firebase **Realtime Database -> Rules** einfügen und veröffentlichen:

```json
{
  "rules": {
    "pos": {
      "live": {
        "$slot": {
          ".read": "auth != null",
          ".write": "auth != null"
        }
      }
    }
  }
}
```

## 7) Deploy / Hosting
- Stelle sicher, dass `firebase-config.js` zusammen mit `index.html` ausgeliefert wird.
- Öffne die POS-App auf zwei Geräten und prüfe, ob Änderungen live sichtbar sind.

## Schnelltest in der Firebase Console
1. POS-App öffnen.
2. Einen Artikel hinzufügen.
3. In Firebase **Realtime Database -> Data** öffnen.
4. Es sollte ein Pfad wie `pos / live / SN1` erscheinen.
5. Bestellung abschließen und History auf einem zweiten Gerät öffnen.
6. Ein Bild im Admin-Bereich speichern und die POS-App auf einem zweiten Gerät neu laden.

Erwartete Online-Pfade:
- Live-Bestellung: `pos / live / SN1`
- Abgeschlossene Bestellungen: `pos / history`
- Produktbilder: `pos / config / images`

## Hinweis
- Die App speichert weiterhin lokal (`localStorage`) als Fallback.
- Online Sync und State-Persistenz aktivieren sich nur, wenn `window.FIREBASE_CONFIG` gesetzt ist.
