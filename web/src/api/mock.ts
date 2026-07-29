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
      "description": "The physical and visual arts: art history and theory, exhibition catalogs, and the design of buildings and space.",
      "descriptions": {
        "it": "Le arti fisiche e visive: storia e teoria dell'arte, cataloghi di mostre e progettazione di edifici e spazi.",
        "es": "Las artes físicas y visuales: historia y teoría del arte, catálogos de exposiciones y el diseño de edificios y espacios."
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
      "description": "The digital and the intangible: new media and digital theory, cyberculture and activism, and the philosophy of sound.",
      "descriptions": {
        "it": "Il digitale e l'intangibile: nuovi media e teoria digitale, cybercultura e attivismo, e la filosofia del suono.",
        "es": "Lo digital y lo intangible: nuevos medios y teoría digital, cibercultura y activismo, y la filosofía del sonido."
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
      "description": "How societies are imagined and governed: political theory and utopia, philosophy and existence, and macro-history and geopolitics.",
      "descriptions": {
        "it": "Come le società vengono immaginate e governate: teoria politica e utopia, filosofia ed esistenza, macro-storia e geopolitica.",
        "es": "Cómo se imaginan y gobiernan las sociedades: teoría política y utopía, filosofía y existencia, y macrohistoria y geopolítica."
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
      "description": "Imagined worlds in fiction and poetry: dystopias and alternate realities, magical realism, contemporary stories, and verse.",
      "descriptions": {
        "it": "Mondi immaginati nella narrativa e nella poesia: distopie e realtà alternative, realismo magico, racconti contemporanei e poesia.",
        "es": "Mundos imaginados en la ficción y la poesía: distopías y realidades alternativas, realismo mágico, relatos contemporáneos y poesía."
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
      "description": "The applied and physical world: science and physics, travel and geography, and practical manuals and hobbies.",
      "descriptions": {
        "it": "Il mondo applicato e fisico: scienza e fisica, viaggi e geografia, e manuali pratici e hobby.",
        "es": "El mundo aplicado y físico: ciencia y física, viajes y geografía, y manuales prácticos y aficiones."
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
  },
  "users": [
    "leandro",
    "maria"
  ]
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
    "owner": "leandro, maria",
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
