# BurgerKiss POS Online-DB Roadmap

Ziel: Die App soll zuerst praktisch und sichtbar auf allen Geräten funktionieren. Sicherheit bleibt wichtig, kommt aber bewusst als letzter Schritt, wenn Bilder, Historie, Stock und Sync stabil laufen.

## Grundprinzip

Alles bleibt getrennt und nachvollziehbar:

- `firebase-config.js`: Firebase-Zugang und globale Sync-Flags.
- `sync_poll.js`: Live-Sync für aktive Bestellungen/Kassen-Slot.
- `state.js`: aktueller POS-Zustand und Bestellungen.
- `images.js`: Produktbilder.
- `products.js`: Produktliste.
- `prices.js`: Preise.
- `stock.js`, `stock_data.js`, `stock_utils.js`: Lagerbestand, Zutaten, Rezepte und Add-ons.
- `ONLINE_DB_SETUP.md`: Firebase-Einrichtung.
- `ONLINE_DB_ROADMAP.md`: dieser Arbeitsplan.

In Firebase sollen die Bereiche ebenfalls separat lesbar und später bearbeitbar sein, z. B.:

```txt
pos/
  live/
    SN1/
      state
  history/
  catalog/
    products
    prices
  config/
    images
  stock/
    inventory
    ingredients
    recipes
    addons
```

## Phase 1: Jetzt sichtbar machen, dass Online-DB funktioniert

Status: **gestartet und in Firebase sichtbar**. In der Realtime Database ist `pos/live/SN1` sichtbar; damit ist bestätigt, dass die App grundsätzlich in die Online-DB schreibt.

Ziel: Wir sehen in Firebase sofort, dass die App schreibt und liest.

1. Realtime Database auf **Data** öffnen.
2. POS-App öffnen.
3. Einen Artikel hinzufügen.
4. Prüfen, ob in Firebase ein Pfad wie `pos / live / SN1` erscheint.
5. Zweites Gerät oder zweites Browser-Fenster öffnen.
6. Prüfen, ob Änderungen nach 1-3 Sekunden sichtbar werden.

Erfolgskriterium:

- Bestellungen erscheinen auf mehreren Geräten.
- Firebase zeigt Daten unter `pos/live/SN1`.
- Keine roten Fehler in der Browser-Konsole.

Noch zu prüfen, bevor Phase 1 komplett abgeschlossen ist:

- In der POS-App einen echten Artikel hinzufügen und prüfen, ob `pos/live/SN1/slot/items` in Firebase gefüllt wird.
- Die POS-App in einem zweiten Browser/Fenster öffnen und prüfen, ob derselbe Artikel dort automatisch erscheint.
- In der Browser-Konsole `window.BK_SYNC` prüfen; `status` soll `online` sein und `lastError` soll `null` sein.

## Phase 2: Bilder überall sichtbar machen

Status: **gestartet**. `images.js` lädt und speichert Bild-Overrides jetzt zusätzlich online unter `pos/config/images`, bleibt aber lokal als Fallback nutzbar.

Ziel: Produktbilder sollen nicht nur lokal im Browser gespeichert sein, sondern online geteilt werden.

1. Aktuellen `images.js`-Speicher prüfen.
2. Online-Pfad `pos/config/images` einführen.
3. Beim Laden zuerst Online-Bilder holen.
4. Beim Speichern Bilder/URLs online schreiben.
5. Admin-Editor testen.
6. POS auf zweitem Gerät öffnen und prüfen, ob Bilder identisch sind.

Erfolgskriterium:

- Bildänderung im Admin ist nach Reload/auf anderem Gerät sichtbar.
- Firebase zeigt `pos/config/images` separat an.

## Phase 3: Produkte und Preise online machen

Status: **gestartet**. `products.js` und `prices.js` laden/speichern jetzt zusätzlich online unter `pos/catalog/products` und `pos/catalog/prices`, bleiben aber lokal als Fallback nutzbar.

Ziel: Produkte und Preise sollen zentral in Firebase liegen und überall gleich sein.

1. `products.js` online-fähig machen.
2. `prices.js` online-fähig machen.
3. Firebase-Pfade verwenden:
   - `pos/catalog/products`
   - `pos/catalog/prices`
4. Admin-Editor speichert online.
5. POS lädt Produkte/Preise online, nutzt lokal nur als Fallback.

Erfolgskriterium:

- Preisänderung im Admin ist auf anderem Gerät sichtbar.
- Produktänderung im Admin ist auf anderem Gerät sichtbar.
- Firebase zeigt Produkte und Preise separat an.

## Phase 4: Stock online machen

Status: **gestartet**. `stock.js` lädt/speichert Zutaten und Rezepte jetzt online und schreibt zusätzlich getrennte Ansichten für Inventory und Add-ons.

Ziel: Lagerbestand, Zutaten, Rezepte und Add-ons sollen auf allen Geräten gleich sein.

1. Aktuelle Stock-Dateien prüfen:
   - `stock.js`
   - `stock_data.js`
   - `stock_utils.js`
2. Online-Pfade einführen:
   - `pos/stock/inventory`
   - `pos/stock/ingredients`
   - `pos/stock/recipes`
   - `pos/stock/addons`
3. Stock beim Start online laden.
4. Stock-Änderungen aus Admin online speichern.
5. Verbrauch durch Verkäufe sauber online aktualisieren.
6. Konflikte vermeiden: Wenn zwei Geräte gleichzeitig verkaufen, darf Stock nicht falsch überschrieben werden.

Erfolgskriterium:

- Stock-Änderung auf Gerät A ist auf Gerät B sichtbar.
- Verkauf reduziert Stock zuverlässig.
- Firebase zeigt Stock separat und verständlich an.

## Phase 5: Historie übersichtlich und online machen

Status: **gestartet**. Ausgegebene Bestellungen werden jetzt zusätzlich online unter `pos/history/YYYY-MM-DD/orderId` gespeichert und beim Öffnen der History mit lokalen Einträgen zusammengeführt.

Ziel: Abgeschlossene/ausgegebene Bestellungen sollen zentral gespeichert und übersichtlich filterbar sein.

1. History-Datenstruktur definieren.
2. Online-Pfad `pos/history/YYYY-MM-DD/orderId` nutzen.
3. Beim Abschluss/Issue Bestellung in History schreiben.
4. History-Modal nach Datum, Slot, Zahlung und Suchtext filterbar machen.
5. Export JSON/CSV weiterhin anbieten.

Erfolgskriterium:

- Abgeschlossene Bestellung bleibt nach Reload sichtbar.
- Mehrere Geräte sehen dieselbe Historie.
- Firebase zeigt Historie nach Datum sortiert an.

## Phase 6: Admin-Übersicht für Datenbankbereiche

Status: **gestartet**. `admin.html` zeigt jetzt einen Online-DB-Statusbereich, der alle wichtigen Firebase-Pfade prüft und per Refresh aktualisiert werden kann.

Ziel: Man soll in der App sehen können, welche Bereiche online sind und wann zuletzt synchronisiert wurde.

1. Admin-Seite um Statusbereich erweitern.
2. Anzeigen:
   - Firebase verbunden: ja/nein
   - letzter Sync für Live-State
   - letzter Sync für Bilder
   - letzter Sync für Produkte/Preise
   - letzter Sync für Stock
   - letzter Sync für Historie
3. Fehler sichtbar machen, ohne dass die App kaputtgeht.

Erfolgskriterium:

- Admin sieht sofort, ob Online-DB arbeitet.
- Fehler sind verständlich statt nur in der Browser-Konsole.

## Phase 7: Sicherheit als letzter Schritt

Ziel: Wenn alles fachlich funktioniert, wird Firebase sicher gemacht.

1. Test-Regeln entfernen.
2. Anonymous Auth oder echte Mitarbeiter-Logins entscheiden.
3. Rollen festlegen:
   - Kasse/Mitarbeiter
   - Admin
   - Owner
4. Rules pro Bereich absichern:
   - Mitarbeiter dürfen Bestellungen schreiben.
   - Nur Admin/Owner darf Produkte, Preise, Bilder und Stock-Struktur ändern.
   - Historie darf nicht versehentlich gelöscht werden.
5. Backup/Export-Konzept festlegen.

Erfolgskriterium:

- App funktioniert weiterhin.
- Mitarbeiter haben nur nötige Rechte.
- Admin-Bereiche sind geschützt.
- Daten können nicht versehentlich komplett gelöscht werden.

## Empfohlene Reihenfolge

1. Live-Bestellungen prüfen.
2. Bilder online machen.
3. Produkte/Preise online machen.
4. Stock online machen.
5. Historie online und übersichtlich machen.
6. Admin-Sync-Status bauen.
7. Sicherheit finalisieren.
