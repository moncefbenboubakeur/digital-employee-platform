export type DemoLanguage = 'ar' | 'fr' | 'en'

export type DemoActionType = 'qr' | 'direction' | 'contact' | 'escalation'

export type LocalizedText = Record<DemoLanguage, string>

export type DemoAction = {
  id: string
  type: DemoActionType
  label: LocalizedText
  description: LocalizedText
  value: string
}

export type AnswerCategory =
  | 'identity'
  | 'services'
  | 'navigation'
  | 'documents'
  | 'language'
  | 'support'

export type PilotCounter = {
  id: string
  label: LocalizedText
  status: LocalizedText
}

export type PilotProfile = {
  tenantName: LocalizedText
  locationName: LocalizedText
  welcomeTitle: LocalizedText
  serviceSummary: LocalizedText
  privacyNote: LocalizedText
  openingHours: LocalizedText
  contactNumber: string
  defaultLanguage: DemoLanguage
  currentWait: LocalizedText
  liveStatus: LocalizedText
  fallbackResponse: LocalizedText
  /**
   * When true, unknown questions get routed to the LAPI internet-fallback
   * project (web tools enabled) and the kiosk shows a "found on the
   * internet" answer instead of the canned fallback wording.
   */
  useInternetFallback: boolean
  counters: PilotCounter[]
}

export type DemoAnswer = {
  id: string
  canonicalQuestion: LocalizedText
  answerText: LocalizedText
  keywords: string[]
  actionId?: string
  usageCount: number
  lastUpdated: string
  category: AnswerCategory
  published: boolean
}

export type UnknownQuestionStatus = 'new' | 'approved' | 'rejected' | 'out_of_scope'

export type UnknownQuestionDraft = {
  answerText: LocalizedText
  source: string
  generatedAt: string
}

export type UnknownQuestion = {
  id: string
  question: string
  language: DemoLanguage
  fallbackResponse: LocalizedText
  count: number
  confidence: 'low' | 'medium'
  status: UnknownQuestionStatus
  createdAt: string
  draft?: UnknownQuestionDraft
}

export type QuestionEvent = {
  id: string
  question: string
  language: DemoLanguage
  cacheHit: boolean
  answerId?: string
  createdAt: string
}

export const demoLanguages: Array<{ id: DemoLanguage; label: string; shortLabel: string }> = [
  { id: 'ar', label: 'العربية', shortLabel: 'AR' },
  { id: 'fr', label: 'Français', shortLabel: 'FR' },
  { id: 'en', label: 'English', shortLabel: 'EN' },
]

export const answerCategories: AnswerCategory[] = [
  'identity',
  'services',
  'navigation',
  'documents',
  'language',
  'support',
]

export const demoActions: DemoAction[] = [
  {
    id: 'renewal-checklist',
    type: 'qr',
    label: {
      ar: 'قائمة الوثائق',
      fr: 'Liste des documents',
      en: 'Document checklist',
    },
    description: {
      ar: 'امسح الرمز لفتح قائمة الوثائق: بطاقة التعريف الوطنية، استمارة S12، صورتان شمسيتان، وطابع جبائي إن لزم.',
      fr: 'Scannez le code pour la liste : pièce d’identité, formulaire S12, deux photos, timbre fiscal si requis.',
      en: 'Scan the code for the checklist: national ID, S12 form, two passport photos, and fiscal stamp if required.',
    },
    value: 'renewal-checklist',
  },
  {
    id: 'counter-3',
    type: 'direction',
    label: {
      ar: 'الشباك 3 — الحالة المدنية',
      fr: 'Guichet 3 — État civil',
      en: 'Counter 3 — Civil status',
    },
    description: {
      ar: 'اتجه إلى الشباك 3 في الجهة اليمنى من القاعة لاستخراج شهادة الميلاد أو الفيش العائلية.',
      fr: 'Allez au guichet 3, à droite dans le hall, pour un extrait de naissance ou une fiche familiale.',
      en: 'Go to counter 3 on the right side of the hall for a birth certificate or family record.',
    },
    value: 'counter-3',
  },
  {
    id: 'info-desk',
    type: 'direction',
    label: {
      ar: 'مكتب الاستقبال',
      fr: 'Bureau d’information',
      en: 'Information desk',
    },
    description: {
      ar: 'مكتب الاستقبال موجود قرب المدخل الرئيسي.',
      fr: 'Le bureau d’information se trouve près de l’entrée principale.',
      en: 'The information desk is near the main entrance.',
    },
    value: 'main-entrance',
  },
  {
    id: 'office-contact',
    type: 'contact',
    label: {
      ar: 'اتصل بالمصلحة',
      fr: 'Contacter le service',
      en: 'Contact the office',
    },
    description: {
      ar: 'للمتابعة يمكنكم الاتصال على الرقم 021 00 00 00.',
      fr: 'Pour le suivi, appelez le 021 00 00 00.',
      en: 'For follow-up, call 021 00 00 00.',
    },
    value: '021 00 00 00',
  },
  {
    id: 'staff-help',
    type: 'escalation',
    label: {
      ar: 'مساعدة موظف',
      fr: 'Aide d’un agent',
      en: 'Staff help',
    },
    description: {
      ar: 'إذا لم تكن متأكدا، اطلب المساعدة من مكتب الاستقبال.',
      fr: 'Si vous n’êtes pas sûr, demandez de l’aide au bureau d’information.',
      en: 'If you are not sure, ask the information desk for help.',
    },
    value: 'staff-help',
  },
]

export const pilotProfile: PilotProfile = {
  tenantName: {
    ar: 'بلدية باب الزوار',
    fr: 'APC Bab Ezzouar',
    en: 'Bab Ezzouar Municipal Office',
  },
  locationName: {
    ar: 'مكتب الحالة المدنية',
    fr: 'Service état civil',
    en: 'Civil status service desk',
  },
  welcomeTitle: {
    ar: 'مساعدة رقمية لاستقبال المواطنين',
    fr: 'Accueil citoyen assisté par une employée digitale',
    en: 'Citizen reception supported by a digital employee',
  },
  serviceSummary: {
    ar: 'توجه الزوار نحو الوثائق، الشبابيك، أوقات العمل، والمساعدة البشرية عند الحاجة.',
    fr: 'Oriente les visiteurs vers les documents, guichets, horaires et agents humains quand nécessaire.',
    en: 'Guides visitors to documents, counters, opening hours, and human staff when needed.',
  },
  privacyNote: {
    ar: 'لا تدخل معلومات شخصية حساسة في هذا النموذج التجريبي.',
    fr: 'Ne saisissez pas d’informations personnelles sensibles dans cette démonstration.',
    en: 'Do not enter sensitive personal information in this demo.',
  },
  openingHours: {
    ar: 'من الأحد إلى الخميس، من 8:30 صباحا إلى 4:00 مساء.',
    fr: 'Du dimanche au jeudi, de 8h30 à 16h00.',
    en: 'Sunday to Thursday, from 8:30 AM to 4:00 PM.',
  },
  contactNumber: '021 00 00 00',
  defaultLanguage: 'fr',
  useInternetFallback: false,
  currentWait: {
    ar: 'الانتظار التقريبي: 12 دقيقة',
    fr: 'Attente estimée : 12 min',
    en: 'Estimated wait: 12 min',
  },
  liveStatus: {
    ar: 'وضع تجريبي محلي بدون ذكاء اصطناعي خارجي',
    fr: 'Démo locale sans appel IA externe',
    en: 'Local demo with no external AI call',
  },
  fallbackResponse: {
    ar: 'لا أملك جوابا مؤكدا لهذا السؤال بعد. تم حفظ السؤال للمراجعة، ويمكن لموظف الاستقبال مساعدتك الآن.',
    fr: 'Je n’ai pas encore une réponse validée pour cette question. La demande est enregistrée pour révision, et un agent peut vous aider maintenant.',
    en: 'I do not have an approved answer for this yet. The question was saved for review, and a staff member can help you now.',
  },
  counters: [
    {
      id: 'civil-status',
      label: {
        ar: 'شهادات الميلاد والفيش العائلية',
        fr: 'Extraits & fiche familiale',
        en: 'Birth records & family book',
      },
      status: {
        ar: 'الشباك 2 و 3 مفتوحان',
        fr: 'Guichets 2 et 3 ouverts',
        en: 'Counters 2 and 3 open',
      },
    },
    {
      id: 'legalization',
      label: {
        ar: 'المصادقة على الوثائق',
        fr: 'Légalisation des copies',
        en: 'Document legalisation',
      },
      status: {
        ar: 'الشباك 4',
        fr: 'Guichet 4',
        en: 'Counter 4',
      },
    },
    {
      id: 'information',
      label: {
        ar: 'الاستقبال وسحب التذاكر',
        fr: 'Accueil & tickets',
        en: 'Reception & tickets',
      },
      status: {
        ar: 'قرب المدخل الرئيسي',
        fr: 'À l’entrée principale',
        en: 'At the main entrance',
      },
    },
  ],
}

export const fallbackResponse: LocalizedText = {
  ar: 'لا أملك جوابا مؤكدا لهذا السؤال بعد. تم حفظ السؤال للمراجعة، ويمكن لموظف الاستقبال مساعدتك الآن.',
  fr: 'Je n’ai pas encore une réponse validée pour cette question. La demande est enregistrée pour révision, et un agent peut vous aider maintenant.',
  en: 'I do not have an approved answer for this yet. The question was saved for review, and a staff member can help you now.',
}

export const initialDemoAnswers: DemoAnswer[] = [
  {
    id: 'who-are-you',
    canonicalQuestion: {
      ar: 'من أنت؟',
      fr: 'Qui êtes-vous ?',
      en: 'Who are you?',
    },
    answerText: {
      ar: 'أنا آمال، مساعدة رقمية لهذا المكتب. أساعدك في معرفة الخدمات، الوثائق، والاتجاه إلى الشباك المناسب.',
      fr: 'Je suis Amel, l’assistante numérique de ce bureau. Je vous aide à trouver les services, les documents et le bon guichet.',
      en: 'I am Amel, the digital assistant for this office. I help visitors find services, documents, and the right counter.',
    },
    keywords: ['who', 'are you', 'assistant', 'amel', 'qui', 'êtes', 'vous', 'من', 'أنت', 'امال', 'آمال'],
    usageCount: 18,
    lastUpdated: '2026-05-16',
    category: 'identity',
    published: true,
  },
  {
    id: 'services',
    canonicalQuestion: {
      ar: 'ما هي الخدمات المتوفرة؟',
      fr: 'Quels services sont disponibles ?',
      en: 'What services are available?',
    },
    answerText: {
      ar: 'الخدمات الرئيسية اليوم هي وثائق الحالة المدنية، المصادقة على الوثائق، إيداع الملفات، وطلب المعلومات.',
      fr: 'Les services principaux aujourd’hui sont l’état civil, la légalisation de documents, le dépôt de dossier et l’information.',
      en: 'Today’s main services are civil status documents, document legalization, file submission, and information requests.',
    },
    keywords: ['service', 'services', 'available', 'disponible', 'disponibles', 'خدمات', 'الخدمات', 'متوفرة'],
    usageCount: 31,
    lastUpdated: '2026-05-16',
    category: 'services',
    published: true,
  },
  {
    id: 'document-renewal-counter',
    canonicalQuestion: {
      ar: 'أين أذهب لاستخراج وثيقة الحالة المدنية؟',
      fr: 'Où aller pour un document d’état civil ?',
      en: 'Where do I go for a civil status document?',
    },
    answerText: {
      ar: 'لاستخراج شهادة الميلاد، الفيش العائلية أو شهادة الإقامة، اسحب تذكرة من الاستقبال ثم اتجه إلى الشباك 3 عندما يظهر رقمك.',
      fr: 'Pour un extrait de naissance, une fiche familiale ou un certificat de résidence : prenez un ticket à l’accueil puis allez au guichet 3 quand votre numéro s’affiche.',
      en: 'For a birth certificate, family record, or residence certificate: take a ticket at reception, then go to counter 3 when your number is called.',
    },
    keywords: ['renewal', 'renew', 'where', 'go', 'counter', 'guichet', 'renouveler', 'extrait', 'acte', 'naissance', 'fiche', 'résidence', 'où', 'وثيقة', 'وثائق', 'تجديد', 'أين', 'شباك', 'استخراج', 'شهادة', 'ميلاد'],
    actionId: 'counter-3',
    usageCount: 44,
    lastUpdated: '2026-05-16',
    category: 'navigation',
    published: true,
  },
  {
    id: 'required-documents',
    canonicalQuestion: {
      ar: 'ما هي الوثائق المطلوبة؟',
      fr: 'Quels documents faut-il ?',
      en: 'What documents do I need?',
    },
    answerText: {
      ar: 'عادة: بطاقة التعريف الوطنية، استمارة S12 المعبأة، صورتان شمسيتان، وعند الحاجة طابع جبائي. للملفات الخاصة، اطلب الاستعلامات.',
      fr: 'En général : carte d’identité nationale, formulaire S12 rempli, deux photos d’identité, et un timbre fiscal si requis. Pour un cas particulier, demandez à l’accueil.',
      en: 'Usually: national ID, completed S12 form, two passport photos, and a fiscal stamp if required. For special cases, ask at reception.',
    },
    keywords: ['documents', 'document', 'papers', 'paper', 'dossier', 'papiers', 'pièce', 's12', 'timbre', 'photos', 'وثائق', 'وثيقة', 'ملف', 'اوراق', 'أوراق', 'استمارة', 'طابع', 'صور'],
    actionId: 'renewal-checklist',
    usageCount: 57,
    lastUpdated: '2026-05-16',
    category: 'documents',
    published: true,
  },
  {
    id: 'birth-certificate',
    canonicalQuestion: {
      ar: 'كيف أستخرج شهادة الميلاد رقم 12 (S12) ؟',
      fr: 'Comment obtenir un extrait de naissance S12 ?',
      en: 'How do I get a birth certificate (S12)?',
    },
    answerText: {
      ar: 'حضّر بطاقة التعريف الوطنية. اسحب تذكرة من الاستقبال، ثم اتجه إلى الشباك 3. الاستخراج فوري إذا كان الميلاد مسجلا في هذه البلدية.',
      fr: 'Préparez votre carte d’identité nationale. Prenez un ticket à l’accueil puis allez au guichet 3. La délivrance est immédiate si la naissance est enregistrée dans cette APC.',
      en: 'Bring your national ID. Take a ticket at reception, then go to counter 3. It is issued immediately if the birth is registered at this municipality.',
    },
    keywords: ['birth', 'naissance', 'extrait', 's12', 'acte', 'شهادة', 'ميلاد', 'استخراج'],
    actionId: 'counter-3',
    usageCount: 49,
    lastUpdated: '2026-05-16',
    category: 'documents',
    published: true,
  },
  {
    id: 'family-record',
    canonicalQuestion: {
      ar: 'كيف أستخرج الفيش العائلية ؟',
      fr: 'Comment obtenir la fiche familiale ?',
      en: 'How do I get the family record (fiche familiale)?',
    },
    answerText: {
      ar: 'الفيش العائلية تُسلَّم في الشباك 3 لرب الأسرة أو الزوجة. حضّر بطاقة التعريف وكتيب العائلة إذا كان متوفرا.',
      fr: 'La fiche familiale est délivrée au guichet 3 au chef de famille ou à l’épouse. Apportez la carte d’identité et le livret de famille s’il est disponible.',
      en: 'The family record is issued at counter 3 to the head of household or spouse. Bring your ID and the family book if you have it.',
    },
    keywords: ['family', 'familiale', 'fiche', 'livret', 'فيش', 'عائلية', 'عائلة', 'كتيب'],
    actionId: 'counter-3',
    usageCount: 36,
    lastUpdated: '2026-05-16',
    category: 'documents',
    published: true,
  },
  {
    id: 'residence-certificate',
    canonicalQuestion: {
      ar: 'كيف أستخرج شهادة الإقامة ؟',
      fr: 'Comment obtenir un certificat de résidence ?',
      en: 'How do I get a residence certificate?',
    },
    answerText: {
      ar: 'احضر بطاقة التعريف وفاتورة كهرباء أو غاز حديثة باسمك. توجه إلى الشباك 3 بعد سحب تذكرة. شاهدان من الجيران قد يُطلبان في بعض الحالات.',
      fr: 'Apportez votre carte d’identité et une facture récente d’électricité ou de gaz à votre nom. Allez au guichet 3 après avoir pris un ticket. Deux témoins du voisinage peuvent être demandés.',
      en: 'Bring your ID and a recent electricity or gas bill in your name. Go to counter 3 after taking a ticket. Two neighbour witnesses may be requested.',
    },
    keywords: ['residence', 'résidence', 'certificat', 'إقامة', 'شهادة', 'سونلغاز'],
    actionId: 'counter-3',
    usageCount: 28,
    lastUpdated: '2026-05-16',
    category: 'documents',
    published: true,
  },
  {
    id: 'languages',
    canonicalQuestion: {
      ar: 'هل يمكنني التحدث بالعربية أو الفرنسية أو الإنجليزية؟',
      fr: 'Puis-je parler arabe, français ou anglais ?',
      en: 'Can I speak Arabic, French, or English?',
    },
    answerText: {
      ar: 'نعم، يمكنك استخدام العربية أو الفرنسية أو الإنجليزية. اختر اللغة من أعلى الشاشة.',
      fr: 'Oui, vous pouvez utiliser l’arabe, le français ou l’anglais. Choisissez la langue en haut de l’écran.',
      en: 'Yes, you can use Arabic, French, or English. Choose the language at the top of the screen.',
    },
    keywords: ['arabic', 'french', 'english', 'language', 'langue', 'arabe', 'français', 'anglais', 'عربية', 'فرنسية', 'انجليزية', 'إنجليزية', 'لغة'],
    usageCount: 23,
    lastUpdated: '2026-05-16',
    category: 'language',
    published: true,
  },
  {
    id: 'opening-hours',
    canonicalQuestion: {
      ar: 'ما هي أوقات العمل؟',
      fr: 'Quels sont les horaires ?',
      en: 'What are the opening hours?',
    },
    answerText: {
      ar: 'أوقات العمل من الأحد إلى الخميس، من 8:30 صباحا إلى 4:00 مساء.',
      fr: 'Le bureau est ouvert du dimanche au jeudi, de 8h30 à 16h00.',
      en: 'The office is open Sunday to Thursday, from 8:30 AM to 4:00 PM.',
    },
    keywords: ['hours', 'opening', 'closing', 'open', 'close', 'closed', 'time', 'when', 'schedule', 'today', 'horaires', 'horaire', 'ouvert', 'ouverture', 'ferme', 'fermer', 'fermeture', 'quand', 'aujourd', 'ساعة', 'ساعات', 'وقت', 'أوقات', 'مفتوح', 'مغلق', 'يغلق', 'يفتح', 'متى'],
    usageCount: 39,
    lastUpdated: '2026-05-16',
    category: 'services',
    published: true,
  },
  {
    id: 'which-counter',
    canonicalQuestion: {
      ar: 'لا أعرف أي شباك أحتاج.',
      fr: 'Je ne sais pas quel guichet choisir.',
      en: 'I do not know which counter I need.',
    },
    answerText: {
      ar: 'إذا لم تكن متأكدا، ابدأ بمكتب الاستقبال قرب المدخل. سيحدد الموظف الشباك المناسب حسب نوع طلبك.',
      fr: 'Si vous n’êtes pas sûr, commencez par le bureau d’information près de l’entrée. L’agent vous orientera selon votre demande.',
      en: 'If you are not sure, start at the information desk near the entrance. Staff will direct you based on your request.',
    },
    keywords: ['counter', 'which counter', 'not know', 'not sure', 'guichet', 'sais pas', 'quel', 'شباك', 'لا أعرف', 'لست متأكد'],
    actionId: 'info-desk',
    usageCount: 26,
    lastUpdated: '2026-05-16',
    category: 'navigation',
    published: true,
  },
  {
    id: 'qr-code',
    canonicalQuestion: {
      ar: 'هل يمكنني مسح رمز QR؟',
      fr: 'Puis-je scanner un code QR ?',
      en: 'Can I scan a QR code?',
    },
    answerText: {
      ar: 'نعم، يمكنك مسح الرمز لفتح قائمة الوثائق والخطوات على هاتفك.',
      fr: 'Oui, vous pouvez scanner le code pour ouvrir la liste des documents et étapes sur votre téléphone.',
      en: 'Yes, you can scan the code to open the document and steps checklist on your phone.',
    },
    keywords: ['qr', 'code', 'scan', 'scanner', 'مسح', 'رمز', 'كود'],
    actionId: 'renewal-checklist',
    usageCount: 20,
    lastUpdated: '2026-05-16',
    category: 'documents',
    published: true,
  },
  {
    id: 'information-desk',
    canonicalQuestion: {
      ar: 'أين مكتب الاستقبال؟',
      fr: 'Où est le bureau d’information ?',
      en: 'Where is the information desk?',
    },
    answerText: {
      ar: 'مكتب الاستقبال موجود قرب المدخل الرئيسي، أمام منطقة الانتظار.',
      fr: 'Le bureau d’information se trouve près de l’entrée principale, devant la zone d’attente.',
      en: 'The information desk is near the main entrance, in front of the waiting area.',
    },
    keywords: ['information', 'desk', 'reception', 'accueil', 'bureau', 'مكتب', 'استقبال', 'استعلامات'],
    actionId: 'info-desk',
    usageCount: 21,
    lastUpdated: '2026-05-16',
    category: 'navigation',
    published: true,
  },
  {
    id: 'incomplete-file',
    canonicalQuestion: {
      ar: 'ماذا أفعل إذا كان ملفي ناقصا؟',
      fr: 'Que faire si mon dossier est incomplet ?',
      en: 'What should I do if my file is incomplete?',
    },
    answerText: {
      ar: 'إذا كان الملف ناقصا، اطلب من الموظف قائمة النواقص ثم أكمل الوثائق قبل العودة إلى الشباك.',
      fr: 'Si votre dossier est incomplet, demandez la liste des pièces manquantes puis complétez le dossier avant de revenir au guichet.',
      en: 'If your file is incomplete, ask staff for the missing-items list, complete the documents, then return to the counter.',
    },
    keywords: ['incomplete', 'missing', 'file', 'dossier', 'incomplet', 'manquant', 'ناقص', 'نواقص', 'ملفي', 'ملف'],
    actionId: 'staff-help',
    usageCount: 14,
    lastUpdated: '2026-05-16',
    category: 'documents',
    published: true,
  },
  {
    id: 'elderly-help',
    canonicalQuestion: {
      ar: 'هل يمكن مساعدة شخص مسن؟',
      fr: 'Puis-je obtenir de l’aide pour une personne âgée ?',
      en: 'Can I get help for an elderly person?',
    },
    answerText: {
      ar: 'نعم، يمكن للأشخاص المسنين طلب المساعدة من مكتب الاستقبال، وسيتم توجيههم حسب الأولوية المتاحة.',
      fr: 'Oui, les personnes âgées peuvent demander de l’aide au bureau d’information et seront orientées selon la priorité disponible.',
      en: 'Yes, elderly visitors can ask for help at the information desk and will be guided according to available priority support.',
    },
    keywords: ['elderly', 'old person', 'senior', 'personne âgée', 'agée', 'aide', 'مسن', 'مسنة', 'كبير', 'مساعدة'],
    actionId: 'info-desk',
    usageCount: 12,
    lastUpdated: '2026-05-16',
    category: 'support',
    published: true,
  },
  {
    id: 'contact-office',
    canonicalQuestion: {
      ar: 'كيف أتصل بالمكتب؟',
      fr: 'Comment contacter le bureau ?',
      en: 'How do I contact the office?',
    },
    answerText: {
      ar: 'يمكنك الاتصال بالمصلحة على الرقم 021 00 00 00 خلال أوقات العمل.',
      fr: 'Vous pouvez contacter le service au 021 00 00 00 pendant les horaires d’ouverture.',
      en: 'You can contact the office at 021 00 00 00 during opening hours.',
    },
    keywords: ['contact', 'call', 'phone', 'number', 'contacter', 'téléphone', 'numéro', 'اتصل', 'هاتف', 'رقم'],
    actionId: 'office-contact',
    usageCount: 9,
    lastUpdated: '2026-05-16',
    category: 'support',
    published: true,
  },
]

export const initialUnknownQuestions: UnknownQuestion[] = [
  {
    id: 'unknown-father-documents',
    question: 'Can I submit documents for my father?',
    language: 'en',
    fallbackResponse,
    count: 2,
    confidence: 'low',
    status: 'new',
    createdAt: '2026-05-16T09:30:00.000Z',
  },
  {
    id: 'unknown-lost-receipt',
    question: 'J’ai perdu mon reçu de paiement. Que faire ?',
    language: 'fr',
    fallbackResponse,
    count: 1,
    confidence: 'low',
    status: 'new',
    createdAt: '2026-05-16T10:05:00.000Z',
  },
  {
    id: 'unknown-online-service',
    question: 'هل يمكنني إكمال هذه الخدمة عبر الإنترنت؟',
    language: 'ar',
    fallbackResponse,
    count: 1,
    confidence: 'medium',
    status: 'new',
    createdAt: '2026-05-16T11:10:00.000Z',
  },
]

export const uiText: Record<
  DemoLanguage,
  {
    admin: string
    answer: string
    ask: string
    asking: string
    cacheHit: string
    chooseLanguage: string
    confidence: string
    escalation: string
    fallbackBadge: string
    goTo: string
    greeting: string
    help: string
    holdToTalk: string
    holdToTalkHint: string
    kiosk: string
    listening: string
    micUnsupported: string
    openAdmin: string
    openKiosk: string
    placeholder: string
    quickQuestions: string
    savedForReview: string
    touchToStart: string
    unknown: string
    pilot: string
    privacy: string
    status: string
    replayVoice: string
    stopVoice: string
    turnVoiceOff: string
    turnVoiceOn: string
    voice: string
    voiceOff: string
    voiceOn: string
    voicePreparing: string
    voiceReady: string
    voiceSpeaking: string
    voiceUnavailable: string
    welcomeSubtitle: string
  }
> = {
  ar: {
    admin: 'الإدارة',
    answer: 'الإجابة',
    ask: 'اسأل',
    asking: 'جار التحضير',
    cacheHit: 'إجابة محفوظة',
    chooseLanguage: 'اختر اللغة',
    confidence: 'ثقة منخفضة',
    escalation: 'مساعدة موظف',
    fallbackBadge: 'سؤال جديد',
    goTo: 'اتجه إلى',
    greeting: 'مرحبا، أنا آمال. كيف يمكنني مساعدتك اليوم؟',
    help: 'مساعدة',
    holdToTalk: 'اضغط للتحدث',
    holdToTalkHint: 'اضغط مطولا ثم تكلم بسؤالك',
    kiosk: 'الكشك',
    listening: 'جار الاستماع...',
    micUnsupported: 'الميكروفون غير متاح في هذا المتصفح',
    openAdmin: 'افتح الإدارة',
    openKiosk: 'افتح الكشك',
    placeholder: 'اكتب سؤالك هنا...',
    quickQuestions: 'أسئلة سريعة',
    savedForReview: 'تم حفظ السؤال للمراجعة',
    touchToStart: 'اضغط للبدء',
    unknown: 'غير معروف',
    pilot: 'تجربة ميدانية',
    privacy: 'الخصوصية',
    status: 'الحالة',
    replayVoice: 'إعادة الصوت',
    stopVoice: 'إيقاف الصوت',
    turnVoiceOff: 'كتم الصوت',
    turnVoiceOn: 'تشغيل الصوت',
    voice: 'الصوت',
    voiceOff: 'الصوت مكتوم',
    voiceOn: 'الصوت مفعل',
    voicePreparing: 'تحضير الصوت',
    voiceReady: 'الصوت جاهز',
    voiceSpeaking: 'جار النطق',
    voiceUnavailable: 'الصوت غير متاح في هذا المتصفح',
    welcomeSubtitle: 'مساعدتك الرقمية لتوجيهك داخل المكتب',
  },
  fr: {
    admin: 'Admin',
    answer: 'Réponse',
    ask: 'Demander',
    asking: 'Préparation',
    cacheHit: 'Réponse validée',
    chooseLanguage: 'Choisissez votre langue',
    confidence: 'Confiance basse',
    escalation: 'Aide d’un agent',
    fallbackBadge: 'Nouvelle question',
    goTo: 'Allez au',
    greeting: 'Bonjour, je suis Amel. Comment puis-je vous aider aujourd’hui ?',
    help: 'Aide',
    holdToTalk: 'Appuyer pour parler',
    holdToTalkHint: 'Maintenez et posez votre question à voix haute',
    kiosk: 'Kiosque',
    listening: 'Écoute en cours...',
    micUnsupported: 'Micro non disponible dans ce navigateur',
    openAdmin: 'Ouvrir admin',
    openKiosk: 'Ouvrir kiosque',
    placeholder: 'Écrivez votre question...',
    quickQuestions: 'Questions rapides',
    savedForReview: 'Question enregistrée pour révision',
    touchToStart: 'Touchez pour commencer',
    unknown: 'Inconnu',
    pilot: 'Pilote terrain',
    privacy: 'Confidentialité',
    status: 'Statut',
    replayVoice: 'Répéter',
    stopVoice: 'Arrêter',
    turnVoiceOff: 'Couper le son',
    turnVoiceOn: 'Réactiver',
    voice: 'Voix',
    voiceOff: 'Voix coupée',
    voiceOn: 'Voix activée',
    voicePreparing: 'Préparation de la voix',
    voiceReady: 'Voix prête',
    voiceSpeaking: 'Lecture vocale',
    voiceUnavailable: 'Voix non disponible dans ce navigateur',
    welcomeSubtitle: 'Votre assistante digitale pour vous orienter dans le bureau',
  },
  en: {
    admin: 'Admin',
    answer: 'Answer',
    ask: 'Ask',
    asking: 'Preparing',
    cacheHit: 'Approved answer',
    chooseLanguage: 'Choose your language',
    confidence: 'Low confidence',
    escalation: 'Staff help',
    fallbackBadge: 'New question',
    goTo: 'Go to',
    greeting: 'Hello, I am Amel. How can I help you today?',
    help: 'Help',
    holdToTalk: 'Hold to talk',
    holdToTalkHint: 'Press and hold, then say your question',
    kiosk: 'Kiosk',
    listening: 'Listening...',
    micUnsupported: 'Microphone not available in this browser',
    openAdmin: 'Open admin',
    openKiosk: 'Open kiosk',
    placeholder: 'Type your question...',
    quickQuestions: 'Quick questions',
    savedForReview: 'Question saved for review',
    touchToStart: 'Touch to start',
    unknown: 'Unknown',
    pilot: 'Field pilot',
    privacy: 'Privacy',
    status: 'Status',
    replayVoice: 'Replay',
    stopVoice: 'Stop',
    turnVoiceOff: 'Mute',
    turnVoiceOn: 'Unmute',
    voice: 'Voice',
    voiceOff: 'Voice muted',
    voiceOn: 'Voice on',
    voicePreparing: 'Preparing voice',
    voiceReady: 'Voice ready',
    voiceSpeaking: 'Speaking',
    voiceUnavailable: 'Voice unavailable in this browser',
    welcomeSubtitle: 'Your digital assistant to guide you through the office',
  },
}
