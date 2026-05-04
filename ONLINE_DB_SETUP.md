# Online Datenbank einrichten (Firebase Realtime Database)

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

## 3) Konfigurationsdatei in der App
1. `firebase-config.example.js` nach `firebase-config.js` kopieren.
2. In `firebase-config.js` `window.FIREBASE_CONFIG` mit deinen Werten füllen.
3. Optional Pfad/Slot ändern:
   - `window.BK_SYNC_PATH` (Standard: `/pos/live`)
   - `window.BK_SYNC_FORCE_SLOT` (Standard: `SN1`)

## 4) Empfohlene Realtime Database Rules
> Passe `burgerkiss-pos` auf deine Projekt-ID an.

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

## 5) Deploy / Hosting
- Stelle sicher, dass `firebase-config.js` zusammen mit `index.html` ausgeliefert wird.
- Öffne die POS-App auf zwei Geräten und prüfe, ob Änderungen live sichtbar sind.

## Hinweis
- Die App speichert weiterhin lokal (`localStorage`) als Fallback.
- Online Sync und State-Persistenz aktivieren sich nur, wenn `window.FIREBASE_CONFIG` gesetzt ist.
