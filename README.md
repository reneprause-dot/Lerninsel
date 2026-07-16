# 🚗 Leo's Lerninsel

Eine kindgerechte Progressive Web App (PWA), die Kindern spielerisch dabei hilft, Gefühle zu erkennen, sich klar mitzuteilen, mit Stress umzugehen und nebenbei Farben, Formen, Zahlen, Tierlaute und Fahrzeuge kennenzulernen — verpackt in ein freundliches Auto- und Motorrad-Thema.

Keine Werbung, keine externen Konten, keine Datenweitergabe: Alle Daten bleiben ausschließlich lokal auf dem Gerät des Kindes gespeichert.

---

## Inhaltsverzeichnis

- [Über das Projekt](#über-das-projekt)
- [Funktionen im Überblick](#funktionen-im-überblick)
- [Altersstufen](#altersstufen)
- [Kategorien / Module](#kategorien--module)
- [Kategorien-Umschalter für 2-3 Jahre](#kategorien-umschalter-für-2-3-jahre)
- [Technischer Aufbau](#technischer-aufbau)
- [Projektstruktur](#projektstruktur)
- [Installation & lokales Testen](#installation--lokales-testen)
- [Deployment (z. B. GitHub Pages)](#deployment-zb-github-pages)
- [Als App installieren (PWA)](#als-app-installieren-pwa)
- [Datenschutz](#datenschutz)
- [Inhalte erweitern](#inhalte-erweitern)
- [Bekannte Grenzen](#bekannte-grenzen)

---

## Über das Projekt

Leo's Lerninsel ist eine **Single-Page-App** ohne Build-Prozess, ohne Framework und ohne Server-Backend. Sie besteht aus einer HTML-Datei, einer JavaScript-Datei und einem Service Worker für die Offline-Nutzung. Das Kind erstellt zu Beginn ein eigenes Profil (Name, Alter, Fahrzeug-Avatar, Lieblingsfarbe) und landet danach auf einer interaktiven Insel-Karte, über die es die einzelnen Lernbereiche antippen kann.

Alle Inhalte werden bei jedem Durchgang neu gemischt, sodass sich Übungen nicht stur wiederholen. Der Schwierigkeitsgrad (Rundenanzahl, Anzahl Antwortmöglichkeiten, Wortschatz) skaliert automatisch mit der eingestellten Altersstufe.

## Funktionen im Überblick

- 🗺️ **Interaktive Insel-Karte** als zentrale Navigation, mit dynamisch berechnetem Wegverlauf zwischen den sichtbaren Stationen
- 👤 **Individuelles Profil**: Name, Altersstufe, Fahrzeug-Avatar, Lieblingsfarbe als Theme-Akzent
- 🎲 **Zufällige Inhalte**: Fragen, Antwortreihenfolge und Distraktoren werden bei jeder Runde neu gemischt
- ⭐ **Sterne & Sticker** als Belohnungssystem, gespeichert im Profil
- 💛 **Elternbereich** mit Fortschrittsübersicht, Datenschutz-Hinweis, Profilverwaltung und Kategorien-Schalter
- 📱 **Vollständig responsiv**, nutzbar vom Smartphone bis zum großen Tablet
- 📦 **Installierbare PWA** mit Offline-Funktion über einen Service Worker
- 🎨 **Bewusst ruhiges Design**: Pastellfarben, große Touch-Flächen, keine Zeitdruck-Elemente, `prefers-reduced-motion` wird respektiert

## Altersstufen

Die App unterscheidet 5 Altersstufen, die intern als "Level" 1–5 geführt werden:

| Altersstufe | Level | Besonderheit |
|---|---|---|
| 2–3 Jahre | 1 | Nur 4 Kategorien gleichzeitig sichtbar (umschaltbar), 2 Antwortoptionen, kurze Runden |
| 3–4 Jahre | 2 | 3 Antwortoptionen |
| 5–6 Jahre | 3 | 4 Antwortoptionen, alle Kategorien sichtbar |
| 7–8 Jahre | 4 | Erweiterter Wortschatz (z. B. weitere Gefühle wie Stolz, Enttäuschung) |
| 9–10 Jahre | 5 | Komplexeste Inhalte (z. B. Eifersucht, Verlegenheit, soziale Konfliktsituationen) |

Inhalte sind **kumulativ**: Ein Kind auf Level 3 sieht auch alle für Level 1 und 2 freigegebenen Inhalte, plus die für Level 3 neuen. Die Rundenanzahl und Optionsanzahl pro Modul steuert die Funktion `roundCountForLevel()` / `optionCountForLevel()` in `app.js`.

## Kategorien / Module

| Modul | Symbol | Beschreibung | Ab Level |
|---|---|---|---|
| Gefühls-Tankstelle | 🚦 | Situationen dem passenden Gefühl zuordnen (großes Emoji als Hinweis) | 1 |
| Geschichten-Autobahn | 🛣️ | Kurze interaktive Bildergeschichten mit Reflexionsfrage am Ende | 1 |
| Lack-Werkstatt | 🎨 | Objekten ihre Farbe zuordnen — nur die richtige Antwort hat die korrekte Farbumrandung | 1 |
| Formen-Werkstatt | 🔺 | Alltagsgegenstände ihrer geometrischen Form zuordnen | 1 |
| Boxenstopp | 🅿️ | Ruheübungen: Atmen, Beobachten/Bewegen (Schritt-für-Schritt) und aktives Antippen | 1 |
| Zähl-Werkstatt | 🔢 | Objekte/Fahrzeuge abzählen, Zahlenraum wächst mit dem Level | 1 |
| Tier-Laute-Werkstatt | 🔊 | Tierlaute dem passenden Tier zuordnen | 1 |
| Fahrzeug-Kunde | 🚙 | Fahrzeuge anhand eines Piktogramms benennen | 1 |
| Wort-Werkstatt | 🔧 | Kommunikationstraining: die klarste/freundlichste Reaktion auf eine Situation wählen | 2 |
| Mutmach-Rennstrecke | 🏁 | Gesunder Umgang mit Stress und Überforderung | 2 |

Jedes Modul liest seine Inhalte aus einem eigenen Array in `app.js` (z. B. `FEELING_SCENES`, `COLOR_ITEMS`, `SOUND_ITEMS` …) und filtert sie über `byLevel()` nach der aktuellen Altersstufe.

## Kategorien-Umschalter für 2-3 Jahre

Um die jüngste Altersgruppe nicht mit zu vielen gleichzeitigen Optionen zu überfordern, zeigt die Insel-Karte bei **2–3 Jahren** standardmäßig nur 4 Kategorien:

> Gefühls-Tankstelle, Geschichten-Autobahn, Lack-Werkstatt, Formen-Werkstatt

Im **Elternbereich** (💛-Tab) erscheint bei dieser Altersstufe ein Schalter, mit dem sich die andere Hälfte einblenden lässt:

> Boxenstopp, Zähl-Werkstatt, Tier-Laute-Werkstatt, Fahrzeug-Kunde

Die Auswahl wird in `profile.toddlerSet` (`"primary"` bzw. `"secondary"`) gespeichert. Ab 5–6 Jahren entfällt diese Einschränkung, dort sind automatisch alle freigeschalteten Kategorien gleichzeitig sichtbar.

## Technischer Aufbau

- **Kein Build-Schritt**: reines HTML/CSS/JavaScript (Vanilla JS, keine Frameworks, keine npm-Abhängigkeiten)
- **Schriften**: Baloo 2 (Überschriften) und Nunito (Fließtext) von Google Fonts, per `<link>` eingebunden
- **State-Management**: ein einziges globales `profile`-Objekt, das nach jeder Änderung per `persist()` in `localStorage` gesichert wird
- **Rendering**: einfaches Template-String-Rendering (`viewEl.innerHTML = ...`) pro "View"-Funktion, gesteuert über die zentrale `navigate(name, param)`-Funktion als Mini-Router
- **Karten-Darstellung**: Insel-Hintergrund als Inline-SVG, Stationen als absolut positionierte HTML-Buttons (Prozent-Koordinaten), der gepunktete Pfad wird bei jedem Rendern per `buildTrailPath()` aus den aktuell sichtbaren Stationen live berechnet
- **Offline-Fähigkeit**: `sw.js` cached alle Kern-Dateien (Cache-First mit Netzwerk-Fallback-Update)
- **Icons**: als PNG generiert, referenziert in `manifest.json`

## Projektstruktur

```
leo-lerninsel/
├── index.html          # HTML-Grundgerüst + komplettes CSS (Design-Tokens, Layout, Komponenten)
├── app.js              # Sämtliche App-Logik: Inhalte, State, Rendering, Navigation
├── manifest.json        # Web App Manifest (Name, Icons, Theme-Farben, Start-URL)
├── sw.js                # Service Worker für Offline-Caching
├── icon-192.png         # App-Icon 192×192
├── icon-512.png         # App-Icon 512×512
├── icon-apple-touch.png # App-Icon für iOS-Homescreen (180×180)
└── README.md             # Diese Datei
```

## Installation & lokales Testen

Da die App aus statischen Dateien besteht, reicht ein einfacher lokaler Webserver (ein direktes Öffnen der `index.html` per `file://` funktioniert **nicht** zuverlässig, da der Service Worker und `fetch`-Aufrufe einen HTTP-Kontext benötigen):

```bash
# Im Projektordner:
python3 -m http.server 8080
# oder
npx serve .
```

Anschließend im Browser `http://localhost:8080` öffnen.

## Deployment (z. B. GitHub Pages)

1. Repository erstellen und den Inhalt dieses Ordners hochladen (alle Dateien im Root-Verzeichnis oder in einem `/docs`-Unterordner, je nach Pages-Konfiguration)
2. In den Repository-Einstellungen unter **Pages** die Quelle auf den entsprechenden Branch/Ordner setzen
3. Nach dem Deployment ist die App unter der von GitHub vergebenen URL erreichbar und dort auch als PWA installierbar

Da `manifest.json` mit relativen Pfaden (`./index.html`, `./icon-192.png` …) arbeitet, funktioniert das Deployment auch in einem Unterverzeichnis (z. B. `username.github.io/leo-lerninsel/`) ohne Anpassungen.

## Als App installieren (PWA)

- **Android/Chrome**: Menü → "App installieren" bzw. "Zum Startbildschirm hinzufügen"
- **iOS/Safari**: Teilen-Symbol → "Zum Home-Bildschirm"
- **Desktop (Chrome/Edge)**: Installations-Symbol in der Adressleiste

Nach der Installation funktioniert die App dank Service Worker auch ohne Internetverbindung.

## Datenschutz

- Es werden **keine Daten an einen Server gesendet** — die App hat kein Backend
- Alle Angaben (Profil, Fortschritt, Sterne, Sticker) liegen ausschließlich in `localStorage` des jeweiligen Geräts/Browsers
- Löschen des Browser-Speichers bzw. der Button **"Fortschritt zurücksetzen"** im Elternbereich entfernt alle Daten unwiderruflich
- Keine Werbung, keine Tracker, keine externen Konten

## Inhalte erweitern

Neue Fragen/Szenen lassen sich ohne Code-Kenntnisse in den jeweiligen Arrays in `app.js` ergänzen, z. B.:

```js
// Neue Gefühle-Szene (in FEELING_SCENES):
{ level:2, text:"Dein Beispieltext hier.", correct:"freude" },

// Neue Farb-Frage (in COLOR_ITEMS):
{ level:1, icon:"🍋", text:"Welche Farbe hat die Zitrone?", correct:"gelb" },
```

`level` steuert ab welcher Altersstufe (1–5) der Eintrag in den Auswahl-Pool aufgenommen wird. Neue Module folgen dem gleichen Muster: Inhalts-Array → `render<Modul>Game()` / `show<Modul>Scene()` / `pick<Modul>()` → Eintrag in `navigate()` → Station in `STATIONS`.

## Bekannte Grenzen

- Kein automatisierter Test-Unterbau (manuelles Testen empfohlen nach inhaltlichen Änderungen)
- Emoji-Darstellung kann je nach Betriebssystem/Browser leicht variieren
- Kein Mehrbenutzer-/Cloud-Sync — das Profil ist an das jeweilige Gerät gebunden
