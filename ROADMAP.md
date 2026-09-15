# ROADMAP – Gartenakte

Aktueller Stand: **0.8.2**

## 0.7.0 – Struktur, Mitgliedschaften & Verträge ✅ umgesetzt

Ziel: Fachliche Grundstruktur der Anwendung neu ordnen und Mitgliedschaften, Unterpacht sowie allgemeine Verträge sauber voneinander trennen.

### Navigation

- Übersicht
- Vorgänge
- Mitglieder & Personen
  - Personen
  - Adressen
  - Mitgliedschaften
  - Unterpachtverhältnisse
- Verträge
  - Pachtverträge
  - Stromverträge
  - Wasserverträge
  - Versicherungen
  - sonstige Verträge
- Anlage & Inventar
  - Parzellen
  - Flurstücke
  - Wege
  - Außentore
  - Unterverteilungen
  - Wasserschieber
  - Zähler
  - Stromleitungen
  - Wasserleitungen
- System
  - Import & Export
  - App installieren
  - QR-Code / Link teilen

### Mitgliedschaften

Mitgliedschaft wird als eigenes Objekt geführt und von Person sowie Unterpachtverhältnis getrennt.

Vorgesehene Mitgliedsarten:

- Vollmitglied
- Mitglied
- Mitglied auf Probe
- Familien-/Ehegattenmitglied

Mitgliedschaften erhalten:

- Gültig-von
- Gültig-bis
- Status
- Mitgliedsart
- Bemerkungen
- Historie von Änderungen der Mitgliedsart

Eine Person kann im Laufe der Zeit verschiedene Mitgliedsarten haben.

Die Mitgliedsart wird **nicht** automatisch aus einer Parzellenzuordnung abgeleitet.

### Unterpachtverhältnisse

Unterpachtverhältnisse werden getrennt von der Mitgliedschaft gespeichert.

Beziehung:

**Person ↔ Unterpachtverhältnis ↔ Parzelle**

Je Unterpachtverhältnis:

- Beginn
- Ende
- Status
- Vertragsnummer
- Vertragsdokument
- Bemerkungen

Eine Person kann gleichzeitig **mehrere Parzellen** bzw. mehrere aktive Unterpachtverhältnisse besitzen.

### Verträge

Verträge werden als allgemeines Vertragsobjekt geführt.

Mögliche Vertragsarten:

- Pachtvertrag
- Stromvertrag
- Wasservertrag
- Versicherung
- Wartungsvertrag
- Dienstleistungsvertrag
- sonstiger Vertrag

Je Vertrag:

- Vertragspartner
- Vertragsart
- Vertragsnummer
- Beginn
- Ende
- Kündigungsfrist
- Status
- Dokumente
- Bemerkungen
- Verknüpfung zu Inventarobjekten, Flurstücken oder anderen relevanten Objekten

### Anlage & Inventar

Flurstücke werden als Anlagen-/Inventarobjekte behandelt und nicht als Vertrag.

Verträge können sich auf ein oder mehrere Flurstücke beziehen.

Bestehende technische Inventarobjekte bleiben erhalten und werden in die neue Navigationsstruktur einsortiert.

---

## 0.8.0 – Mobile Parzellenübersicht ✅ umgesetzt

Ziel: Die Parzellenübersicht auf Smartphones auf schnelles Finden und Bearbeiten einzelner Gärten ausrichten, ohne die Desktop-Tabelle zu verändern.

- Desktop ab 768 px: Tabellenansicht
- Smartphone unter 768 px: Kartenansicht
- Suche nach Parzelle, Nummer, Weg oder Lage
- Filter nach Weg
- Filter nach Strom-/Wasserversorgung
- Sortierung nach Nummer oder Weg
- kompakte Label-Wert-Darstellung
- vollständig sichtbare Bearbeiten-Aktion
- leere optionale Angaben werden in den Karten reduziert bzw. ausgeblendet

---

## 0.9.0 – Mitglieder & Datenschutz

Ziel: Personenbezogene und sensible Mitgliedsdaten getrennt von allgemeinen Vereins-, Anlagen- und Vorgangsdaten behandeln.

- separater Mitgliederdatenbereich
- separater Mitglieder-Import
- separater Mitglieder-Export
- separate Mitgliederdatensicherung
- allgemeine Sicherung ohne sensible Mitgliederdaten
- interne Personen-ID als Verbindung zur übrigen Gartenakte
- Geburtsdatum
- Eintrittsdatum
- Austrittsdatum
- Datenschutz-/Exportregeln

---

## 0.10.0 – Jubiläen & Kalender

Ziel: Geburtstage und Vereinsjubiläen automatisch berechnen und frühzeitig anzeigen.

- konfigurierbare runde Geburtstage
- konfigurierbare Vereinsjubiläen
- frei definierbare Schwellen, z. B. 50. Geburtstag oder 25 Jahre Mitgliedschaft
- einstellbarer Vorlauf
- frei wählbarer Datumsbereich
- Erinnerungsstatus
- Übersicht anstehender Ehrungen
- Kalenderansicht
- ICS-Export für Apple Kalender, Outlook und andere Kalenderprogramme

---

## 0.11.0 – Karte & Geodaten

Ziel: räumliche Vereins- und Infrastrukturdaten gemeinsam darstellen.

- Kartenansicht
- Ebenen für Parzellen
- Flurstücke
- Wege
- Wasser
- Strom
- Schieber
- Unterverteilungen
- Zähler
- Außentore
- Leitungsverläufe
- Auswahl eines Objekts direkt aus der Karte
- Anzeige betroffener Parzellen bei Schiebern oder Unterverteilungen
- spätere optionale Parzellengrenzen als Polygon

Bestehende Geodatenmodelle:

- Punktkoordinaten für technische Objekte
- LineString/Koordinatenpfad für Wege und Leitungen

---

## 0.12.0 – Vorgänge professionalisieren

Ziel: aus der bisherigen Vorgangsverwaltung ein belastbares Fallmanagement machen.

- Vorgangsvorlagen
- Kategorien
- Eskalationsstufen
- Fristen
- Wiedervorlagen
- Verantwortungswechsel
- historische Verantwortungszuordnung
- Kostenübernahme
- Forderung gegen Personen
- Verknüpfung mit Parzellen
- Verknüpfung mit Inventarobjekten
- Verknüpfung mit Verträgen
- Vorlagen für Hinweise, Mahnungen und Abmahnungen

---

## 0.13.0 – Dokumente & Schriftverkehr

- Vorlagenverwaltung
- PDF-Erzeugung
- Einzel- und Serienschreiben
- Dokumenthistorie
- Anhänge
- Zuordnung zu Personen
- Zuordnung zu Parzellen
- Zuordnung zu Vorgängen
- Zuordnung zu Verträgen

---

## 0.14.0 – Datenpflege & Import

- ergänzender Stammdatenimport ohne Überschreiben des gesamten Bestands
- Dublettenprüfung
- CSV-Import
- JSON-Import
- Massenänderungen
- Plausibilitätsprüfungen
- Importvorschau
- Konfliktbehandlung

---

## 0.15.0 – Sicherheit & Benutzerkonzept

Falls die Anwendung später nicht mehr nur lokal auf einem einzelnen Gerät genutzt wird:

- Benutzerrollen
- Rechte
- lokaler Sperrbildschirm / PIN
- getrennte sensible Bereiche
- Änderungsprotokoll
- verschlüsselte Sicherungen
- feinere Zugriffsrechte für Mitgliederdaten

---

## 0.16.0 – Synchronisation & Mehrgerätebetrieb

Nur falls tatsächlich benötigt:

- gemeinsamer Datenbestand
- Synchronisation
- Konfliktbehandlung
- Server oder verschlüsselte Cloud
- Geräteverwaltung
- Offline-/Online-Synchronisation

---

## 0.17.0 – Auswertungen

- offene Vorgänge
- Fristen
- häufige Mängel
- Versorgung je Parzelle
- Inventarstatus
- Vertragsfristen
- Mitgliedschaftsübersichten
- Jubiläen
- Unterpachtverhältnisse
- Export für Vorstandssitzungen

---

# Ziel 1.0.0

**1.0.0** wird erst vergeben, wenn die zentralen Bereiche stabil und gemeinsam nutzbar sind:

- Personen
- Mitgliedschaften
- Adressen
- Unterpachtverhältnisse
- Parzellen
- Flurstücke
- Verträge
- Vorgänge
- Fotos und Dokumente
- Inventar
- Geodaten / Kartenbezug
- getrennte Mitgliederdaten
- Backup und Wiederherstellung
- Smartphone- und PWA-Nutzung

1.0.0 soll eine belastbare produktive Vereinsverwaltung darstellen und nicht nur einen funktionierenden Prototypen.
