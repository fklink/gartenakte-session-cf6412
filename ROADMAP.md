# ROADMAP – Gartenakte

Aktueller Stand: **0.9.6**

## 0.9.0 – Karte & Geodaten ✅ umgesetzt

- Kartenansicht mit OpenStreetMap
- Ebenen für Parzellen, Flurstücke, Pachtflächen, Wege, Wasser, Strom und Inventar
- Zeichenwerkzeuge für Punkt, Linie und Polygon
- Verknüpfung von Geometrien mit Fachobjekten
- Flurstücke und tatsächlich verpachtete Pachtflächen getrennt modelliert
- Wasser- und Stromzähler getrennt geführt
- Zählernummer und Zählstellennummer
- historische Ablesungen mit Datum und Verbrauchsberechnung
- OSM-Import mit Vorschau und Zuordnung von Parzellen, Wegen und Außentoren
- mitgelieferter OSM-Referenzdatensatz für die Gartenkolonie Rosengarten

Der ursprünglich als 0.8.6 geplante Ausbau „Zählstellen & Ablesungen“ wurde in 0.9.0 integriert.

---

## 0.10.0 – Kontakte & Verträge

### Navigation

- Kontakte
- Verträge

Ein Kontakt ist entweder eine natürliche Person oder eine Organisation. Rollen wie Vertragspartner, Dienstleister, Versorger, Steuerberater, Rechtsanwalt/Kanzlei, Gerichtsvollzieher oder Entsorgungsbetrieb sind Eigenschaften eines Kontakts und keine eigenen Stammdatentypen.

Verträge referenzieren vorhandene Kontakte und können mit Flurstücken, Pachtflächen und Inventarobjekten verknüpft werden.

---

## 0.11.0 – Mitglieder & Datenschutz

- sensible Mitgliederdaten getrennt von allgemeinen Anlagendaten
- separater Import/Export und separate Sicherung
- Geburtsdatum
- Eintrittsdatum
- Austrittsdatum
- allgemeine Sicherung wahlweise ohne sensible Mitgliederdaten

---

## 0.12.0 – Vereinsfunktionen

- frei definierbare Funktionen wie Vorsitz, Schriftführung, Kasse, Wegewart, Zeugwart, Hauswart, Festausschuss, Wasserwart, Elektrowart
- Rang/Stufe wie 1., 2. oder stellvertretend
- Gültigkeitszeiträume
- Freistellung von Arbeitsstunden ganz oder teilweise
- Kennzeichnung einer möglichen Aufwandsentschädigung ohne Finanzbuchung

---

## 0.13.0 – Arbeitsstunden

- Sollstunden je Jahr
- Stundensatz für nicht geleistete Stunden
- geleistete Arbeitsstunden je Mitglied
- Anrechnung der Jahreshauptversammlung mit konfigurierbarer Stundenanzahl
- Freistellungen über Vereinsfunktionen
- Mehrleistung und Gutschriften

---

## 0.14.0 – Jubiläen & Kalender

- runde Geburtstage
- Vereinsjubiläen
- konfigurierbare Schwellen
- frei definierbarer Vorlauf
- Erinnerungen
- Kalenderansicht
- ICS-Export

---

## 0.15.0 – Vorgänge professionalisieren

- Vorgangsvorlagen und Kategorien
- Eskalationsstufen
- Fristen und Wiedervorlagen
- Verantwortungswechsel und Historie
- Kostenübernahme/Forderungen
- Verknüpfungen zu Personen, Parzellen, Inventar und Verträgen

---

## 0.16.0 – Dokumente & Schriftverkehr

- Vorlagenverwaltung
- PDF-Erzeugung
- Einzel- und Serienschreiben
- Dokumenthistorie
- Anhänge und Zuordnungen

---

## 0.17.0 – Datenpflege & Import

- ergänzender Merge-Import
- Dublettenprüfung
- CSV-/JSON-Import
- Massenänderungen
- Importvorschau und Konfliktbehandlung

---

## 0.18.0 – Benutzer, Rollen & Sicherheit

- Benutzerkonten
- rollenbasiertes Berechtigungsmodell
- getrennte Rechte für sensible und fachliche Bereiche
- Änderungsprotokoll
- Sitzungs- und Anmeldesicherheit
- verschlüsselte Sicherungen

---

## 0.19.0 – Synchronisation & Mehrgerätebetrieb

- gemeinsamer Datenbestand
- Offline-/Online-Synchronisation
- Konfliktbehandlung
- Geräteverwaltung
- Server/Backend
- setzt das Rollenmodell aus 0.18.0 voraus

---

## 0.20.0 – Auswertungen

- Vorgänge und Fristen
- Versorgung und Inventar
- Zählerstände und Verbrauch
- fehlende Ablesungen
- Vertragsfristen
- Mitgliedschaften, Vereinsfunktionen und Arbeitsstunden
- Jubiläen
- Unterpachtverhältnisse

---

## Später – Finanzen / Kassenbuch

Erst nach stabilem Mehrbenutzer-, Rollen- und Synchronisationsmodell.

Mögliche Themen: Kassenbuch, Einnahmen/Ausgaben, Forderungen, Ersatzbeträge für Arbeitsstunden, Aufwandsentschädigungen, Gutschriften und Belegverwaltung.
