import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import translations
const resources = {
  en: {
    translation: {
      "app": {
        "name": "Aether",
        "tagline": "Sanctuary Gallery"
      },
      "nav": {
        "menu": "Menu",
        "search": "Find sanctuary pieces...",
        "my_registry": "My Registry",
        "install": "Install Sanctuary",
        "upgrade": "Divine Upgrade",
        "about": "About Sanctuary",
        "architect": "The Architect",
        "disconnect": "Disconnect",
        "enter": "Enter",
        "management": "Management",
        "assets": "Assets",
        "moderation": "Moderation",
        "language": "Language",
        "post": "Post Moment",
        "theme": "Atmosphere"
      },
      "about": {
        "title": "About Sanctuary",
        "subtitle": "Aether Gallery",
        "our_sanctuary": "Our Sanctuary",
        "smart_curation": "Smart Curation",
        "global_connectivity": "Global Connectivity",
        "faq": "Registry Support & Guidance"
      },
      "architect": {
        "title": "The Architect",
        "system_architect": "Aether System Architect"
      },
      "common": {
        "back": "Back",
        "save": "Save",
        "saved": "Saved",
        "unsave": "Unsave",
        "like": "Like",
        "liked": "Liked",
        "share": "Share",
        "explore": "Explore",
        "edit": "Edit",
        "delete": "Delete",
        "cancel": "Cancel",
        "confirm": "Confirm",
        "all": "All",
        "premium": "Premium",
        "following": "Following",
        "latest": "Latest",
        "trending": "Trending",
        "popular": "Popular",
        "oldest": "Oldest",
        "mixed": "Mixed",
        "photos": "Photos",
        "videos": "Videos",
        "loading": "Accessing Aether...",
        "end_of_sanctuary": "End of Aether Sanctuary",
        "all_manifestations": "All frequency manifestations attained"
      },
      "ratios": {
        "all": "All Ratios",
        "portrait": "Portrait",
        "landscape": "Landscape",
        "square": "Square",
        "ultrawide": "UltraWide"
      },
      "profile": {
        "contributions": "Contributions",
        "followers": "Followers",
        "following": "Following",
        "sync_identity": "Sync Identity",
        "follow": "Follow",
        "following_btn": "Following"
      }
    }
  },
  hi: {
    translation: {
      "nav": {
        "menu": "मेनू",
        "search": "शरणस्थली की कलाकृतियाँ खोजें...",
        "my_registry": "मेरी रजिस्ट्री",
        "install": "शरणस्थली इंस्टॉल करें",
        "upgrade": "दिव्य अपग्रेड",
        "about": "शरणस्थली के बारे में",
        "architect": "द आर्किटेक्ट",
        "disconnect": "डिस्कनेक्ट करें",
        "enter": "प्रवेश करें",
        "management": "प्रबंधन",
        "assets": "संपत्तियाँ",
        "moderation": "मॉडरेशन",
        "language": "भाषा",
        "post": "क्षण पोस्ट करें",
        "theme": "वातावरण"
      },
      "about": {
        "title": "शरणस्थली के बारे में",
        "subtitle": "एथर गैलरी",
        "our_sanctuary": "हमारी शरणस्थली",
        "smart_curation": "स्मार्ट क्यूरेशन",
        "global_connectivity": "वैश्विक कनेक्टिविटी",
        "faq": "शरणस्थली सहायता एवं मार्गदर्शन"
      },
      "architect": {
        "title": "द आर्किटेक्ट",
        "system_architect": "एथर सिस्टम आर्किटेक्ट"
      },
      "common": {
        "all": "सभी",
        "premium": "प्रीमियम",
        "following": "अनुसरण",
        "latest": "नवीनतम",
        "trending": "रुझान",
        "popular": "लोकप्रिय",
        "oldest": "सबसे पुराना",
        "mixed": "मिश्रित",
        "photos": "फोटो",
        "videos": "वीडियो",
        "loading": "पहुँच प्राप्त कर रहे हैं...",
        "back": "वापस"
      },
      "profile": {
        "contributions": "योगदान",
        "followers": "अनुयायी",
        "following": "अनुसरण",
        "sync_identity": "पहचान मेल करें",
        "follow": "अनुसरण करें",
        "following_btn": "अनुसरण कर रहे हैं",
        "sanctuaries": "शरणस्थलियाँ",
        "appreciations": "प्रशंसा"
      },
      "ratios": {
        "all": "सभी अनुपात",
        "portrait": "पोर्ट्रेट",
        "landscape": "लैंडस्केप",
        "square": "वर्गाकार",
        "ultrawide": "अल्ट्रावाइड"
      }
    }
  },
  es: {
    translation: {
      "nav": {
        "menu": "Menú",
        "search": "Buscar piezas del santuario...",
        "my_registry": "Mi Registro",
        "about": "Sobre el Santuario",
        "architect": "El Arquitecto",
        "theme": "Atmósfera",
        "language": "Idioma"
      },
      "about": {
        "title": "Sobre el Santuario",
        "subtitle": "Galería Aether",
        "our_sanctuary": "Nuestro Santuario",
        "smart_curation": "Curaduría Inteligente",
        "global_connectivity": "Conectividad Global",
        "faq": "Guía y Soporte del Santuario"
      },
      "architect": {
        "title": "El Arquitecto",
        "system_architect": "Arquitecto del Sistema Aether"
      }
    }
  },
  fr: {
    translation: {
      "nav": {
        "menu": "Menu",
        "search": "Trouver des pièces du sanctuaire...",
        "my_registry": "Mon Registre",
        "about": "À propos du Sanctuaire",
        "architect": "L'Architecte",
        "theme": "Atmosphère",
        "language": "Langue"
      },
      "about": {
        "title": "À propos du Sanctuaire",
        "subtitle": "Galerie Aether",
        "our_sanctuary": "Notre Sanctuaire",
        "smart_curation": "Curation Intelligente",
        "global_connectivity": "Connectivité Globale",
        "faq": "Guide du Sanctuaire"
      },
      "architect": {
        "title": "L'Architecte",
        "system_architect": "Architecte Système Aether"
      }
    }
  },
  de: {
    translation: {
      "nav": {
        "menu": "Menü",
        "search": "Heiligtumsstücke finden...",
        "my_registry": "Mein Register",
        "about": "Über das Heiligtum",
        "architect": "Der Architekt",
        "theme": "Atmosphäre",
        "language": "Sprache"
      },
      "about": {
        "title": "Über das Heiligtum",
        "subtitle": "Aether Galerie",
        "our_sanctuary": "Unser Heiligtum",
        "smart_curation": "Smarte Kuration",
        "global_connectivity": "Globale Konnektivität",
        "faq": "Heiligtum Leitfaden"
      },
      "architect": {
        "title": "Der Architekt",
        "system_architect": "Aether Systemarchitekt"
      }
    }
  },
  ja: {
    translation: {
      "nav": {
        "menu": "メニュー",
        "search": "聖域の作品を探す...",
        "my_registry": "マイレジストリ",
        "about": "サンクチュアリについて",
        "architect": "アーキテクト",
        "theme": "雰囲気",
        "language": "言語"
      },
      "about": {
        "title": "サンクチュアリについて",
        "subtitle": "エーテル ギャラリー",
        "our_sanctuary": "私たちの聖域",
        "smart_curation": "スマートキュレーション",
        "global_connectivity": "グローバル接続",
        "faq": "サンクチュアリ ガイド"
      },
      "architect": {
        "title": "アーキテクト",
        "system_architect": "エーテル システム アーキテクト"
      }
    }
  },
  zh: {
    translation: {
      "nav": {
        "menu": "菜单",
        "search": "尋找避難所作品...",
        "my_registry": "我的註冊中心",
        "about": "关于圣所",
        "architect": "建筑师",
        "theme": "氛围",
        "language": "語言"
      },
      "about": {
        "title": "关于圣所",
        "subtitle": "以太画廊",
        "our_sanctuary": "我们的圣所",
        "smart_curation": "智能策展",
        "global_connectivity": "全球连接",
        "faq": "圣所指南"
      },
      "architect": {
        "title": "建筑师",
        "system_architect": "以太系统建筑师"
      }
    }
  },
  ko: {
    translation: {
      "nav": {
        "menu": "메뉴",
        "search": "성소 작품 찾기...",
        "my_registry": "내 등록부",
        "about": "성소 소개",
        "architect": "건축가",
        "theme": "분위기",
        "language": "언어"
      },
      "about": {
        "title": "성소 소개",
        "subtitle": "에테르 갤러리",
        "our_sanctuary": "우리의 성소",
        "smart_curation": "스마트 큐레이션",
        "global_connectivity": "글로벌 연결성",
        "faq": "성소 안내"
      },
      "architect": {
        "title": "건축가",
        "system_architect": "에테르 시스템 건축가"
      }
    }
  },
  ru: {
    translation: {
      "nav": {
        "menu": "Меню",
        "search": "Поиск экспонатов святилища...",
        "my_registry": "Мой реестр",
        "about": "О Святилище",
        "architect": "Архитектор",
        "theme": "Атмосфера",
        "language": "Язык"
      },
      "about": {
        "title": "О Святилище",
        "subtitle": "Галерея Aether",
        "our_sanctuary": "Наше Святилище",
        "smart_curation": "Умная курация",
        "global_connectivity": "Глобальная связь",
        "faq": "Руководство Святилища"
      },
      "architect": {
        "title": "Архитектор",
        "system_architect": "Архитектор системы Aether"
      }
    }
  },
  ar: {
    translation: {
      "nav": {
        "menu": "القائمة",
        "search": "البحث عن قطع الملجأ...",
        "my_registry": "سجلي",
        "about": "عن الملجأ",
        "architect": "المهندس المعماري",
        "theme": "الأجواء",
        "language": "اللغة"
      },
      "about": {
        "title": "عن الملجأ",
        "subtitle": "معرض إيثر",
        "our_sanctuary": "ملجأنا",
        "smart_curation": "التقييم الذكي",
        "global_connectivity": "الاتصال العالمي",
        "faq": "دليل الملجأ"
      },
      "architect": {
        "title": "المهندس المعماري",
        "system_architect": "مهندس نظام إيثر"
      }
    }
  },
  pt: {
    translation: {
      "nav": {
        "menu": "Menu",
        "search": "Encontrar peças do santuário...",
        "my_registry": "Meu Registro",
        "about": "Sobre o Santuário",
        "architect": "O Arquiteto",
        "theme": "Atmosfera",
        "language": "Idioma"
      },
      "about": {
        "title": "Sobre o Santuário",
        "subtitle": "Galeria Aether",
        "our_sanctuary": "Nosso Santuário",
        "smart_curation": "Curadoria Inteligente",
        "global_connectivity": "Conectividade Global",
        "faq": "Guia do Santuário"
      },
      "architect": {
        "title": "O Arquiteto",
        "system_architect": "Arquiteto do Sistema Aether"
      }
    }
  },
  it: {
    translation: {
      "nav": {
        "menu": "Menu",
        "search": "Trova pezzi del santuario...",
        "my_registry": "Il Mio Registro",
        "about": "Informazioni sul Santuario",
        "architect": "L'Architetto",
        "theme": "Atmosfera",
        "language": "Lingua"
      },
      "about": {
        "title": "Informazioni sul Santuario",
        "subtitle": "Galleria Aether",
        "our_sanctuary": "Il Nostro Santuario",
        "smart_curation": "Curatela Intelligente",
        "global_connectivity": "Connettività Globale",
        "faq": "Guida del Santuario"
      },
      "architect": {
        "title": "L'Architetto",
        "system_architect": "Architetto del Sistema Aether"
      }
    }
  },
  tr: {
    translation: {
      "nav": {
        "search": "Sığınak parçalarını bul...",
        "my_registry": "Kaydım",
        "language": "Dil"
      }
    }
  },
  vi: {
    translation: {
      "nav": {
        "search": "Tìm các tác phẩm thánh đường...",
        "my_registry": "Sổ đăng ký của tôi",
        "language": "Ngôn ngữ"
      }
    }
  },
  th: {
    translation: {
      "nav": {
        "search": "ค้นหาผลงานในวิหาร...",
        "my_registry": "ทะเบียนของฉัน",
        "language": "ภาษา"
      }
    }
  },
  id: {
    translation: {
      "nav": {
        "search": "Temukan karya tempat suci...",
        "my_registry": "Registri Saya",
        "language": "Bahasa"
      }
    }
  },
  nl: {
    translation: {
      "nav": {
        "search": "Vind heiligdomstukken...",
        "my_registry": "Mijn Register",
        "language": "Taal"
      }
    }
  },
  pl: {
    translation: {
      "nav": {
        "search": "Znajdź elementy sanktuarium...",
        "my_registry": "Mój Rejestr",
        "language": "Język"
      }
    }
  },
  sv: {
    translation: {
      "nav": {
        "search": "Hitta helgedomsföremål...",
        "my_registry": "Mitt Register",
        "language": "Språk"
      }
    }
  },
  bn: {
    translation: {
      "nav": {
        "search": "অভয়ারণ্যের টুকরা খুঁজুন...",
        "my_registry": "আমার রেজিস্ট্রি",
        "language": "ভাষা"
      }
    }
  },
  pa: {
    translation: {
      "nav": {
        "search": "ਸੁਰੱਖਿਅਤ ਟੁਕੜੇ ਲੱਭੋ...",
        "my_registry": "ਮੇਰੀ ਰਜਿਸਟਰੀ",
        "language": "ਭਾਸ਼ਾ"
      }
    }
  },
  te: {
    translation: {
      "nav": {
        "search": "శరణాలయ ముక్కలను కనుగొనండి...",
        "my_registry": "నా రిజిస్ట్రీ",
        "language": "భాష"
      }
    }
  },
  ta: {
    translation: {
      "nav": {
        "search": "சரணாலயத் துண்டுகளைக் கண்டறியவும்...",
        "my_registry": "எனது பதிவு",
        "language": "மொழி"
      }
    }
  },
  mr: { translation: { "nav": { "search": "अभयारण्य तुकडे शोधा...", "my_registry": "माझी नोंदणी", "language": "भाषा" } } },
  gu: { translation: { "nav": { "search": "અભયારણ્ય ટુકડાઓ શોધો...", "my_registry": "મારી રજિસ્ટ્રી", "language": "ભાષા" } } },
  kn: { translation: { "nav": { "search": "ಅಭಯಾರಣ್ಯದ ತುಣುಕುಗಳನ್ನು ಹುಡುಕಿ...", "my_registry": "ನನ್ನ ನೋಂದಣಿ", "language": "ಭಾಷೆ" } } },
  ml: { translation: { "nav": { "search": "സങ്കേത ശകലങ്ങൾ കണ്ടെത്തുക...", "my_registry": "എന്റെ രജിസ്ട്രി", "language": "ഭാഷ" } } },
  or: { translation: { "nav": { "search": "ଅଭୟାରଣ୍ୟ ଖଣ୍ଡଗୁଡ଼ିକ ଖୋଜ...", "my_registry": "ମୋର ପଞ୍ಜିକରଣ", "language": "ଭାଷା" } } },
  my: { translation: { "nav": { "search": "ဘေးမဲ့တော အပိုင်းအစများကို ရှာဖွေပါ...", "my_registry": "ကျွန်ုပ်၏ မှတ်ပုံတင်ခြင်း", "language": "ဘာသာစကား" } } },
  km: { translation: { "nav": { "search": "ស្វែងរកបំណែកជម្រក...", "my_registry": "បញ្ជីឈ្មោះរបស់ខ្ញុំ", "language": "ភាសា" } } },
  lo: { translation: { "nav": { "search": "ຊອກຫາຕ່ອນບ່ອນສັກສິດ...", "my_registry": "ການລົງທະບຽນຂອງຂ້ອຍ", "language": "ພາສາ" } } },
  tl: { translation: { "nav": { "search": "Maghanap ng mga piraso ng santuwaryo...", "my_registry": "Aking Registry", "language": "Wika" } } },
  ms: { translation: { "nav": { "search": "Cari kepingan tempat perlindungan...", "my_registry": "Registri Saya", "language": "Bahasa" } } },
  he: { translation: { "nav": { "search": "מצא קטעי מקלט...", "my_registry": "הרישום שלי", "language": "שפה" } } },
  fa: { translation: { "nav": { "search": "قطعات پناهگاه را پیدا کنید...", "my_registry": "ثبت من", "language": "زبان" } } },
  el: { translation: { "nav": { "search": "Βρείτε τα κομμάτια του ιερού...", "my_registry": "Το Μητρώο Μου", "language": "Γλώσσα" } } },
  hu: { translation: { "nav": { "search": "Keressen szentélydarabokat...", "my_registry": "Saját Regiszter", "language": "Nyelv" } } },
  cs: { translation: { "nav": { "search": "Najděte úkryty...", "my_registry": "Můj Registr", "language": "Jazyk" } } },
  ro: { translation: { "nav": { "search": "Găsiți piese de sanctuar...", "my_registry": "Registrul Meu", "language": "Limba" } } },
  uk: { translation: { "nav": { "search": "Знайдіть фрагменти святилища...", "my_registry": "Мій реєстр", "language": "Мова" } } },
  fi: { translation: { "nav": { "search": "Etsi pyhäkön osia...", "my_registry": "Rekisterini", "language": "Kieli" } } },
  no: { translation: { "nav": { "search": "Finn helligdomsstykker...", "my_registry": "Mitt Register", "language": "Språk" } } },
  da: { translation: { "nav": { "search": "Find helligdomsdele...", "my_registry": "Mit Register", "language": "Sprog" } } },
  sw: { translation: { "nav": { "search": "Tafuta vipande vya mahali patakatifu...", "my_registry": "Usajili Wangu", "language": "Lugha" } } },
  zu: { translation: { "nav": { "search": "Thola izingcezu zendawo engcwele...", "my_registry": "Irejista Lami", "language": "Ulimi" } } },
  bg: { translation: { "nav": { "search": "Намерете части от светилището...", "my_registry": "Моят регистър", "language": "Език" } } },
  hr: { translation: { "nav": { "search": "Pronađite dijelove svetišta...", "my_registry": "Moj Registar", "language": "Jezik" } } },
  sr: { translation: { "nav": { "search": "Пронађите делове светишта...", "my_registry": "Мој Регистар", "language": "Језик" } } },
  sk: { translation: { "nav": { "search": "Nájdite kúsky útočiska...", "my_registry": "Môj Register", "language": "Jazyk" } } },
  sl: { translation: { "nav": { "search": "Poiščite koščke svetišča...", "my_registry": "Moj Register", "language": "Jezik" } } },
  lt: { translation: { "nav": { "search": "Raskite šventyklos fragmentus...", "my_registry": "Mano Registras", "language": "Kalba" } } },
  lv: { translation: { "nav": { "search": "Atrodiet svētnīcas daļas...", "my_registry": "Mans Reģistrs", "language": "Valoda" } } },
  et: { translation: { "nav": { "search": "Leidke pühakoja tükid...", "my_registry": "Minu Register", "language": "Keel" } } }
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;
