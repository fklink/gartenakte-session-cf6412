# Gartenakte 0.5.0

Portable Vereinsverwaltung als Progressive Web App (PWA) für GitHub Pages.

## GitHub Pages

Repository: `gartenakte-session-cf6412`

Die Dateien dieses Ordners kommen direkt in die oberste Ebene des Repositories.
GitHub Pages anschließend aus `main` / `(root)` veröffentlichen.


Der Share-Parameter ist nur eine einfache Zugangshürde und kein echter Zugriffsschutz.
Die Vereinsdaten werden nicht in GitHub gespeichert, sondern lokal im Browserprofil des jeweiligen Geräts.

## Installation

- iPhone/iPad: Seite in Safari öffnen → Teilen → „Zum Home-Bildschirm“.
- Android/Chrome/Edge: „App installieren“ oder „Zum Startbildschirm hinzufügen“.
- Desktop-Chromium-Browser: Installationssymbol bzw. „App installieren“.

## Offline

Nach dem ersten erfolgreichen Laden wird die App-Shell durch `sw.js` zwischengespeichert und kann offline starten.

## Datensicherung

Die lokale Speicherung ersetzt kein Backup. Regelmäßig unter „Sicherung/Export“ eine Vollsicherung exportieren.


## App-Icon

Die PWA nutzt ein modernes Gartenakte-Icon in den Dateien `icons/icon-192.png`, `icons/icon-512.png` und `icons/apple-touch-icon.png`.


## Freigabeparameter

Der konkrete Freigabecode wird bewusst nicht in dieser README dokumentiert. Er ist ausschließlich im ausgelieferten Frontend hinterlegt und stellt keinen echten Zugriffsschutz dar.


## Navigation

Auf Smartphones und schmalen Tablets wird die Navigation als seitliches Hamburger-Menü angezeigt. Auf breiten Displays bleibt die direkte Navigationsleiste sichtbar.
