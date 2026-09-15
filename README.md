# Gartenakte 0.8.2

Portable Vereinsverwaltung als Progressive Web App (PWA) für GitHub Pages.

## Repository / GitHub Pages

Repository: `gartenakte-session-cf6412`

Die Dateien dieses Ordners kommen direkt in die oberste Ebene des Repositories. GitHub Pages anschließend aus `main` / `(root)` veröffentlichen.

Der Freigabeparameter ist nur eine einfache Zugangshürde und kein echter Zugriffsschutz. Vereinsdaten werden nicht in GitHub gespeichert, sondern lokal im Browserprofil des jeweiligen Geräts.

## Neu in 0.6.0

- Inventar für Wasser- und Strominfrastruktur
- Wasserleitungen, Wasserstränge, Schieber, Wasserzähler und Wasseranschlüsse
- Stromleitungen, Unterverteilungen, Stromzähler sowie Sicherungen/Abgänge
- BMK/Kennzeichnung und Hierarchie zwischen Inventarobjekten
- Punktkoordinaten für technische Objekte
- Koordinatenpfade für Leitungen
- Koordinatenpfade für Wege
- Strom-/Wasserversorgung und technische Zuordnung je Parzelle
- automatische Migration bestehender 0.5.x-Daten auf Schema 3

## Koordinatenpfade

Ein Pfad wird aktuell als eine Koordinate pro Zeile erfasst:

```text
51.532100, 9.934200
51.532250, 9.934500
51.532420, 9.934850
```

Diese Struktur ist als Grundlage für eine spätere Kartenansicht gedacht.

## Installation

- iPhone/iPad: Seite in Safari öffnen → Teilen → „Zum Home-Bildschirm“.
- Android/Chrome/Edge: „App installieren“ oder „Zum Startbildschirm hinzufügen“.
- Desktop-Chromium-Browser: Installationssymbol bzw. „App installieren“.

## Offline

Nach dem ersten erfolgreichen Laden wird die App-Shell durch `sw.js` zwischengespeichert und kann offline starten.

## Datensicherung

Die lokale Speicherung ersetzt kein Backup. Regelmäßig unter „Sicherung/Export“ eine Vollsicherung exportieren.

Siehe auch [`ROADMAP.md`](ROADMAP.md).


## Version 0.8.2

- Parzellenübersicht unter 768 px als mobile Kartenansicht
- Suche nach Parzellenname, Nummer, Weg oder Lage
- Filter nach Weg und technischer Versorgung
- Sortierung nach Nummer oder Weg
- Desktop-Tabellenansicht unverändert ab 768 px
- Bearbeiten-Aktion auf Smartphones vollständig sichtbar
- keine horizontale Parzellentabelle als Standardansicht auf Smartphones
