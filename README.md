# Gartenakte 0.9.6

Portable Vereinsverwaltung als Progressive Web App (PWA) für GitHub Pages.

## Repository / GitHub Pages

Repository: `gartenakte-session-cf6412`

Die Dateien dieses Ordners kommen direkt in die oberste Ebene des Repositories. GitHub Pages anschließend aus `main` / `(root)` veröffentlichen.

Der Freigabeparameter ist nur eine einfache Zugangshürde und kein echter Zugriffsschutz. Vereinsdaten werden nicht in GitHub gespeichert, sondern lokal im Browserprofil des jeweiligen Geräts.

## Neu in 0.9.6

- Stromzählerübersicht mit gemeinsamer Suche, Filtern, Sortierung und Trefferzahl für Desktop und Mobil.
- Unter 768 px werden Stromzähler als kompakte Karten statt als breite Tabelle dargestellt.
- Suche umfasst BMK, Bezeichnung, Zählernummer, Zählstellennummer, Parzelle und übergeordnete Verteilung.
- Filter nach Status, Parzelle sowie vorhandener/fehlender Zähler- bzw. Zählstellennummer.
- Sortierung nach BMK, Bezeichnung und letzter Ablesung.
- Ablesungsdialog besitzt jetzt eine sichtbare Schließen-Funktion und ein × im Dialogkopf.
- Ablesungen werden auf schmalen Displays als Karten dargestellt.
- Ungespeicherte Formulareingaben werden bei × oder Esc nicht mehr stillschweigend verworfen.

## Neu in 0.9.5

- OSM-Außentore auf dem äußeren Koloniepolygon werden jetzt zusätzlich zu Toren innerhalb der Anlage erkannt.
- Die Erkennung prüft dafür auch, ob ein `barrier=gate`-Node Bestandteil eines äußeren Grenz-Ways der Kolonie ist.
- Der mitgelieferte Rosengarten-Datensatz enthält dadurch **8 statt 5 Außentore**.
- Importdialog und Dokumentation sprechen entsprechend von Außentoren „innerhalb oder auf der Koloniegrenze“.

## Neu in 0.9.4

- „Auf vorhandene Daten zoomen“ berechnet die Kartenausdehnung jetzt robust aus allen gespeicherten Fachdaten.
- Berücksichtigt werden Parzellen, Flurstücke, Pachtflächen, Wege, Inventargeometrien und die gespeicherte Koloniegrenze – unabhängig von der aktuellen Layer-Sichtbarkeit.
- `Point`, `MultiPoint`, `LineString`, `MultiLineString`, `Polygon`, `MultiPolygon` und GeometryCollections werden bei der Bounds-Berechnung unterstützt.
- Ein einzelner Punkt wird mit einem sinnvollen Zoomlevel angezeigt; ohne Geometriedaten erscheint eine verständliche Meldung.
- Externe OSM-Basiskartendaten fließen nicht in die Bounds-Berechnung ein.

## Neu in 0.9.3

- Karten-Bedienelemente vollständig wieder sichtbar und erreichbar.
- Kompakte Toolbar direkt oberhalb der Karte mit drei Funktionszeilen.
- Zeile 1: Kartenebenen inklusive OSM-Referenz.
- Zeile 2: Objektart, Objekt, Punkt/Linie/Polygon, Punkt zurück sowie Speichern/Abbrechen.
- Zeile 3: Zoom, Pachtfläche und OSM-Importaktionen.
- Import- und Zeichenstatus bleiben als kleine Metainformation unmittelbar vor der Karte erhalten.
- Alle Kartenfunktionen aus 0.9.1 bleiben erhalten, ohne den alten großen Formularblock wieder einzuführen.

## Neu in 0.9.1

- OSM-Importdialog kompakter und responsiver aufgebaut.
- Importkennzahlen klar gruppiert, Importoptionen als unmittelbare Checkbox-Liste dargestellt.
- Hinweis auf fehlende OSM-Referenzen und Quellenangabe visuell sauberer eingeordnet.

## Neu in 0.9.0

- Kartenansicht für Anlage und technische Infrastruktur
- OpenStreetMap als Basiskarte
- ein-/ausblendbare Ebenen für Parzellen, Flurstücke, Pachtflächen, Wege, Wasser, Strom und Inventar
- Karteneditor für Punkt, Linie und Polygon
- Geometrien können direkt mit Parzellen, Flurstücken, Pachtflächen, Wegen und Inventarobjekten verknüpft werden
- Pachtflächen als eigenes Objekt, damit bei teilweise verpachteten Flurstücken amtliche Flurstücksfläche und tatsächliche Vertragsfläche getrennt bleiben
- Wasser- und Stromzähler getrennt in der Navigation
- Zählernummer und Zählstellennummer für Versorger-Zähler
- historische Zählerstände mit Datum, Ableseart, optionalem Foto und Verbrauch zur vorherigen Ablesung
- automatisches Upgrade vorhandener Schema-4-Daten auf Schema 5

## Karte und Offline-Nutzung

Die Anwendung selbst bleibt als PWA offline startfähig. Die OpenStreetMap-Basiskarte und die Leaflet-Kartenbibliothek werden online geladen. Bereits gespeicherte Vereinsdaten und Geometrien bleiben lokal in der Gartenakte; ohne Internet steht lediglich die externe Basiskarte nicht zur Verfügung.

## Geometrien

0.9.0 verwendet für neu über die Karte erfasste Geometrien GeoJSON-nahe Objekte:

- `Point` für punktförmige Objekte
- `LineString` für Wege und Leitungen
- `Polygon` für Flurstücke, Pachtflächen und spätere Parzellengrenzen

Ältere Koordinatenfelder und Koordinatenpfade bleiben kompatibel und werden weiterhin auf der Karte dargestellt.

## Zähler und Ablesungen

Für Wasser- und Stromzähler können zusätzlich gepflegt werden:

- interner Vereinszähler oder offizieller Versorger-Zähler
- Zählernummer
- Zählstellennummer
- Einheit (`m³`, `kWh` usw.)
- Einbau- und Ausbaudatum
- beliebig viele Ablesungen mit Datum und Zählerstand

Ein Zählerwechsel soll über einen neuen Zählerdatensatz abgebildet werden, damit die Historie erhalten bleibt.

## Installation

- iPhone/iPad: Seite in Safari öffnen → Teilen → „Zum Home-Bildschirm“.
- Android/Chrome/Edge: „App installieren“ oder „Zum Startbildschirm hinzufügen“.
- Desktop-Chromium-Browser: Installationssymbol bzw. „App installieren“.

## Datensicherung

Die lokale Speicherung ersetzt kein Backup. Regelmäßig unter „Import & Export“ eine Vollsicherung exportieren.

## Projekt-Dokumentation

- `ROADMAP.md` – geplante Weiterentwicklung
- `CHANGELOG.md` – Änderungen je Version
- `docs/IMPORT_EXPORT.md` im Wurzelverzeichnis des ZIP-Pakets – aktuelles Import-/Exportformat


## Karte & OSM-Import (0.9.0)

Unter **Anlage & Inventar → Karte** können Punkt-, Linien- und Polygongeometrien erfasst werden. Der mitgelieferte OSM-Export liegt unter `data/map.osm`; eine kompakte Importquelle liegt unter `data/rosengarten-osm.json`.

Der OSM-Import ordnet Parzellen über ihre `ref`-Nummer zu, übernimmt die Wege der Anlage einschließlich Reinhäuser Landstraße und kann Außentore innerhalb oder auf der Koloniegrenze anlegen. OpenStreetMap-Daten ersetzen keine amtlichen Flurstücksdaten.

Quelle der OSM-Daten: © OpenStreetMap-Mitwirkende, ODbL 1.0.
