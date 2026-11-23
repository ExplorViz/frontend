import { ReactNode } from 'react';
import { Link } from 'react-router-dom';

const LAST_UPDATED = '[November 2026]';

const CAU_PRIVACY_URL = 'https://www.uni-kiel.de/de/datenschutz';

function ExternalLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  );
}

export default function Privacy() {
  return (
    <div className="privacy-page" lang="de">
      <div className="container py-5" style={{ maxWidth: '50rem' }}>
        <Link to="/" className="d-inline-block mb-4">
          Zurück zu ExplorViz
        </Link>

        <h1 className="mb-4">Datenschutzerklärung</h1>

        <p>
          Diese Datenschutzerklärung beschreibt, welche personenbezogenen Daten ExplorViz verarbeitet. Sie ergänzt die{' '}
          <ExternalLink href={CAU_PRIVACY_URL}>
            Datenschutzerklärung der Christian-Albrechts-Universität zu Kiel
          </ExternalLink>
          . Von dieser gelten für ExplorViz die Abschnitte 1 bis 3 (Verantwortlicher, Datenschutzbeauftragter sowie
          allgemeine Informationen zur Datenverarbeitung, Ihren Rechten und Ihrem Beschwerderecht) und Abschnitt 4.1
          (Server-Logdateien). Die übrigen Abschnitte betreffen den Internetauftritt der Universität unter
          www.uni-kiel.de. Cookies, Webanalyse (Matomo) und eingebundene Inhalte Dritter wie YouTube oder Google-Dienste
          nutzt ExplorViz nicht.
        </p>

        <h2>1. Verantwortlicher und Kontakt</h2>
        <p>
          Verantwortlich ist die Christian-Albrechts-Universität zu Kiel, Christian-Albrechts-Platz 4, 24118 Kiel,{' '}
          <a href="mailto:mail@uni-kiel.de">mail@uni-kiel.de</a>.
        </p>
        <p>
          Fachlich zuständig für ExplorViz ist die Arbeitsgruppe Software Engineering am Institut für Informatik der
          CAU. Fragen zum Datenschutz bei ExplorViz richten Sie bitte an{' '}
          <a href="mailto:explorviz@email.uni-kiel.de">explorviz@email.uni-kiel.de</a>.
        </p>

        <h2>2. Datenschutzbeauftragter</h2>
        <p>
          Den Datenschutzbeauftragten der CAU erreichen Sie unter{' '}
          <a href="mailto:datenschutz@uv.uni-kiel.de">datenschutz@uv.uni-kiel.de</a>. Die vollständige Anschrift finden
          Sie in der <ExternalLink href={CAU_PRIVACY_URL}>Datenschutzerklärung der CAU</ExternalLink>.
        </p>

        <h2>3. Zweck, Rechtsgrundlage und Empfänger</h2>
        <p>
          ExplorViz ist eine webbasierte Software zur Visualisierung von Softwarelandschaften. Die Arbeitsgruppe
          Software Engineering betreibt es für Forschung und Lehre auf der Infrastruktur der CAU. Wir verarbeiten
          personenbezogene Daten, um diese öffentlichen Aufgaben der Universität zu erfüllen. Rechtsgrundlage ist,
          soweit nichts anderes angegeben ist, § 3 Abs. 1 LDSG Schleswig-Holstein in Verbindung mit Art. 6 Abs. 1 lit. e
          DSGVO.
        </p>
        <p>An Dritte außerhalb der Universität übermitteln wir keine Daten.</p>

        <h2>4. Ihre Rechte</h2>
        <p>
          Sie haben das Recht auf Auskunft (Art. 15 DSGVO), Berichtigung (Art. 16 DSGVO), Löschung (Art. 17 DSGVO),
          Einschränkung der Verarbeitung (Art. 18 DSGVO) und Widerspruch (Art. 21 DSGVO). Außerdem können Sie sich beim
          Unabhängigen Landeszentrum für Datenschutz Schleswig-Holstein (ULD) beschweren. Einzelheiten und die
          Kontaktdaten des ULD stehen in Abschnitt 3 der{' '}
          <ExternalLink href={CAU_PRIVACY_URL}>Datenschutzerklärung der CAU</ExternalLink>.
        </p>

        <h2>5. Bereitstellung der Webanwendung</h2>

        <h3>5.1 Server-Logdateien</h3>
        <p>
          Wenn Sie ExplorViz unter https://demo.explorviz.uni-kiel.de aufrufen, laufen Ihre Anfragen zunächst über das
          Rechenzentrums der CAU und werden dann über den Webserver von ExplorViz verarbeitet. Dabei können folgende
          Daten in Logdateien gespeichert werden:
        </p>
        <ul>
          <li>Datum und Uhrzeit des Abrufs</li>
          <li>angeforderte Datei bzw. Schnittstelle</li>
          <li>Seite, von der aus der Abruf erfolgt (Referrer)</li>
          <li>Zugriffsstatus und übertragene Datenmenge</li>
          <li>verwendeter Browser und Betriebssystem</li>
          <li>IP-Adresse des anfragenden Rechners </li>
        </ul>
        <p>
          Die Daten dienen dem sicheren und stabilen Betrieb, vor allem der Fehlersuche und der Abwehr von Angriffen.
          Für die Logdateien des Rechenzentrums gilt Abschnitt 4.1 der{' '}
          <ExternalLink href={CAU_PRIVACY_URL}>Datenschutzerklärung der CAU</ExternalLink>: Die IP-Adressen werden dort
          nach spätestens sieben Tagen durch Kürzung anonymisiert. Die Daten werden nicht mit anderen Datenbeständen
          zusammengeführt.
        </p>

        <h3>5.2 Verschlüsselung</h3>
        <p>Die Verbindung zu ExplorViz und seinen Diensten ist per HTTPS verschlüsselt.</p>

        <h3>5.3 Keine externen Inhalte, kein Tracking</h3>
        <p>
          ExplorViz lädt alle Bestandteile (Skripte, Schriftarten, Bilder, 3D-Modelle) von den eigenen Servern. Ihr
          Browser baut beim Nutzen von ExplorViz keine Verbindung zu Dritten auf. ExplorViz verwendet keine Webanalyse-
          oder Tracking-Werkzeuge und blendet keine Werbung ein.
        </p>

        <h2>6. Keine Cookies, lokale Speicherung im Browser</h2>
        <p>ExplorViz setzt keine Cookies. Deshalb gibt es auch kein Cookie-Banner.</p>
        <p>
          Einige Einstellungen speichert ExplorViz im lokalen Speicher Ihres Browsers (Local Storage). Diese Daten
          bleiben auf Ihrem Gerät und werden nicht automatisch an unsere Server übertragen. Gespeichert werden:
        </p>
        <ul>
          <li>Visualisierungseinstellungen (z. B. Farben, Layout, Kamera)</li>
          <li>Größe von Seitenleisten und Bedienfeldern</li>
          <li>
            Ihr selbst gewählter Anzeigename für die Zusammenarbeit und die Einstellung, ob Teilnehmende angezeigt
            werden
          </li>
          <li>zuletzt erzeugte Diagramme</li>
        </ul>
        <p>
          Die Speicherung ist unbedingt erforderlich, um die von Ihnen gewünschten Funktionen bereitzustellen.
          Rechtsgrundlage ist § 25 Abs. 2 Nr. 2 TDDDG in Verbindung mit Art. 6 Abs. 1 lit. e DSGVO. Sie können die Daten
          jederzeit löschen, indem Sie die Websitedaten für ExplorViz in Ihrem Browser entfernen.
        </p>

        <h2>7. Datenverarbeitung bei der Nutzung von ExplorViz</h2>

        <h3>7.1 Keine Anmeldung</h3>
        <p>
          Sie können ExplorViz ohne Registrierung und ohne Anmeldung nutzen. Es gibt keine Benutzerkonten. Wir erheben
          daher weder Namen noch E-Mail-Adressen oder Passwörter.
        </p>

        <h3>7.2 Landschaften und Snapshots</h3>
        <p>
          Der Benutzerdienst speichert Landschafts-Tokens und deren Namen sowie Snapshots (gespeicherte Ansichten einer
          Visualisierung) samt Erstellungs- und Ablaufdatum. Diese Daten sind keiner Person zugeordnet. Weil es keine
          Benutzerkonten gibt, sind sie für alle Nutzenden dieser ExplorViz-Instanz sichtbar. Speichern Sie dort deshalb
          keine vertraulichen Inhalte. Sie können Tokens und Snapshots in ExplorViz jederzeit löschen.
        </p>

        <h3>7.3 Analysierte Software- und Laufzeitdaten</h3>
        <p>ExplorViz visualisiert Daten, die Sie selbst bereitstellen:</p>
        <ul>
          <li>
            <strong>Laufzeitdaten</strong> (Traces, Metriken, Logs). Ihre instrumentierte Anwendung sendet sie per
            OpenTelemetry an ExplorViz.
          </li>
          <li>
            <strong>Statische Code-Analysen</strong> von Git-Repositories, die Sie zur Analyse angeben.
          </li>
          <li>
            <strong>Daten zur Software-Evolution</strong> aus der Git-Historie, z. B. Commits und deren Zeitpunkte.
          </li>
        </ul>
        <p>
          In diesen Daten können personenbezogene Daten Dritter enthalten sein, etwa Namen, E-Mail-Adressen und
          GitHub-Benutzernamen von Commit-Autorinnen und -Autoren (die ExplorViz unter „Social Metrics“ anzeigt). Auch
          Log-Einträge oder Anfrageparameter können solche Daten enthalten. Diese Daten kann jeder einsehen, der den
          Landschafts-Token kennt oder die Instanz nutzt. Wer Daten hochlädt, muss selbst sicherstellen, dass er sie
          verarbeiten darf, und sollte personenbezogene Inhalte möglichst vermeiden oder pseudonymisieren. Die Daten
          werden gespeichert, bis die Landschaft gelöscht wird oder [Löschfrist für Laufzeit- und Analysedaten].
        </p>

        <h3>7.4 Gemeinsames Arbeiten (Kollaboration)</h3>
        <p>
          In einem gemeinsamen Raum können Sie eine Visualisierung mit anderen ansehen und bearbeiten. Dabei verarbeitet
          der Kollaborationsdienst Ihren Anzeigenamen, Ihre Raumzugehörigkeit und Ihre Interaktionen, z. B. Mauszeiger-
          und Kameraposition, Hervorhebungen, Änderungen und Ihren Online-Status. Diese Daten werden in Echtzeit an die
          anderen Teilnehmenden des Raums übertragen. Gespeichert werden sie nur so lange, wie der Raum besteht. Ihren
          Anzeigenamen wählen Sie selbst. Ein Pseudonym ist möglich.
        </p>

        <h3>7.5 IDE-Anbindung (VS Code)</h3>
        <p>
          Wenn Sie die ExplorViz-Erweiterung für Visual Studio Code nutzen, verbindet sich ExplorViz über WebSocket mit
          dem VS-Code-Dienst. Übertragen werden der Landschafts-Token und Navigationsereignisse (z. B. die geöffnete
          Klasse oder Methode), um die Ansichten in Browser und IDE abzugleichen.
        </p>

        <h2>8. Kontaktaufnahme per E-Mail</h2>
        <p>
          Wenn Sie uns per E-Mail schreiben, verwenden wir Ihre Angaben nur, um Ihre Anfrage zu bearbeiten, und geben
          sie nicht an Dritte weiter.
        </p>

        <h2>9. Änderungen</h2>
        <p>
          Wir passen diese Datenschutzerklärung an, wenn sich ExplorViz technisch weiterentwickelt oder sich die
          Rechtslage ändert. Es gilt die jeweils hier veröffentlichte Fassung.
        </p>
        <p>Stand: {LAST_UPDATED}</p>
      </div>
    </div>
  );
}
