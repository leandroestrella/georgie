/**
 * Mock catalog data for offline development and tests.
 *
 * A small, representative slice of the real catalog (18 books) chosen to cover
 * every edge case the UI must handle: N/A ISBNs, unknown and `circa` years,
 * multi-value languages, borrowed books with unknown loan dates, exchange
 * offers, institution authors, and all owners/zones. The SPA falls back to this
 * whenever no backend is configured (`hasBackend` in config.ts), so the UI is
 * fully developable without the live sheet.
 *
 * Regenerated from the dev sheet; not the source of truth — the sheet is.
 */
import type { Book, Taxonomies } from './types'

export const MOCK_TAXONOMIES: Taxonomies = {
  "zones": [
    {
      "name": "Contemporary Art, Curation & Design",
      "description": "This section anchors the physical and visual practices, shifting from broad art history into specific exhibition catalogs and spatial design.",
      "descriptions": {
        "it": "Questa sezione àncora le pratiche fisiche e visive, passando dalla storia dell'arte in senso ampio ai cataloghi di mostre e al design dello spazio.",
        "es": "Esta sección ancla las prácticas físicas y visuales, pasando de la historia del arte en general a los catálogos de exposiciones y el diseño espacial."
      },
      "marker": "🖍️",
      "themes": [
        "Art History & Theory",
        "Exhibitions & Catalogs",
        "Architecture & Spatial Design"
      ]
    },
    {
      "name": "Net-Art, Cybernetics & Sonic Fictions",
      "description": "Moving from physical art into the digital and intangible, this cluster focuses on new media, algorithmic spatiality, and auditory theory.",
      "descriptions": {
        "it": "Dall'arte fisica al digitale e all'intangibile, questo gruppo si concentra sui nuovi media, sulla spazialità algoritmica e sulla teoria sonora.",
        "es": "Del arte físico a lo digital e intangible, este grupo se centra en los nuevos medios, la espacialidad algorítmica y la teoría sónica."
      },
      "marker": "🤖",
      "themes": [
        "Digital Theory",
        "Activism & Cyberculture",
        "Sonic Philosophy"
      ]
    },
    {
      "name": "Radical Politics, Philosophy & Society",
      "description": "The focus shifts here from digital infrastructures to the theoretical frameworks of society, governance, and anarchic thought.",
      "descriptions": {
        "it": "Il focus si sposta dalle infrastrutture digitali ai quadri teorici della società, della governance e del pensiero anarchico.",
        "es": "El enfoque pasa de las infraestructuras digitales a los marcos teóricos de la sociedad, la gobernanza y el pensamiento anárquico."
      },
      "marker": "✊",
      "themes": [
        "Political Theory & Utopia",
        "Philosophy & Existence",
        "Macro-History & Geopolitics"
      ]
    },
    {
      "name": "The Narrative Universes (Fiction & Poetry)",
      "description": "The theoretical gives way to the imagined. This large section can be grouped by the nature of the worlds they build.",
      "descriptions": {
        "it": "Il teorico lascia spazio all'immaginato. Questa ampia sezione può essere raggruppata in base alla natura dei mondi che costruisce.",
        "es": "Lo teórico cede paso a lo imaginado. Esta amplia sección puede agruparse según la naturaleza de los mundos que construye."
      },
      "marker": "🌐",
      "themes": [
        "Dystopia & Alternate Realities",
        "Magical Realism & Core Literature",
        "Contemporary & Short Stories",
        "Poetry"
      ]
    },
    {
      "name": "Mechanics, Travel & The Physical World",
      "description": "A distinct grounding point at the end of the line for manuals, practical guides, and applied sciences.",
      "descriptions": {
        "it": "Un punto d'ancoraggio distinto in fondo alla fila, per manuali, guide pratiche e scienze applicate.",
        "es": "Un punto de anclaje distinto al final de la línea, para manuales, guías prácticas y ciencias aplicadas."
      },
      "marker": "🔭",
      "themes": [
        "Science & Physics",
        "Travel & Geography",
        "Manuals & Hobbies"
      ]
    }
  ],
  "themeToZone": {
    "Art History & Theory": "Contemporary Art, Curation & Design",
    "Exhibitions & Catalogs": "Contemporary Art, Curation & Design",
    "Architecture & Spatial Design": "Contemporary Art, Curation & Design",
    "Digital Theory": "Net-Art, Cybernetics & Sonic Fictions",
    "Activism & Cyberculture": "Net-Art, Cybernetics & Sonic Fictions",
    "Sonic Philosophy": "Net-Art, Cybernetics & Sonic Fictions",
    "Political Theory & Utopia": "Radical Politics, Philosophy & Society",
    "Philosophy & Existence": "Radical Politics, Philosophy & Society",
    "Macro-History & Geopolitics": "Radical Politics, Philosophy & Society",
    "Dystopia & Alternate Realities": "The Narrative Universes (Fiction & Poetry)",
    "Magical Realism & Core Literature": "The Narrative Universes (Fiction & Poetry)",
    "Contemporary & Short Stories": "The Narrative Universes (Fiction & Poetry)",
    "Poetry": "The Narrative Universes (Fiction & Poetry)",
    "Science & Physics": "Mechanics, Travel & The Physical World",
    "Travel & Geography": "Mechanics, Travel & The Physical World",
    "Manuals & Hobbies": "Mechanics, Travel & The Physical World"
  },
  "owners": [
    "leandro",
    "maria",
    "hugo"
  ],
  "languages": [
    "English",
    "Spanish",
    "French",
    "Italian",
    "Polish",
    "Portuguese",
    "Swedish",
    "Czech",
    "German",
    "Galician",
    "Dutch",
    "Russian",
    "Norwegian",
    "Korean",
    "Ancient Greek",
    "Aramaic",
    "Classical Latin",
    "Classical Chinese",
    "Kannada"
  ],
  "ownerMarkers": {
    "leandro": "https://www.leandroestrella.com/img/favicon.ico",
    "maria": "https://cinquecento79lab.com/wp-content/uploads/2023/09/cropped-favicon-150x150.png",
    "hugo": "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b1/Anarchist_black_cat.svg/250px-Anarchist_black_cat.svg.png"
  }
}

export const MOCK_BOOKS: Book[] = [
  {
    "id": "GRE-LES-2018",
    "title": "Less",
    "author": "Andrew Sean Greer",
    "year": 2018,
    "yearPrecision": "",
    "publisher": "Abacus",
    "isbn": "9780349143590",
    "language": [
      "English"
    ],
    "originalLanguage": "English",
    "coverUrl": "https://covers.openlibrary.org/b/isbn/9780349143590-M.jpg",
    "theme": "Contemporary & Short Stories",
    "zone": "The Narrative Universes (Fiction & Poetry)",
    "owner": "leandro",
    "referenceUrl": "",
    "readBy": [],
    "borrowed": false,
    "borrowerName": "",
    "loanDate": "",
    "exchange": false,
    "archived": false
  },
  {
    "id": "URB-BAU-2016",
    "title": "Bausler Institut",
    "author": "Accademia di Belle Arti di Urbino",
    "year": 2016,
    "yearPrecision": "",
    "publisher": "Accademia di Belle Arti di Urbino",
    "isbn": "N/A",
    "language": [
      "English",
      "Italian"
    ],
    "originalLanguage": "English",
    "coverUrl": "",
    "theme": "Exhibitions & Catalogs",
    "zone": "Contemporary Art, Curation & Design",
    "owner": "leandro",
    "referenceUrl": "",
    "readBy": [
      "leandro"
    ],
    "borrowed": false,
    "borrowerName": "",
    "loanDate": "",
    "exchange": false,
    "archived": false
  },
  {
    "id": "KAP-LAP-2007",
    "title": "Lapidarium. In viaggio tra i frammenti della storia",
    "author": "Ryszard Kapuscinski",
    "year": 2007,
    "yearPrecision": "",
    "publisher": "Feltrinelli",
    "isbn": "9788807816338",
    "language": [
      "Italian"
    ],
    "originalLanguage": "Polish",
    "coverUrl": "",
    "theme": "Travel & Geography",
    "zone": "Mechanics, Travel & The Physical World",
    "owner": "leandro",
    "referenceUrl": "https://rebelbooks.com/",
    "readBy": [],
    "borrowed": true,
    "borrowerName": "RebelBooks",
    "loanDate": "",
    "exchange": false,
    "archived": false
  },
  {
    "id": "BUK-POS-2002",
    "title": "Post office",
    "author": "Charles Bukowski",
    "year": 2002,
    "yearPrecision": "",
    "publisher": "La biblioteca di Repubblica",
    "isbn": "9788481305111",
    "language": [
      "Italian"
    ],
    "originalLanguage": "English",
    "coverUrl": "",
    "theme": "Contemporary & Short Stories",
    "zone": "The Narrative Universes (Fiction & Poetry)",
    "owner": "leandro",
    "referenceUrl": "https://www.amazon.it/dp/B00EPJGRG8",
    "readBy": [
      "leandro"
    ],
    "borrowed": true,
    "borrowerName": "Gianluca",
    "loanDate": "",
    "exchange": false,
    "archived": false
  },
  {
    "id": "FOA-SUI-2024",
    "title": "Il suicidio di Israele",
    "author": "Anna Foa",
    "year": 2024,
    "yearPrecision": "",
    "publisher": "Laterza",
    "isbn": "9788858155530",
    "language": [
      "Italian"
    ],
    "originalLanguage": "Italian",
    "coverUrl": "",
    "theme": "Macro-History & Geopolitics",
    "zone": "Radical Politics, Philosophy & Society",
    "owner": "leandro",
    "referenceUrl": "https://www.amazon.it/dp/885815553X",
    "readBy": [
      "leandro"
    ],
    "borrowed": true,
    "borrowerName": "Thomas",
    "loanDate": "",
    "exchange": false,
    "archived": false
  },
  {
    "id": "WER-LIV-1993",
    "title": "Le livre secret des fourmis",
    "author": "Bernard Werber",
    "year": 1993,
    "yearPrecision": "",
    "publisher": "Albin Michel",
    "isbn": "9782226065834",
    "language": [
      "French"
    ],
    "originalLanguage": "French",
    "coverUrl": "https://covers.openlibrary.org/b/isbn/9782226065834-M.jpg",
    "theme": "Contemporary & Short Stories",
    "zone": "The Narrative Universes (Fiction & Poetry)",
    "owner": "leandro",
    "referenceUrl": "",
    "readBy": [],
    "borrowed": false,
    "borrowerName": "",
    "loanDate": "",
    "exchange": true,
    "archived": false
  },
  {
    "id": "SAI-TER-1939",
    "title": "Terra degli uomini",
    "author": "Antoine de Saint-Exupéry",
    "year": 1939,
    "yearPrecision": "circa",
    "publisher": "Garzanti",
    "isbn": "N/A",
    "language": [
      "Italian"
    ],
    "originalLanguage": "French",
    "coverUrl": "",
    "theme": "Magical Realism & Core Literature",
    "zone": "The Narrative Universes (Fiction & Poetry)",
    "owner": "leandro",
    "referenceUrl": "",
    "readBy": [],
    "borrowed": false,
    "borrowerName": "",
    "loanDate": "",
    "exchange": true,
    "archived": false
  },
  {
    "id": "VVX-III-2010",
    "title": "III Warszawskie Biennale Sztuki Mediów / 3rd Warsaw Media Art Biennale 2010",
    "author": "AA. VV.",
    "year": 2010,
    "yearPrecision": "",
    "publisher": "Akademia Sztuk Pięknych w Warszawie",
    "isbn": "N/A",
    "language": [
      "Polish",
      "English"
    ],
    "originalLanguage": "Polish",
    "coverUrl": "",
    "theme": "Exhibitions & Catalogs",
    "zone": "Contemporary Art, Curation & Design",
    "owner": "leandro",
    "referenceUrl": "",
    "readBy": [],
    "borrowed": false,
    "borrowerName": "",
    "loanDate": "",
    "exchange": true,
    "archived": false
  },
  {
    "id": "EST-ICO-2013",
    "title": "Iconoclastia nell'Arte Contemporanea (tesi triennale)",
    "author": "Alexis Leandro Estrella",
    "year": 2013,
    "yearPrecision": "",
    "publisher": "Accademia di Belle Arti di Carrara",
    "isbn": "N/A",
    "language": [
      "Italian"
    ],
    "originalLanguage": "Italian",
    "coverUrl": "",
    "theme": "Art History & Theory",
    "zone": "Contemporary Art, Curation & Design",
    "owner": "leandro",
    "referenceUrl": "",
    "readBy": [
      "leandro"
    ],
    "borrowed": false,
    "borrowerName": "",
    "loanDate": "",
    "exchange": false,
    "archived": false
  },
  {
    "id": "KLE-NOL-2002",
    "title": "No Logo",
    "author": "Naomi Klein",
    "year": 2002,
    "yearPrecision": "",
    "publisher": "Baldini&Castoldi",
    "isbn": "9788884902542",
    "language": [
      "Italian"
    ],
    "originalLanguage": "English",
    "coverUrl": "",
    "theme": "Activism & Cyberculture",
    "zone": "Net-Art, Cybernetics & Sonic Fictions",
    "owner": "leandro",
    "referenceUrl": "https://rebelbooks.com/",
    "readBy": [],
    "borrowed": false,
    "borrowerName": "",
    "loanDate": "",
    "exchange": false,
    "archived": false
  },
  {
    "id": "QUI-ISH-1997",
    "title": "Ishmael",
    "author": "Daniel Quinn",
    "year": 1997,
    "yearPrecision": "",
    "publisher": "Bantam Turner",
    "isbn": "9780553078756",
    "language": [
      "English"
    ],
    "originalLanguage": "English",
    "coverUrl": "https://covers.openlibrary.org/b/isbn/9780553078756-M.jpg",
    "theme": "Philosophy & Existence",
    "zone": "Radical Politics, Philosophy & Society",
    "owner": "leandro",
    "referenceUrl": "",
    "readBy": [
      "leandro"
    ],
    "borrowed": false,
    "borrowerName": "",
    "loanDate": "",
    "exchange": false,
    "archived": false
  },
  {
    "id": "LEW-PIU-1992",
    "title": "Il più grande uomo scimmia del Pleistocene",
    "author": "Roy Lewis",
    "year": 1992,
    "yearPrecision": "",
    "publisher": "Adelphi",
    "isbn": "9788845908804",
    "language": [
      "Italian"
    ],
    "originalLanguage": "English",
    "coverUrl": "",
    "theme": "Contemporary & Short Stories",
    "zone": "The Narrative Universes (Fiction & Poetry)",
    "owner": "leandro",
    "referenceUrl": "https://rebelbooks.com/",
    "readBy": [
      "leandro"
    ],
    "borrowed": false,
    "borrowerName": "",
    "loanDate": "",
    "exchange": false,
    "archived": false
  },
  {
    "id": "ROV-ORD-2017",
    "title": "L'ordine del tempo",
    "author": "Carlo Rovelli",
    "year": 2017,
    "yearPrecision": "",
    "publisher": "Adelphi",
    "isbn": "9788845931925",
    "language": [
      "Italian"
    ],
    "originalLanguage": "Italian",
    "coverUrl": "https://covers.openlibrary.org/b/isbn/9788845931925-M.jpg",
    "theme": "Science & Physics",
    "zone": "Mechanics, Travel & The Physical World",
    "owner": "leandro",
    "referenceUrl": "https://www.amazon.it/dp/8845931927",
    "readBy": [
      "leandro"
    ],
    "borrowed": false,
    "borrowerName": "",
    "loanDate": "",
    "exchange": false,
    "archived": false
  },
  {
    "id": "ZAN-ORA-2015",
    "title": "Un'ora al giorno almeno bisogna essere felici",
    "author": "Laboratorio Zanzara",
    "year": 2015,
    "yearPrecision": "",
    "publisher": "ADD Editore",
    "isbn": "9788867831005",
    "language": [
      "Italian",
      "English"
    ],
    "originalLanguage": "Italian",
    "coverUrl": "",
    "theme": "Art History & Theory",
    "zone": "Contemporary Art, Curation & Design",
    "owner": "maria",
    "referenceUrl": "https://www.amazon.it/dp/8867831003",
    "readBy": [],
    "borrowed": false,
    "borrowerName": "",
    "loanDate": "",
    "exchange": false,
    "archived": false
  },
  {
    "id": "BRE-INP-2026",
    "title": "In parole povere",
    "author": "Franco Brevini",
    "year": 2026,
    "yearPrecision": "",
    "publisher": "Bollati Boringhieri",
    "isbn": "9788833946023",
    "language": [
      "Italian"
    ],
    "originalLanguage": "Italian",
    "coverUrl": "",
    "theme": "Philosophy & Existence",
    "zone": "Radical Politics, Philosophy & Society",
    "owner": "hugo",
    "referenceUrl": "",
    "readBy": [],
    "borrowed": false,
    "borrowerName": "",
    "loanDate": "",
    "exchange": false,
    "archived": false
  },
  {
    "id": "RAD-INT-2019",
    "title": "Intermediary Spaces / Espaces intermédiaires",
    "author": "Éliane Radigue, Julia Eckhardt",
    "year": 2019,
    "yearPrecision": "",
    "publisher": "Q-O2",
    "isbn": "9789082649550",
    "language": [
      "English",
      "French"
    ],
    "originalLanguage": "English",
    "coverUrl": "https://covers.openlibrary.org/b/isbn/9789082649550-M.jpg",
    "theme": "Sonic Philosophy",
    "zone": "Net-Art, Cybernetics & Sonic Fictions",
    "owner": "leandro",
    "referenceUrl": "https://www.amazon.it/dp/9082649551",
    "readBy": [
      "leandro"
    ],
    "borrowed": false,
    "borrowerName": "",
    "loanDate": "",
    "exchange": false,
    "archived": false
  },
  {
    "id": "RUG-OSM-0000",
    "title": "OSM Kids I volume: Il bambino che non aveva soldi",
    "author": "Paolo A. Ruggeri",
    "year": null,
    "yearPrecision": "",
    "publisher": "Engage",
    "isbn": "N/A",
    "language": [
      "Italian"
    ],
    "originalLanguage": "Italian",
    "coverUrl": "",
    "theme": "Contemporary & Short Stories",
    "zone": "The Narrative Universes (Fiction & Poetry)",
    "owner": "leandro",
    "referenceUrl": "",
    "readBy": [
      "leandro"
    ],
    "borrowed": false,
    "borrowerName": "",
    "loanDate": "",
    "exchange": true,
    "archived": false
  },
  {
    "id": "MAR-VIA-0000",
    "title": "La via del tempo",
    "author": "Mimmo Martorana",
    "year": null,
    "yearPrecision": "",
    "publisher": "Aletti Editore",
    "isbn": "N/A",
    "language": [
      "Italian"
    ],
    "originalLanguage": "Italian",
    "coverUrl": "",
    "theme": "Poetry",
    "zone": "The Narrative Universes (Fiction & Poetry)",
    "owner": "leandro",
    "referenceUrl": "",
    "readBy": [],
    "borrowed": false,
    "borrowerName": "",
    "loanDate": "",
    "exchange": false,
    "archived": false
  }
]
