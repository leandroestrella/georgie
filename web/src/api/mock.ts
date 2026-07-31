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
      "name": "The Reading Room (Living Fiction)",
      "names": {
        "it": "La Sala di Lettura (Narrativa vivente)",
        "es": "La Sala de Lectura (Narrativa viva)"
      },
      "description": "Fiction being written now: contemporary novels and stories grouped by where they come from, plus dystopias and imagined futures",
      "descriptions": {
        "it": "La narrativa che si scrive oggi: romanzi e racconti contemporanei raggruppati per provenienza, più distopie e futuri immaginati",
        "es": "La narrativa que se escribe hoy: novelas y relatos contemporáneos agrupados por procedencia, más distopías y futuros imaginados"
      },
      "marker": "🌐",
      "themes": [
        {
          "name": "Contemporary Fiction — Italian",
          "names": {
            "it": "Narrativa contemporanea — italiana",
            "es": "Narrativa contemporánea — italiana"
          },
          "description": "Novels and stories written in the language spoken in this house",
          "descriptions": {
            "it": "Romanzi e racconti scritti nella lingua che si parla in questa casa",
            "es": "Novelas y relatos escritos en la lengua que se habla en esta casa"
          }
        },
        {
          "name": "Contemporary Fiction — Iberoamerican",
          "names": {
            "it": "Narrativa contemporanea — iberoamericana",
            "es": "Narrativa contemporánea — iberoamericana"
          },
          "description": "Voices from Argentina, Latin America and Spain: the shelf that travelled furthest to get here",
          "descriptions": {
            "it": "Voci dall'Argentina, dall'America Latina e dalla Spagna: lo scaffale che ha viaggiato più a lungo per arrivare qui",
            "es": "Voces de Argentina, América Latina y España: el estante que viajó más lejos para llegar aquí"
          }
        },
        {
          "name": "Contemporary Fiction — Anglophone",
          "names": {
            "it": "Narrativa contemporanea — anglofona",
            "es": "Narrativa contemporánea — anglófona"
          },
          "description": "Fiction written in English, read here in translation or in the original",
          "descriptions": {
            "it": "Narrativa scritta in inglese, letta qui in traduzione o in lingua originale",
            "es": "Narrativa escrita en inglés, leída aquí en traducción o en el original"
          }
        },
        {
          "name": "Contemporary Fiction — Other Languages",
          "names": {
            "it": "Narrativa contemporanea — altre lingue",
            "es": "Narrativa contemporánea — otras lenguas"
          },
          "description": "Everything that reached us through a translator: Korean, Czech, Turkish, Polish and more",
          "descriptions": {
            "it": "Tutto ciò che ci è arrivato attraverso un traduttore: coreano, ceco, turco, polacco e altre lingue",
            "es": "Todo lo que nos llegó a través de un traductor: coreano, checo, turco, polaco y más"
          }
        },
        {
          "name": "Other Worlds & Futures",
          "names": {
            "it": "Altri mondi e futuri",
            "es": "Otros mundos y futuros"
          },
          "description": "Stories set where nobody lives yet: dystopias, alternate histories, futures that might still arrive",
          "descriptions": {
            "it": "Storie ambientate dove nessuno abita ancora: distopie, storie alternative, futuri che potrebbero ancora arrivare",
            "es": "Historias situadas donde nadie vive todavía: distopías, historias alternativas, futuros que aún podrían llegar"
          }
        }
      ]
    },
    {
      "name": "The Old Library (Canon & Antiquity)",
      "names": {
        "it": "Il Fondo Antico (Canone e antichità)",
        "es": "El Fondo Antiguo (Canon y antigüedad)"
      },
      "description": "Books that were already old when we found them: the classics, the epics, and verse",
      "descriptions": {
        "it": "I libri che erano già antichi quando li abbiamo trovati: i classici, i poemi epici e la poesia",
        "es": "Los libros que ya eran antiguos cuando los encontramos: los clásicos, los poemas épicos y la poesía"
      },
      "marker": "🏛️",
      "themes": [
        {
          "name": "Classics & Canon",
          "names": {
            "it": "Classici e canone",
            "es": "Clásicos y canon"
          },
          "description": "Books that were already famous before they arrived here",
          "descriptions": {
            "it": "Libri che erano già famosi prima di arrivare qui",
            "es": "Libros que ya eran famosos antes de llegar aquí"
          }
        },
        {
          "name": "Poetry & Verse",
          "names": {
            "it": "Poesia e versi",
            "es": "Poesía y versos"
          },
          "description": "Lines short enough to read standing up",
          "descriptions": {
            "it": "Versi abbastanza brevi da leggersi in piedi",
            "es": "Versos lo bastante breves para leerse de pie"
          }
        }
      ]
    },
    {
      "name": "The Archive (Witness & Record)",
      "names": {
        "it": "L'Archivio (Testimonianza e documento)",
        "es": "El Archivo (Testimonio y documento)"
      },
      "description": "Accounts of what actually happened: history and geopolitics, diaries and letters, and writing about real places",
      "descriptions": {
        "it": "Racconti di ciò che è realmente accaduto: storia e geopolitica, diari e lettere, e scritture sui luoghi reali",
        "es": "Relatos de lo que realmente ocurrió: historia y geopolítica, diarios y cartas, y escrituras sobre lugares reales"
      },
      "marker": "📰",
      "themes": [
        {
          "name": "History & Geopolitics",
          "names": {
            "it": "Storia e geopolitica",
            "es": "Historia y geopolítica"
          },
          "description": "How the world took its current shape, told by people who studied it",
          "descriptions": {
            "it": "Come il mondo ha preso la forma che ha, raccontato da chi l'ha studiato",
            "es": "Cómo el mundo tomó su forma actual, contado por quienes lo estudiaron"
          }
        },
        {
          "name": "Memoir, Diaries & Letters",
          "names": {
            "it": "Memorie, diari e lettere",
            "es": "Memorias, diarios y cartas"
          },
          "description": "One person's own life, in their own words",
          "descriptions": {
            "it": "La vita di una persona, raccontata con le sue parole",
            "es": "La vida de una persona, contada con sus propias palabras"
          }
        },
        {
          "name": "Travel Writing & Place",
          "names": {
            "it": "Letteratura di viaggio e luoghi",
            "es": "Literatura de viaje y lugares"
          },
          "description": "Going somewhere on the page, with none of the practical advice",
          "descriptions": {
            "it": "Andare in un posto stando sulla pagina, senza nessun consiglio pratico",
            "es": "Ir a algún sitio desde la página, sin ningún consejo práctico"
          }
        },
        {
          "name": "Travel Guides",
          "names": {
            "it": "Guide di viaggio",
            "es": "Guías de viaje"
          },
          "description": "The ones that actually go in the suitcase",
          "descriptions": {
            "it": "Quelle che finiscono davvero in valigia",
            "es": "Las que de verdad acaban en la maleta"
          }
        }
      ]
    },
    {
      "name": "The Studio (Making & Images)",
      "names": {
        "it": "Lo Studio (Fare e immagini)",
        "es": "El Estudio (Hacer e imágenes)"
      },
      "description": "Art as something made: exhibition catalogs and artist books, art history and criticism, architecture and design, zines and comics",
      "descriptions": {
        "it": "L'arte come cosa fatta: cataloghi di mostre e libri d'artista, storia e critica dell'arte, architettura e design, fanzine e fumetti",
        "es": "El arte como cosa hecha: catálogos de exposiciones y libros de artista, historia y crítica del arte, arquitectura y diseño, fanzines y cómics"
      },
      "marker": "📐",
      "themes": [
        {
          "name": "Exhibitions & Artist Books",
          "names": {
            "it": "Mostre e libri d'artista",
            "es": "Exposiciones y libros de artista"
          },
          "description": "What remains after the show comes down",
          "descriptions": {
            "it": "Ciò che resta quando la mostra viene smontata",
            "es": "Lo que queda cuando la exposición se desmonta"
          }
        },
        {
          "name": "Art History & Criticism",
          "names": {
            "it": "Storia e critica dell'arte",
            "es": "Historia y crítica del arte"
          },
          "description": "People explaining, at length, why the work matters",
          "descriptions": {
            "it": "Chi spiega, a lungo, perché l'opera conta",
            "es": "Quienes explican, con detalle, por qué la obra importa"
          }
        },
        {
          "name": "Architecture & Design",
          "names": {
            "it": "Architettura e design",
            "es": "Arquitectura y diseño"
          },
          "description": "Buildings and objects, and the thinking behind their shape",
          "descriptions": {
            "it": "Edifici e oggetti, e il pensiero dietro la loro forma",
            "es": "Edificios y objetos, y el pensamiento detrás de su forma"
          }
        },
        {
          "name": "Zines, Comics & Self-Publishing",
          "names": {
            "it": "Fanzine, fumetti e autoproduzioni",
            "es": "Fanzines, cómics y autoedición"
          },
          "description": "Printed by whoever made it: comics, fanzines, short runs, things handed over in person",
          "descriptions": {
            "it": "Stampato da chi l'ha fatto: fumetti, fanzine, tirature brevi, cose passate di mano in mano",
            "es": "Impreso por quien lo hizo: cómics, fanzines, tiradas cortas, cosas entregadas en mano"
          }
        }
      ]
    },
    {
      "name": "The Commons (Power & Collective Life)",
      "names": {
        "it": "Il Comune (Potere e vita collettiva)",
        "es": "El Común (Poder y vida colectiva)"
      },
      "description": "How we live together and who decides: political theory and utopia, activism and dissent",
      "descriptions": {
        "it": "Come viviamo insieme e chi decide: teoria politica e utopia, attivismo e dissenso",
        "es": "Cómo vivimos juntos y quién decide: teoría política y utopía, activismo y disidencia"
      },
      "marker": "✊",
      "themes": [
        {
          "name": "Political Theory & Utopia",
          "names": {
            "it": "Teoria politica e utopia",
            "es": "Teoría política y utopía"
          },
          "description": "Proposals for how things could be arranged instead",
          "descriptions": {
            "it": "Proposte su come le cose potrebbero essere organizzate altrimenti",
            "es": "Propuestas sobre cómo podrían organizarse las cosas de otro modo"
          }
        },
        {
          "name": "Activism & Dissent",
          "names": {
            "it": "Attivismo e dissenso",
            "es": "Activismo y disidencia"
          },
          "description": "People who refused, and then wrote about it",
          "descriptions": {
            "it": "Chi ha detto no, e poi l'ha scritto",
            "es": "Quienes dijeron no, y luego lo escribieron"
          }
        }
      ]
    },
    {
      "name": "The Self (Inner Life & Memory)",
      "names": {
        "it": "Il Sé (Vita interiore e memoria)",
        "es": "El Yo (Vida interior y memoria)"
      },
      "description": "The questions you ask alone: philosophy of existence, belief and inner practice",
      "descriptions": {
        "it": "Le domande che ci si fa da soli: filosofia dell'esistenza, fede e pratica interiore",
        "es": "Las preguntas que uno se hace a solas: filosofía de la existencia, fe y práctica interior"
      },
      "marker": "🕯️",
      "themes": [
        {
          "name": "Philosophy of Existence",
          "names": {
            "it": "Filosofia dell'esistenza",
            "es": "Filosofía de la existencia"
          },
          "description": "Being alive, treated as a problem worth thinking through",
          "descriptions": {
            "it": "Essere vivi, trattato come un problema che vale la pena pensare fino in fondo",
            "es": "Estar vivo, tratado como un problema que vale la pena pensar a fondo"
          }
        },
        {
          "name": "Belief, Faith & Inner Practice",
          "names": {
            "it": "Fede e pratica interiore",
            "es": "Fe y práctica interior"
          },
          "description": "Books that ask for faith rather than agreement",
          "descriptions": {
            "it": "Libri che chiedono fede più che consenso",
            "es": "Libros que piden fe más que acuerdo"
          }
        }
      ]
    },
    {
      "name": "The Machine (Systems & Signals)",
      "names": {
        "it": "La Macchina (Sistemi e segnali)",
        "es": "La Máquina (Sistemas y señales)"
      },
      "description": "Systems that run without us: science and the cosmos, sound and music, digital and media theory",
      "descriptions": {
        "it": "I sistemi che funzionano senza di noi: scienza e cosmo, suono e musica, teoria digitale e dei media",
        "es": "Los sistemas que funcionan sin nosotros: ciencia y cosmos, sonido y música, teoría digital y de los medios"
      },
      "marker": "⚙️",
      "themes": [
        {
          "name": "Science & Cosmos",
          "names": {
            "it": "Scienza e cosmo",
            "es": "Ciencia y cosmos"
          },
          "description": "Time, matter, memory and the universe, explained for people who aren't physicists",
          "descriptions": {
            "it": "Tempo, materia, memoria e universo, spiegati a chi non è fisico",
            "es": "Tiempo, materia, memoria y universo, explicados para quien no es físico"
          }
        },
        {
          "name": "Sound & Music",
          "names": {
            "it": "Suono e musica",
            "es": "Sonido y música"
          },
          "description": "Listening treated as a discipline: noise, silence, and the people who made both",
          "descriptions": {
            "it": "L'ascolto trattato come disciplina: rumore, silenzio, e chi ha fatto entrambi",
            "es": "La escucha tratada como disciplina: ruido, silencio, y quienes hicieron ambos"
          }
        },
        {
          "name": "Digital & Media Theory",
          "names": {
            "it": "Teoria digitale e dei media",
            "es": "Teoría digital y de los medios"
          },
          "description": "What screens and networks are doing to us, argued rather than reported",
          "descriptions": {
            "it": "Cosa ci stanno facendo schermi e reti, argomentato più che raccontato",
            "es": "Qué nos están haciendo las pantallas y las redes, argumentado más que narrado"
          }
        }
      ]
    },
    {
      "name": "The Workshop (Skills & Instruments)",
      "names": {
        "it": "L'Officina (Abilità e strumenti)",
        "es": "El Taller (Habilidades e instrumentos)"
      },
      "description": "Books you use with your hands: manuals, craft and cooking, language and reference",
      "descriptions": {
        "it": "I libri che si usano con le mani: manuali, artigianato e cucina, lingue e consultazione",
        "es": "Los libros que se usan con las manos: manuales, artesanía y cocina, lenguas y consulta"
      },
      "marker": "🧵",
      "themes": [
        {
          "name": "Manuals, Craft & Cooking",
          "names": {
            "it": "Manuali, artigianato e cucina",
            "es": "Manuales, artesanía y cocina"
          },
          "description": "Instructions to follow with your hands already dirty",
          "descriptions": {
            "it": "Istruzioni da seguire con le mani già sporche",
            "es": "Instrucciones para seguir con las manos ya sucias"
          }
        },
        {
          "name": "Language & Reference",
          "names": {
            "it": "Lingue e consultazione",
            "es": "Lenguas y consulta"
          },
          "description": "Books you open at one page and close again",
          "descriptions": {
            "it": "Libri che si aprono a una pagina e si richiudono",
            "es": "Libros que se abren en una página y se cierran otra vez"
          }
        }
      ]
    }
  ],
  "themeToZone": {
    "Contemporary Fiction — Italian": "The Reading Room (Living Fiction)",
    "Contemporary Fiction — Iberoamerican": "The Reading Room (Living Fiction)",
    "Contemporary Fiction — Anglophone": "The Reading Room (Living Fiction)",
    "Contemporary Fiction — Other Languages": "The Reading Room (Living Fiction)",
    "Other Worlds & Futures": "The Reading Room (Living Fiction)",
    "Classics & Canon": "The Old Library (Canon & Antiquity)",
    "Poetry & Verse": "The Old Library (Canon & Antiquity)",
    "History & Geopolitics": "The Archive (Witness & Record)",
    "Memoir, Diaries & Letters": "The Archive (Witness & Record)",
    "Travel Writing & Place": "The Archive (Witness & Record)",
    "Travel Guides": "The Archive (Witness & Record)",
    "Exhibitions & Artist Books": "The Studio (Making & Images)",
    "Art History & Criticism": "The Studio (Making & Images)",
    "Architecture & Design": "The Studio (Making & Images)",
    "Zines, Comics & Self-Publishing": "The Studio (Making & Images)",
    "Political Theory & Utopia": "The Commons (Power & Collective Life)",
    "Activism & Dissent": "The Commons (Power & Collective Life)",
    "Philosophy of Existence": "The Self (Inner Life & Memory)",
    "Belief, Faith & Inner Practice": "The Self (Inner Life & Memory)",
    "Science & Cosmos": "The Machine (Systems & Signals)",
    "Sound & Music": "The Machine (Systems & Signals)",
    "Digital & Media Theory": "The Machine (Systems & Signals)",
    "Manuals, Craft & Cooking": "The Workshop (Skills & Instruments)",
    "Language & Reference": "The Workshop (Skills & Instruments)"
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
    "Kannada",
    "Arabic"
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
    "theme": "Contemporary Fiction — Anglophone",
    "zone": "The Reading Room (Living Fiction)",
    "owner": "leandro, maria",
    "referenceUrl": "",
    "readBy": [],
    "borrowed": false,
    "borrowerName": "",
    "loanDate": "",
    "exchangeStatus": "",
    "exchangeNote": "",
    "exchangeLink": "",
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
    "theme": "Exhibitions & Artist Books",
    "zone": "The Studio (Making & Images)",
    "owner": "leandro",
    "referenceUrl": "",
    "readBy": [
      "leandro"
    ],
    "borrowed": false,
    "borrowerName": "",
    "loanDate": "",
    "exchangeStatus": "",
    "exchangeNote": "",
    "exchangeLink": "",
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
    "theme": "Travel Writing & Place",
    "zone": "The Archive (Witness & Record)",
    "owner": "leandro",
    "referenceUrl": "https://rebelbooks.com/",
    "readBy": [],
    "borrowed": true,
    "borrowerName": "RebelBooks",
    "loanDate": "",
    "exchangeStatus": "",
    "exchangeNote": "",
    "exchangeLink": "",
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
    "theme": "Contemporary Fiction — Anglophone",
    "zone": "The Reading Room (Living Fiction)",
    "owner": "leandro",
    "referenceUrl": "https://www.amazon.it/dp/B00EPJGRG8",
    "readBy": [
      "leandro"
    ],
    "borrowed": true,
    "borrowerName": "Gianluca",
    "loanDate": "",
    "exchangeStatus": "",
    "exchangeNote": "",
    "exchangeLink": "",
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
    "theme": "History & Geopolitics",
    "zone": "The Archive (Witness & Record)",
    "owner": "leandro",
    "referenceUrl": "https://www.amazon.it/dp/885815553X",
    "readBy": [
      "leandro"
    ],
    "borrowed": true,
    "borrowerName": "Thomas",
    "loanDate": "",
    "exchangeStatus": "",
    "exchangeNote": "",
    "exchangeLink": "",
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
    "theme": "Contemporary Fiction — Other Languages",
    "zone": "The Reading Room (Living Fiction)",
    "owner": "leandro",
    "referenceUrl": "",
    "readBy": [],
    "borrowed": false,
    "borrowerName": "",
    "loanDate": "",
    "exchangeStatus": "offered",
    "exchangeNote": "",
    "exchangeLink": "",
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
    "theme": "Classics & Canon",
    "zone": "The Old Library (Canon & Antiquity)",
    "owner": "leandro",
    "referenceUrl": "",
    "readBy": [],
    "borrowed": false,
    "borrowerName": "",
    "loanDate": "",
    "exchangeStatus": "confirmed",
    "exchangeNote": "III Warszawskie Biennale — from marco",
    "exchangeLink": "VVX-III-2010",
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
    "theme": "Exhibitions & Artist Books",
    "zone": "The Studio (Making & Images)",
    "owner": "leandro",
    "referenceUrl": "",
    "readBy": [],
    "borrowed": true,
    "borrowerName": "III Warszawskie Biennale — from marco",
    "loanDate": "",
    "exchangeStatus": "",
    "exchangeNote": "",
    "exchangeLink": "SAI-TER-1939",
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
    "theme": "Art History & Criticism",
    "zone": "The Studio (Making & Images)",
    "owner": "leandro",
    "referenceUrl": "",
    "readBy": [
      "leandro"
    ],
    "borrowed": false,
    "borrowerName": "",
    "loanDate": "",
    "exchangeStatus": "",
    "exchangeNote": "",
    "exchangeLink": "",
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
    "theme": "Activism & Dissent",
    "zone": "The Commons (Power & Collective Life)",
    "owner": "leandro",
    "referenceUrl": "https://rebelbooks.com/",
    "readBy": [],
    "borrowed": false,
    "borrowerName": "",
    "loanDate": "",
    "exchangeStatus": "",
    "exchangeNote": "",
    "exchangeLink": "",
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
    "theme": "Philosophy of Existence",
    "zone": "The Self (Inner Life & Memory)",
    "owner": "leandro",
    "referenceUrl": "",
    "readBy": [
      "leandro"
    ],
    "borrowed": false,
    "borrowerName": "",
    "loanDate": "",
    "exchangeStatus": "",
    "exchangeNote": "",
    "exchangeLink": "",
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
    "theme": "Contemporary Fiction — Anglophone",
    "zone": "The Reading Room (Living Fiction)",
    "owner": "leandro",
    "referenceUrl": "https://rebelbooks.com/",
    "readBy": [
      "leandro"
    ],
    "borrowed": false,
    "borrowerName": "",
    "loanDate": "",
    "exchangeStatus": "",
    "exchangeNote": "",
    "exchangeLink": "",
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
    "theme": "Science & Cosmos",
    "zone": "The Machine (Systems & Signals)",
    "owner": "leandro",
    "referenceUrl": "https://www.amazon.it/dp/8845931927",
    "readBy": [
      "leandro"
    ],
    "borrowed": false,
    "borrowerName": "",
    "loanDate": "",
    "exchangeStatus": "",
    "exchangeNote": "",
    "exchangeLink": "",
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
    "theme": "Art History & Criticism",
    "zone": "The Studio (Making & Images)",
    "owner": "maria",
    "referenceUrl": "https://www.amazon.it/dp/8867831003",
    "readBy": [],
    "borrowed": false,
    "borrowerName": "",
    "loanDate": "",
    "exchangeStatus": "",
    "exchangeNote": "",
    "exchangeLink": "",
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
    "theme": "Philosophy of Existence",
    "zone": "The Self (Inner Life & Memory)",
    "owner": "hugo",
    "referenceUrl": "",
    "readBy": [],
    "borrowed": false,
    "borrowerName": "",
    "loanDate": "",
    "exchangeStatus": "",
    "exchangeNote": "",
    "exchangeLink": "",
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
    "theme": "Sound & Music",
    "zone": "The Machine (Systems & Signals)",
    "owner": "leandro",
    "referenceUrl": "https://www.amazon.it/dp/9082649551",
    "readBy": [
      "leandro"
    ],
    "borrowed": false,
    "borrowerName": "",
    "loanDate": "",
    "exchangeStatus": "",
    "exchangeNote": "",
    "exchangeLink": "",
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
    "theme": "Contemporary Fiction — Italian",
    "zone": "The Reading Room (Living Fiction)",
    "owner": "leandro",
    "referenceUrl": "",
    "readBy": [
      "leandro"
    ],
    "borrowed": false,
    "borrowerName": "",
    "loanDate": "",
    "exchangeStatus": "in transit",
    "exchangeNote": "",
    "exchangeLink": "",
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
    "theme": "Poetry & Verse",
    "zone": "The Old Library (Canon & Antiquity)",
    "owner": "leandro",
    "referenceUrl": "",
    "readBy": [],
    "borrowed": false,
    "borrowerName": "",
    "loanDate": "",
    "exchangeStatus": "",
    "exchangeNote": "",
    "exchangeLink": "",
    "archived": false
  }
]
