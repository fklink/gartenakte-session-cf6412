# CHANGELOG – Gartenakte

Alle relevanten Änderungen an der Gartenakte werden in dieser Datei dokumentiert.
Die Versionsnummern folgen Semantic Versioning (`MAJOR.MINOR.PATCH`).

## 0.9.6 – 2026-09-16

### Hinzugefügt

- Responsive Stromzählerkarten unterhalb von 768 px.
- Gemeinsame Suche, Filter und Sortierung für Desktop-Tabelle und mobile Karten.
- Suche über BMK, Bezeichnung, Zählernummer, Zählstellennummer, Parzelle und übergeordnetes Inventarobjekt.
- Filter nach Status, Parzelle sowie vorhandener/fehlender Zähler- bzw. Zählstellennummer.
- Sortierung nach BMK, Bezeichnung sowie Datum der letzten Ablesung.
- Trefferanzeige „x von y Zählern“.
- Mobile Kartenansicht für Ablesungen.
- Sichtbare Schließen-Funktion im Ablesungsdialog und ×-Schaltfläche im Dialogkopf.

### Behoben

- Esc bzw. × können geänderte Formulare nicht mehr unbemerkt schließen; vor dem Verwerfen erfolgt eine Rückfrage.
- Im aktiven Ablesungsformular bleiben „Speichern“ und „Abbrechen“ klar getrennte Aktionen.

## 0.9.5 – 2026-09-16

### Behoben

- OSM-Außentore auf dem äußeren Koloniepolygon werden nun erkannt.
- Die Torerkennung berücksichtigt neben Punkten innerhalb des Polygons auch `barrier=gate`-Nodes, die Bestandteil eines äußeren Grenz-Ways der OSM-Multipolygon-Relation sind.
- Der mitgelieferte Rosengarten-Referenzdatensatz enthält dadurch 8 statt 5 Außentore.
- Importdialog und OSM-Dokumentation unterscheiden nun korrekt „innerhalb oder auf der Koloniegrenze“.

## 0.9.4 – 2026-09-16

### Behoben

- „Auf vorhandene Daten zoomen“ repariert.
- Bounds werden jetzt aus allen gespeicherten relevanten Fachdaten berechnet, unabhängig von der Sichtbarkeit einzelner Layer.
- Parzellen, Flurstücke, Pachtflächen, Wege, Inventargeometrien und die Koloniegrenze werden berücksichtigt.
- GeoJSON-Geometrietypen `Point`, `MultiPoint`, `LineString`, `MultiLineString`, `Polygon`, `MultiPolygon` und `GeometryCollection` werden robust ausgewertet.
- Ein einzelner Punkt erhält einen sinnvollen Kartenzoom statt eines Extremzooms.
- Wenn keine geeigneten Geometriedaten vorhanden sind, wird eine verständliche Meldung ausgegeben.
- OSM-Basiskartendaten außerhalb des gespeicherten Vereinsbestands beeinflussen die Zoom-Bounds nicht.

## 0.9.3 – 2026-09-16

### Behoben

- Karten-Bedienelemente wieder vollständig sichtbar und nutzbar gemacht.
- Alle Funktionen aus 0.9.1 in eine kompakte, dreizeilige Toolbar überführt.

### Geändert

- Kartenebenen in einer kompakten ersten Werkzeugzeile angeordnet.
- Geometriebearbeitung mit Objektart, Objekt, Geometrietyp, Punkt zurück sowie Speichern/Abbrechen in einer gemeinsamen zweiten Werkzeugzeile gebündelt.
- Zoom-, Pachtflächen- und OSM-Importaktionen in einer sekundären dritten Werkzeugzeile angeordnet.
- Import- und Zeichenstatus als zurückhaltende Metainformation direkt oberhalb der Karte belassen.


## 0.9.2 – 2026-09-16

### Geändert

- Kartenwerkzeugleiste in drei klar getrennte Funktionsgruppen gegliedert: Kartenebenen, Geometriebearbeitung und weitere Aktionen.
- Ebenenschalter kompakter dargestellt und in Fachdaten sowie Referenzdaten gruppiert.
- OSM-Referenz als kompakter, nicht umbrechender Layer-Schalter ausgeführt.
- Punkt, Linie und Polygon als zusammengehörige Toggle-Gruppe gestaltet und aktiver Zeichenmodus sichtbar markiert.
- Zielobjekt-Auswahl links gebündelt; Speichern und Abbrechen als zusammengehörige Aktionen angeordnet.
- Weitere Kartenaktionen in einen separaten kompakten Bereich verschoben.
- Zeichen- und OSM-Importstatus als zurückhaltende Metainformation direkt oberhalb der Karte platziert.
- Kartenwerkzeugleiste responsiv verdichtet, damit die Kartenfläche früher im Viewport beginnt.

## 0.9.1 – 2026-09-16

### Geändert

- OSM-Importdialog kompakter und klarer strukturiert.
- Vier Importkennzahlen auf breiten Ansichten in einer gemeinsamen Zeile angeordnet; auf schmaleren Ansichten zweispaltig.
- Kennzahl, Wert und Zusatztext jeweils als zusammengehörige Einheit gruppiert.
- Importoptionen als einspaltige Checkbox-Liste mit direkt zugeordneten Beschreibungen dargestellt.
- Hinweis auf Parzellen ohne OSM-Referenz als dezenter, eigener Hinweisblock hervorgehoben.
- Quellenangabe visuell zurückgenommen und an den unteren Inhaltsrand verschoben.
- Aktionsbereich verdichtet; Primär- und Sekundäraktion bleiben klar gewichtet.

## 0.9.0 – 2026-09-16

### Hinzugefügt

- Kartenansicht mit OpenStreetMap-Basiskarte.
- Ein-/ausblendbare Kartenebenen für Parzellen, Flurstücke, Pachtflächen, Wege, Wasser, Strom und Inventar.
- Karteneditor für Punkt-, Linien- und Polygongeometrien.
- Pachtflächen als eigene Objekte für vollständig oder teilweise verpachtete Flurstücke.
- Zählernummer und Zählstellennummer für Wasser- und Stromzähler.
- Historische Zählerstände mit Datum, Ableseart, optionalem Foto und Verbrauchsberechnung.
- Getrennte Ansichten für Wasserzähler und Stromzähler.
- OSM-Import mit Vorschau für `.osm`-Dateien.
- Mitgelieferte Rosengarten-OSM-Referenzdaten: 134 Parzellenpolygone, 5 Wege, 5 Außentore und Koloniegrenze.
- OSM-Importhistorie und eigene OSM-Referenzebene.

### Geändert

- Datenschema auf Schema 6 angehoben.
- Anlage-&-Inventar-Navigation für die Karten-/Zählerstruktur angepasst.
- Bestehende Koordinaten und Koordinatenpfade bleiben kompatibel und werden auf der Karte dargestellt.

### Migration

- Schema-4/5-Daten werden automatisch auf Schema 6 ergänzt.

## 0.8.5 – 2026-09-16

### Geändert

- Parzellensuche, Wegfilter, Versorgungsfilter und Sortierung stehen nun auch in der breiten Tabellenansicht zur Verfügung.
- Dieselbe Filterlogik steuert Desktop-Tabelle und mobile Kartenansicht.
- `docs/` liegt im Wurzelverzeichnis des ZIP-Pakets.

### Dokumentation

- Import-/Exportdokumentation auf Version 0.8.5 aktualisiert.

## 0.8.4 – 2026-09-16

### Dokumentation

- `docs/IMPORT_EXPORT.md` hinzugefügt.
- Aktuelles JSON-Vollsicherungsformat (Schema 4) dokumentiert.
- Datenbereiche, Referenzen, eingebettete Anhänge und Migrationsverhalten beschrieben.
- CSV-Exportformat der Vorgänge dokumentiert.
- Verhalten des derzeit ersetzenden Vollimports ausdrücklich festgehalten.

## 0.8.3 – 2026-09-16

### Dokumentation

- `CHANGELOG.md` zum Projekt hinzugefügt.
- `ROADMAP.md` mit dem aktuellen Projektstand synchronisiert.
- „Karte & Geodaten“ in der Roadmap auf Version 0.9.0 vorgezogen.

## 0.8.2 – 2026-09-15

### Geändert

- Versorgungsanzeige der Parzellen wieder visuell strukturiert.
- Wasser und Strom werden als getrennte semantische Einträge dargestellt.
- Monochrome SVG-Icons für Wasser und Strom eingeführt.
- Wenn keine Versorgung vorhanden ist, wird nur `–` angezeigt.
- Desktop-Tabelle und mobile Karten verwenden dieselbe Versorgungssemantik.

## 0.8.1 – 2026-09-15

### Behoben

- Sticky Tabellenkopf korrigiert.
- Sticky-Offset wird aus den tatsächlich vorhandenen Header-/Navigationsbereichen abgeleitet.
- Parzellentabelle mit stabiler gemeinsamer Spaltenstruktur für Tabellenkopf und Tabellenkörper versehen.
- Aktionsspalte strukturell stabilisiert.

## 0.8.0 – 2026-09-15

### Hinzugefügt

- Mobile Kartenansicht für die Parzellenübersicht unter 768 px.
- Suche nach Parzellennummer, Weg und Lage.
- Filter nach Weg und Versorgung.
- Sortierung nach Nummer oder Weg.
- Vollständig sichtbarer „Bearbeiten“-Button in der mobilen Ansicht.

## 0.7.9 – 2026-09-15

### Geändert

- Tabellen für Tablet und schmale Ansichten horizontal scrollbar gemacht.
- Aktionsspalte rechts sticky gehalten.
- Spaltenbreiten und mobile Zellabstände stabilisiert.

## 0.7.8 – 2026-09-15

### Geändert

- „System“ aus der Produktzeile in die Hauptnavigation verschoben.
- Produktkopf auf Logo, Produktname und Version reduziert.
- Sticky Tabellenkopf optisch stärker als Tabellenbestandteil gestaltet.

## 0.7.7 – 2026-09-15

### Geändert

- Sticky-Bereich kompakter gestaltet.
- Breadcrumb und Tabellenkopf klarer voneinander getrennt.
- Tabellenkopf mit neutralem Hintergrund und dezenter Unterkante versehen.

## 0.7.6 – 2026-09-15

### Behoben

- Rückkopplungsfehler bei der dynamischen Höhenmessung des Sticky-Headers entfernt.
- Stabile Sticky-Offsets eingeführt.

## 0.7.5 – 2026-09-15

### Hinzugefügt

- Sticky App-Header.
- Sticky Breadcrumb-/Kontextzeile.
- Sticky Tabellenköpfe unterhalb der Navigation.
- Scroll-Offsets für Fokus- und Sprungziele ergänzt.

## 0.7.4 – 2026-09-15

### Geändert

- Desktop-Header als kompakte zweistufige App-Navigation neu gestaltet.
- Große umrandete Navigationsbox entfernt.
- Aktiver Hauptbereich nur noch über Textfarbe und Unterstreichung markiert.

## 0.7.3 – 2026-09-15

### Geändert

- Hauptnavigation kompakter und ruhiger gestaltet.
- Dropdown-Pfeile vereinheitlicht.
- Breadcrumb visuell zurückgenommen.
- Primäraktionen im Inhaltsbereich gegenüber Navigation stärker gewichtet.

## 0.7.2 – 2026-09-15

### Hinzugefügt

- Breadcrumb-/Kontextanzeige wie `Anlage & Inventar › Parzellen`.
- Aktiver Hauptbereich und aktiver Unterpunkt werden sichtbar markiert.

## 0.7.1 – 2026-09-15

### Geändert

- Desktop-Navigation auf kompakte Hauptnavigation mit Dropdowns umgestellt.
- Große gruppierte Navigationskarten auf breiten Bildschirmen entfernt.

## 0.7.0 – 2026-09-15

### Hinzugefügt

- Mitgliedschaften als eigenes Datenobjekt.
- Mitgliedsarten mit Gültigkeitszeiträumen.
- Unterpachtverhältnisse getrennt von Mitgliedschaften.
- Mehrere Parzellen pro Person bzw. Mitglied möglich.
- Allgemeines Vertragsmodell mit Vertragstyp und Vertragspartner.
- Gruppierte Navigation: Übersicht, Vorgänge, Mitglieder & Personen, Verträge, Anlage & Inventar, System.

### Migration

- Bestehende Pachtverhältnisse werden zu Unterpachtverhältnissen übernommen.
- Bestehende Verpächter und Flächenpachtverträge werden in das allgemeine Vertragsmodell migriert.

## 0.6.0 – 2026-09-15

### Hinzugefügt

- Inventar-/Infrastrukturmodul.
- Wasserleitungen, Wasserstränge, Schieber, Wasserzähler und Wasseranschlüsse.
- Stromleitungen, Unterverteilungen, Stromzähler sowie Sicherungen/Abgänge.
- BMK/Kennzeichnungen und hierarchische Inventarbeziehungen.
- Strom- und Wasserversorgung je Parzelle.
- Koordinaten für punktförmige Objekte.
- Koordinatenpfade für Leitungen und Wege.
- `ROADMAP.md` in das Projekt aufgenommen.

## 0.5.0 – 2026-09-15

### Geändert

- Responsive Hauptnavigation eingeführt.
- Hamburger-Menü für Smartphone und schmale Ansichten.
- Desktop-Navigation und mobile Navigation getrennt optimiert.

## 0.4.2 – 2026-09-14

### Sicherheit / Dokumentation

- Freigabecode aus der README entfernt.
- Freigabecode ersetzt.
- Hinweis beibehalten, dass der Share-Parameter kein echter Zugriffsschutz ist.

## 0.4.1 – 2026-09-14

### Geändert

- Neues Gartenakte-App-Icon als PWA-, Apple-Touch- und Browser-Icon integriert.

## 0.4.0 – 2026-09-14

### Hinzugefügt

- Gartenakte als Progressive Web App (PWA) vorbereitet.
- `manifest.webmanifest`, Service Worker und App-Icons ergänzt.
- Offline-Start der App-Shell ermöglicht.
- Installationshilfe für iPhone, Android und Desktop ergänzt.

## 0.3.2 – 2026-09-14

### Behoben

- „Link teilen“ visuell an die übrigen Navigationselemente angepasst.
- Unnötige Inline-Styles entfernt.
- HTML, CSS und JavaScript konsistent formatiert.

## 0.3.1 – 2026-09-14

### Geändert

- Anwendung für GitHub Pages in einzelne Dateien aufgeteilt.
- Struktur mit `index.html`, `app.js`, `style.css`, `qr.html`, `404.html`, `robots.txt` und `.nojekyll` eingeführt.

## 0.3.0 – 2026-09-13

### Hinzugefügt

- Adressen als eigene Objekte mit Gültigkeitszeiträumen.
- Wege als eigene Stammdaten.
- GPS-Koordinaten je Parzelle.
- Flurstücke und Parzelle–Flurstück-Zuordnungen.
- Verpächter und Flächen-Pachtverträge.
- Migration bestehender 0.2.0-Daten vorgesehen.

## 0.2.0 – 2026-09-12

### Hinzugefügt

- Erste semantisch versionierte Entwicklungsfassung.
- Personen, Parzellen und Pachtverhältnisse getrennt modelliert.
- Vorgänge mit Ursprung, Verantwortung und Historie.
- Fotos und Dokumente als Anhänge.
- Vollsicherung einschließlich Anhängen.

---

Frühere lokale Prototypen vor 0.2.0 wurden nicht als reguläre Releases geführt.
