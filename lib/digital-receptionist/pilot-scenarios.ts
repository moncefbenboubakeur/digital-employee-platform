import {
  demoActions,
  fallbackResponse,
  initialDemoAnswers,
  initialUnknownQuestions,
  pilotProfile,
  type DemoAction,
  type DemoAnswer,
  type PilotProfile,
  type UnknownQuestion,
} from './demo-data'

export type PilotScenario = {
  id: string
  title: string
  customerType: string
  recommendedFor: string
  description: string
  valueProposition: string
  demoTalkTrack: string[]
  profile: PilotProfile
  actions: DemoAction[]
  answers: DemoAnswer[]
  unknownQuestions: UnknownQuestion[]
}

export type PilotScenarioSummary = Pick<
  PilotScenario,
  'id' | 'title' | 'customerType' | 'recommendedFor' | 'description' | 'valueProposition' | 'demoTalkTrack'
>

const today = '2026-05-17'

const apcScenario: PilotScenario = {
  id: 'apc-civil-status',
  title: 'APC Civil Status Desk',
  customerType: 'Municipal/public service',
  recommendedFor: 'First pilot because it has repeated questions, clear counters, and high visitor volume.',
  description: 'A citizen-facing reception assistant for civil-status services in a local Algerian municipality.',
  valueProposition:
    'Reduce repeated staff interruptions for documents, counters, opening hours, and incomplete files.',
  demoTalkTrack: [
    'Open the kiosk and ask where to renew a civil-status document.',
    'Show the answer directing the visitor to the correct counter with a QR checklist.',
    'Ask an unsupported question, then approve it in the admin review queue.',
    'Return to the kiosk and show that the new answer is reusable.',
  ],
  profile: pilotProfile,
  actions: demoActions,
  answers: initialDemoAnswers,
  unknownQuestions: initialUnknownQuestions,
}

const posteActions: DemoAction[] = [
  {
    id: 'renewal-checklist',
    type: 'qr',
    label: {
      ar: 'قائمة وثائق CCP',
      fr: 'Pièces CCP',
      en: 'CCP checklist',
    },
    description: {
      ar: 'امسح الرمز لمعرفة وثائق البطاقة الذهبية، الصك، وكشف الحساب.',
      fr: 'Scannez pour voir les pièces pour Edahabia, chèque CCP et relevé de compte.',
      en: 'Scan to see documents for Edahabia card, CCP cheque, and account statement requests.',
    },
    value: 'poste-ccp-checklist',
  },
  {
    id: 'counter-3',
    type: 'direction',
    label: {
      ar: 'الشباك 2 — CCP والبطاقة الذهبية',
      fr: 'Guichet 2 — CCP & Edahabia',
      en: 'Counter 2 — CCP & Edahabia',
    },
    description: {
      ar: 'لخدمات CCP، البطاقة الذهبية، الحوالات ودفع الفواتير، اتجه إلى الشباك 2 بعد سحب تذكرة.',
      fr: 'Pour CCP, carte Edahabia, mandats et paiement de factures, allez au guichet 2 après avoir pris un ticket.',
      en: 'For CCP, Edahabia card, money orders, and bill payment, go to counter 2 after taking a ticket.',
    },
    value: 'poste-counter-2',
  },
  {
    id: 'counter-4',
    type: 'direction',
    label: {
      ar: 'الشباك 4 — الطرود والبريد',
      fr: 'Guichet 4 — Colis & courrier',
      en: 'Counter 4 — Parcels & mail',
    },
    description: {
      ar: 'لاستلام الطرود وإرسال البريد، اتجه إلى الشباك 4 مع بطاقة التعريف وإشعار الاستلام.',
      fr: 'Pour retirer un colis ou envoyer du courrier, allez au guichet 4 avec votre pièce d’identité et l’avis de passage.',
      en: 'To pick up a parcel or send mail, go to counter 4 with your ID and delivery slip.',
    },
    value: 'poste-counter-4',
  },
  {
    id: 'info-desk',
    type: 'direction',
    label: {
      ar: 'الاستعلامات',
      fr: 'Accueil information',
      en: 'Information desk',
    },
    description: {
      ar: 'مكتب الاستعلامات موجود عند المدخل بجانب آلة التذاكر.',
      fr: 'L’accueil information est à l’entrée, près du distributeur de tickets.',
      en: 'The information desk is at the entrance, next to the ticket machine.',
    },
    value: 'poste-information',
  },
  {
    id: 'office-contact',
    type: 'contact',
    label: {
      ar: 'اتصل بالمكتب',
      fr: 'Contacter le bureau',
      en: 'Contact the branch',
    },
    description: {
      ar: 'للمتابعة اتصل على 1530 أو اسأل مكتب الاستعلامات.',
      fr: 'Pour le suivi, appelez le 1530 ou demandez à l’accueil.',
      en: 'For follow-up, call 1530 or ask the information desk.',
    },
    value: '1530',
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
      ar: 'إذا كان الطلب مرتبطا بحساب شخصي، اطلب مساعدة موظف في المكتب.',
      fr: 'Si la demande concerne un compte personnel, demandez l’aide d’un agent.',
      en: 'If the request concerns a personal account, ask a staff member for help.',
    },
    value: 'poste-staff-help',
  },
]

const posteProfile: PilotProfile = {
  tenantName: {
    ar: 'بريد الجزائر',
    fr: 'Algérie Poste',
    en: 'Algeria Post',
  },
  locationName: {
    ar: 'مكتب باب الزوار',
    fr: 'Bureau Bab Ezzouar',
    en: 'Bab Ezzouar branch',
  },
  welcomeTitle: {
    ar: 'مساعدة رقمية لتوجيه زبائن البريد',
    fr: 'Assistante digitale pour orienter les clients du bureau',
    en: 'Digital assistant for branch visitor guidance',
  },
  serviceSummary: {
    ar: 'توجه الزوار نحو خدمات CCP، البطاقة الذهبية، الطرود، التذاكر، والمساعدة البشرية.',
    fr: 'Oriente vers les services CCP, carte Edahabia, colis, tickets et assistance humaine.',
    en: 'Guides visitors to CCP, Edahabia card, parcel, ticketing, and staff-assistance services.',
  },
  privacyNote: {
    ar: 'لا تدخل رقم الحساب أو رقم البطاقة في هذا النموذج التجريبي.',
    fr: 'Ne saisissez pas de numéro de compte ou de carte dans cette démonstration.',
    en: 'Do not enter account or card numbers in this demo.',
  },
  openingHours: {
    ar: 'من الأحد إلى الخميس، من 8:00 صباحا إلى 5:00 مساء.',
    fr: 'Du dimanche au jeudi, de 8h00 à 17h00.',
    en: 'Sunday to Thursday, from 8:00 AM to 5:00 PM.',
  },
  contactNumber: '1530',
  defaultLanguage: 'fr',
  currentWait: {
    ar: 'الانتظار التقريبي: 18 دقيقة',
    fr: 'Attente estimée : 18 min',
    en: 'Estimated wait: 18 min',
  },
  liveStatus: {
    ar: 'وضع Lite First لتخفيض التكلفة',
    fr: 'Mode Lite First pour contrôler le coût',
    en: 'Lite First mode for cost control',
  },
  fallbackResponse,
  counters: [
    {
      id: 'poste-ccp',
      label: { ar: 'خدمات CCP', fr: 'Services CCP', en: 'CCP services' },
      status: { ar: 'الشباك 2', fr: 'Guichet 2', en: 'Counter 2' },
    },
    {
      id: 'poste-parcels',
      label: { ar: 'الطرود والبريد', fr: 'Colis et courrier', en: 'Parcels and mail' },
      status: { ar: 'الشباك 4', fr: 'Guichet 4', en: 'Counter 4' },
    },
    {
      id: 'poste-info',
      label: { ar: 'التوجيه والتذاكر', fr: 'Orientation et tickets', en: 'Guidance and tickets' },
      status: { ar: 'عند المدخل', fr: 'À l’entrée', en: 'At the entrance' },
    },
  ],
}

const posteAnswers: DemoAnswer[] = [
  {
    id: 'who-are-you',
    canonicalQuestion: { ar: 'من أنت؟', fr: 'Qui êtes-vous ?', en: 'Who are you?' },
    answerText: {
      ar: 'أنا آمال، مساعدة رقمية لهذا المكتب البريدي. أساعدك في اختيار الخدمة، التذكرة، والشباك المناسب.',
      fr: 'Je suis Amel, l’assistante digitale de ce bureau de poste. Je vous aide à choisir le service, le ticket et le bon guichet.',
      en: 'I am Amel, the digital assistant for this post office. I help you choose the right service, ticket, and counter.',
    },
    keywords: ['who', 'assistant', 'amel', 'poste', 'post', 'qui', 'êtes', 'vous', 'من', 'أنت', 'بريد'],
    usageCount: 15,
    lastUpdated: today,
    category: 'identity',
    published: true,
  },
  {
    id: 'services',
    canonicalQuestion: { ar: 'ما هي الخدمات المتوفرة؟', fr: 'Quels services sont disponibles ?', en: 'What services are available?' },
    answerText: {
      ar: 'الخدمات الرئيسية: CCP وسحب الأموال، البطاقة الذهبية وتفعيلها، استلام الحوالات (mandat)، الطرود، ودفع فواتير سونلغاز واتصالات الجزائر.',
      fr: 'Services principaux : CCP et retraits, carte Edahabia (activation et renouvellement), retrait de mandats, colis, et paiement des factures SONELGAZ et Algérie Télécom.',
      en: 'Main services: CCP withdrawals, Edahabia card (activation and renewal), money-order (mandat) pickup, parcels, and bill payment for SONELGAZ and Algérie Télécom.',
    },
    keywords: ['service', 'services', 'ccp', 'edahabia', 'carte', 'colis', 'mandat', 'facture', 'baridimob', 'mail', 'خدمات', 'البطاقة', 'ذهبية', 'طرود', 'حوالة', 'فاتورة'],
    usageCount: 40,
    lastUpdated: today,
    category: 'services',
    published: true,
  },
  {
    id: 'document-renewal-counter',
    canonicalQuestion: { ar: 'أين أذهب لخدمات CCP؟', fr: 'Où aller pour les services CCP ?', en: 'Where do I go for CCP services?' },
    answerText: {
      ar: 'لخدمات CCP والبطاقة الذهبية، اسحب تذكرة ثم اتجه إلى الشباك 2 عندما يظهر رقمك.',
      fr: 'Pour les services CCP et carte Edahabia, prenez un ticket puis allez au guichet 2 quand votre numéro s’affiche.',
      en: 'For CCP and Edahabia card services, take a ticket then go to counter 2 when your number appears.',
    },
    keywords: ['ccp', 'where', 'counter', 'guichet', 'edahabia', 'carte', 'أين', 'شباك', 'ذهبية'],
    actionId: 'counter-3',
    usageCount: 54,
    lastUpdated: today,
    category: 'navigation',
    published: true,
  },
  {
    id: 'required-documents',
    canonicalQuestion: { ar: 'ما هي الوثائق المطلوبة؟', fr: 'Quels documents faut-il ?', en: 'What documents do I need?' },
    answerText: {
      ar: 'للسحب من CCP: بطاقة التعريف ودفتر الشيكات أو البطاقة الذهبية. لاستلام حوالة: بطاقة التعريف ورقم الحوالة. للطرود: بطاقة التعريف وإشعار الاستلام.',
      fr: 'Pour un retrait CCP : pièce d’identité + chéquier ou Edahabia. Pour un mandat : pièce d’identité + numéro du mandat. Pour un colis : pièce d’identité + avis de passage.',
      en: 'CCP withdrawal: ID + chequebook or Edahabia card. Money-order pickup: ID + transfer number. Parcel pickup: ID + delivery slip.',
    },
    keywords: ['documents', 'papers', 'id', 'ccp', 'mandat', 'colis', 'avis', 'chéquier', 'edahabia', 'وثائق', 'بطاقة', 'دفتر', 'إشعار', 'حوالة'],
    actionId: 'renewal-checklist',
    usageCount: 65,
    lastUpdated: today,
    category: 'documents',
    published: true,
  },
  {
    id: 'edahabia-activation',
    canonicalQuestion: {
      ar: 'كيف أفعّل بطاقة الذهبية ؟',
      fr: 'Comment activer ma carte Edahabia ?',
      en: 'How do I activate my Edahabia card?',
    },
    answerText: {
      ar: 'احضر البطاقة الذهبية وبطاقة التعريف الوطنية، اسحب تذكرة CCP، وفي الشباك 2 يساعدك الموظف في اختيار رمز سري (PIN). يمكن استعمال البطاقة مباشرة بعد التفعيل.',
      fr: 'Apportez votre carte Edahabia et votre pièce d’identité, prenez un ticket CCP, puis l’agent du guichet 2 vous aide à choisir un code PIN. La carte est utilisable immédiatement après activation.',
      en: 'Bring your Edahabia card and national ID, take a CCP ticket, and the agent at counter 2 helps you set a PIN. The card is usable immediately after activation.',
    },
    keywords: ['edahabia', 'activer', 'activate', 'carte', 'pin', 'بطاقة', 'ذهبية', 'تفعيل', 'رمز'],
    actionId: 'counter-3',
    usageCount: 55,
    lastUpdated: today,
    category: 'services',
    published: true,
  },
  {
    id: 'mandat-pickup',
    canonicalQuestion: {
      ar: 'كيف أستلم حوالة مالية (mandat) ؟',
      fr: 'Comment retirer un mandat ?',
      en: 'How do I pick up a money order (mandat)?',
    },
    answerText: {
      ar: 'حضّر بطاقة التعريف الوطنية ورقم الحوالة الذي أرسله المرسل (numéro de transfert). اسحب تذكرة CCP وتوجه إلى الشباك 2. مبالغ كبيرة قد تتطلب التحقق الإضافي.',
      fr: 'Préparez votre carte d’identité nationale et le numéro de transfert (envoyé par l’expéditeur). Prenez un ticket CCP puis allez au guichet 2. Les montants importants peuvent demander une vérification supplémentaire.',
      en: 'Bring your national ID and the transfer number sent by the sender. Take a CCP ticket and go to counter 2. Large amounts may require additional verification.',
    },
    keywords: ['mandat', 'transfer', 'money', 'order', 'retrait', 'حوالة', 'مالية', 'استلام'],
    actionId: 'counter-3',
    usageCount: 45,
    lastUpdated: today,
    category: 'services',
    published: true,
  },
  {
    id: 'bill-payment',
    canonicalQuestion: {
      ar: 'هل يمكن دفع فاتورة سونلغاز أو اتصالات الجزائر هنا ؟',
      fr: 'Puis-je payer ma facture SONELGAZ ou Algérie Télécom ici ?',
      en: 'Can I pay my SONELGAZ or Algérie Télécom bill here?',
    },
    answerText: {
      ar: 'نعم، يمكن دفع فواتير سونلغاز واتصالات الجزائر في الشباك 2. أحضر الفاتورة وادفع نقدا أو ببطاقتك الذهبية.',
      fr: 'Oui, vous pouvez payer les factures SONELGAZ et Algérie Télécom au guichet 2. Apportez la facture et payez en espèces ou par carte Edahabia.',
      en: 'Yes, you can pay SONELGAZ and Algérie Télécom bills at counter 2. Bring the bill and pay in cash or with your Edahabia card.',
    },
    keywords: ['facture', 'bill', 'sonelgaz', 'electricité', 'télécom', 'payment', 'فاتورة', 'سونلغاز', 'اتصالات', 'دفع'],
    actionId: 'counter-3',
    usageCount: 38,
    lastUpdated: today,
    category: 'services',
    published: true,
  },
  {
    id: 'parcel-tracking',
    canonicalQuestion: {
      ar: 'كيف أتتبع طردا ؟',
      fr: 'Comment suivre un colis ?',
      en: 'How do I track a parcel?',
    },
    answerText: {
      ar: 'استخدم رقم التتبع على موقع baridipost.dz أو عبر تطبيق BaridiMob. لاستلام الطرد توجه إلى الشباك 4 ومعك بطاقة التعريف وإشعار الاستلام.',
      fr: 'Utilisez le numéro de suivi sur baridipost.dz ou via BaridiMob. Pour retirer le colis, allez au guichet 4 avec votre pièce d’identité et l’avis de passage.',
      en: 'Use the tracking number on baridipost.dz or via the BaridiMob app. To pick up the parcel, go to counter 4 with your ID and delivery slip.',
    },
    keywords: ['parcel', 'colis', 'tracking', 'suivi', 'baridimob', 'baridipost', 'طرد', 'تتبع', 'استلام'],
    actionId: 'counter-4',
    usageCount: 30,
    lastUpdated: today,
    category: 'services',
    published: true,
  },
  {
    id: 'languages',
    canonicalQuestion: { ar: 'هل يمكنني التحدث بالعربية أو الفرنسية أو الإنجليزية؟', fr: 'Puis-je parler arabe, français ou anglais ?', en: 'Can I speak Arabic, French, or English?' },
    answerText: {
      ar: 'نعم، اختر العربية أو الفرنسية أو الإنجليزية من أعلى الشاشة.',
      fr: 'Oui, choisissez arabe, français ou anglais en haut de l’écran.',
      en: 'Yes, choose Arabic, French, or English at the top of the screen.',
    },
    keywords: ['language', 'arabe', 'français', 'english', 'لغة', 'عربية', 'فرنسية'],
    usageCount: 18,
    lastUpdated: today,
    category: 'language',
    published: true,
  },
  {
    id: 'opening-hours',
    canonicalQuestion: { ar: 'ما هي أوقات العمل؟', fr: 'Quels sont les horaires ?', en: 'What are the opening hours?' },
    answerText: {
      ar: 'المكتب مفتوح من الأحد إلى الخميس، من 8:00 صباحا إلى 5:00 مساء.',
      fr: 'Le bureau est ouvert du dimanche au jeudi, de 8h00 à 17h00.',
      en: 'The branch is open Sunday to Thursday, from 8:00 AM to 5:00 PM.',
    },
    keywords: ['hours', 'opening', 'closing', 'open', 'close', 'closed', 'time', 'when', 'today', 'horaires', 'horaire', 'ouvert', 'ouverture', 'ferme', 'fermer', 'fermeture', 'quand', 'aujourd', 'ساعة', 'ساعات', 'وقت', 'أوقات', 'مفتوح', 'مغلق', 'يغلق', 'يفتح', 'متى'],
    usageCount: 32,
    lastUpdated: today,
    category: 'services',
    published: true,
  },
  {
    id: 'which-counter',
    canonicalQuestion: { ar: 'لا أعرف أي شباك أحتاج.', fr: 'Je ne sais pas quel guichet choisir.', en: 'I do not know which counter I need.' },
    answerText: {
      ar: 'ابدأ بمكتب الاستعلامات عند المدخل. سيحدد الموظف نوع التذكرة أو الشباك المناسب.',
      fr: 'Commencez par l’accueil à l’entrée. L’agent vous indiquera le type de ticket ou le bon guichet.',
      en: 'Start at the information desk near the entrance. Staff will tell you the right ticket or counter.',
    },
    keywords: ['counter', 'ticket', 'guichet', 'not sure', 'لا أعرف', 'شباك', 'تذكرة'],
    actionId: 'info-desk',
    usageCount: 23,
    lastUpdated: today,
    category: 'navigation',
    published: true,
  },
  {
    id: 'qr-code',
    canonicalQuestion: { ar: 'هل يمكنني مسح رمز QR؟', fr: 'Puis-je scanner un code QR ?', en: 'Can I scan a QR code?' },
    answerText: {
      ar: 'نعم، يمكنك مسح الرمز لفتح قائمة وثائق CCP والبطاقة الذهبية.',
      fr: 'Oui, vous pouvez scanner le code pour ouvrir la liste des pièces CCP et Edahabia.',
      en: 'Yes, scan the code to open the CCP and Edahabia document checklist.',
    },
    keywords: ['qr', 'scan', 'scanner', 'code', 'رمز', 'مسح'],
    actionId: 'renewal-checklist',
    usageCount: 16,
    lastUpdated: today,
    category: 'documents',
    published: true,
  },
  {
    id: 'contact-office',
    canonicalQuestion: { ar: 'كيف أتصل بالمكتب؟', fr: 'Comment contacter le bureau ?', en: 'How do I contact the branch?' },
    answerText: {
      ar: 'للمتابعة العامة اتصل على 1530 أو اطلب المساعدة من مكتب الاستعلامات.',
      fr: 'Pour le suivi général, appelez le 1530 ou demandez à l’accueil information.',
      en: 'For general follow-up, call 1530 or ask the information desk.',
    },
    keywords: ['contact', 'phone', '1530', 'contacter', 'téléphone', 'اتصال', 'هاتف'],
    actionId: 'office-contact',
    usageCount: 11,
    lastUpdated: today,
    category: 'support',
    published: true,
  },
]

const mallActions: DemoAction[] = [
  {
    id: 'renewal-checklist',
    type: 'qr',
    label: { ar: 'خريطة المركز', fr: 'Plan du centre', en: 'Mall map' },
    description: {
      ar: 'امسح الرمز لفتح خريطة المحلات، المطاعم، والمواقف.',
      fr: 'Scannez pour ouvrir le plan des boutiques, restaurants et parkings.',
      en: 'Scan to open the map for shops, restaurants, and parking.',
    },
    value: 'mall-map',
  },
  {
    id: 'counter-3',
    type: 'direction',
    label: { ar: 'الطابق الأرضي — قرب المدخل', fr: 'Rez-de-chaussée — près de l’entrée', en: 'Ground floor — near the entrance' },
    description: {
      ar: 'مكتب الاستقبال وصرافان آليان موجودان في الطابق الأرضي قرب المدخل الرئيسي.',
      fr: 'Le point information et deux DAB sont au rez-de-chaussée près de l’entrée principale.',
      en: 'The information desk and two ATMs are on the ground floor near the main entrance.',
    },
    value: 'ground-floor-info',
  },
  {
    id: 'info-desk',
    type: 'direction',
    label: { ar: 'الطابق المطلوب', fr: 'L’étage indiqué', en: 'The right floor' },
    description: {
      ar: 'استخدم المصاعد عند المدخل الجنوبي للوصول السريع إلى الطابق المطلوب.',
      fr: 'Utilisez les ascenseurs à l’entrée sud pour rejoindre rapidement l’étage indiqué.',
      en: 'Use the elevators at the south entrance for fast access to the floor you need.',
    },
    value: 'mall-floor-direction',
  },
  {
    id: 'office-contact',
    type: 'contact',
    label: { ar: 'اتصل بالأمن', fr: 'Contacter la sécurité', en: 'Contact security' },
    description: {
      ar: 'للمفقودات أو الحالات العاجلة، اتصل بالأمن الداخلي.',
      fr: 'Pour les objets perdus ou urgences, contactez la sécurité.',
      en: 'For lost items or urgent issues, contact mall security.',
    },
    value: 'security-desk',
  },
  {
    id: 'staff-help',
    type: 'escalation',
    label: { ar: 'مساعدة بشرية', fr: 'Aide humaine', en: 'Human help' },
    description: {
      ar: 'يمكن لموظف الاستقبال مساعدتك في الاتجاهات أو المفقودات.',
      fr: 'Un agent d’accueil peut vous aider pour les directions ou objets perdus.',
      en: 'A reception agent can help with directions or lost items.',
    },
    value: 'mall-staff-help',
  },
]

const mallProfile: PilotProfile = {
  tenantName: { ar: 'مركز التسوق سيتي سنتر', fr: 'City Center Mall', en: 'City Center Mall' },
  locationName: { ar: 'مكتب الاستقبال الرئيسي', fr: 'Point information principal', en: 'Main information desk' },
  welcomeTitle: {
    ar: 'مساعدة رقمية لتوجيه الزوار داخل المركز',
    fr: 'Assistante digitale pour orienter les visiteurs du centre',
    en: 'Digital assistant for mall visitor guidance',
  },
  serviceSummary: {
    ar: 'تساعد في العثور على المحلات، المطاعم، المواقف، المفقودات، والمرافق.',
    fr: 'Aide à trouver boutiques, restaurants, parking, objets perdus et services.',
    en: 'Helps visitors find shops, restaurants, parking, lost items, and facilities.',
  },
  privacyNote: {
    ar: 'لا تدخل معلومات الدفع أو بيانات شخصية في هذا النموذج.',
    fr: 'Ne saisissez pas de données de paiement ou personnelles dans cette démo.',
    en: 'Do not enter payment or personal details in this demo.',
  },
  openingHours: {
    ar: 'كل يوم من 10:00 صباحا إلى 10:00 مساء.',
    fr: 'Tous les jours de 10h00 à 22h00.',
    en: 'Every day from 10:00 AM to 10:00 PM.',
  },
  contactNumber: '0550 00 00 00',
  defaultLanguage: 'fr',
  currentWait: {
    ar: 'الاستقبال متاح الآن',
    fr: 'Accueil disponible maintenant',
    en: 'Information desk available now',
  },
  liveStatus: {
    ar: 'وضع Lite First مناسب للشاشات العامة',
    fr: 'Mode Lite First adapté aux écrans publics',
    en: 'Lite First mode for public screens',
  },
  fallbackResponse,
  counters: [
    { id: 'mall-info', label: { ar: 'الاستقبال والمفقودات', fr: 'Accueil & objets perdus', en: 'Reception & lost items' }, status: { ar: 'الطابق الأرضي', fr: 'Rez-de-chaussée', en: 'Ground floor' } },
    { id: 'mall-prayer', label: { ar: 'قاعة الصلاة', fr: 'Salle de prière', en: 'Prayer room' }, status: { ar: 'الطابق الأول — الجهة الشرقية', fr: '1er étage — côté est', en: 'First floor — east side' } },
    { id: 'mall-food', label: { ar: 'المطاعم', fr: 'Restaurants', en: 'Restaurants' }, status: { ar: 'الطابق الثاني', fr: '2e étage', en: 'Second floor' } },
    { id: 'mall-parking', label: { ar: 'المواقف', fr: 'Parking', en: 'Parking' }, status: { ar: 'P1 و P2 — المدخل الجنوبي', fr: 'P1 et P2 — entrée sud', en: 'P1 and P2 — south entrance' } },
  ],
}

const mallAnswers: DemoAnswer[] = [
  {
    id: 'who-are-you',
    canonicalQuestion: { ar: 'من أنت؟', fr: 'Qui êtes-vous ?', en: 'Who are you?' },
    answerText: {
      ar: 'أنا آمال، مساعدة رقمية في مركز التسوق. أساعدك في الاتجاهات، المحلات، المواقف، والمفقودات.',
      fr: 'Je suis Amel, l’assistante digitale du centre. Je vous aide avec les directions, boutiques, parking et objets perdus.',
      en: 'I am Amel, the mall digital assistant. I help with directions, shops, parking, and lost items.',
    },
    keywords: ['who', 'assistant', 'mall', 'qui', 'vous', 'من', 'أنت', 'مول', 'مركز'],
    usageCount: 20,
    lastUpdated: today,
    category: 'identity',
    published: true,
  },
  {
    id: 'services',
    canonicalQuestion: { ar: 'ما هي الخدمات المتوفرة؟', fr: 'Quels services sont disponibles ?', en: 'What services are available?' },
    answerText: {
      ar: 'يمكنني مساعدتك في: خريطة المحلات والمطاعم، المواقف، دورات المياه، المصاعد، قاعة الصلاة، الصراف الآلي، والمفقودات.',
      fr: 'Je peux vous aider avec : plan des boutiques et restaurants, parking, toilettes, ascenseurs, salle de prière, distributeur ATM, et objets perdus.',
      en: 'I can help with: shop and restaurant map, parking, restrooms, elevators, prayer room, ATM, and lost items.',
    },
    keywords: ['services', 'shops', 'restaurants', 'parking', 'toilets', 'prayer', 'atm', 'lost', 'boutiques', 'salle', 'prière', 'محلات', 'مطاعم', 'مواقف', 'صلاة', 'صراف'],
    usageCount: 47,
    lastUpdated: today,
    category: 'services',
    published: true,
  },
  {
    id: 'restrooms',
    canonicalQuestion: {
      ar: 'أين دورات المياه ؟',
      fr: 'Où sont les toilettes ?',
      en: 'Where are the restrooms?',
    },
    answerText: {
      ar: 'دورات المياه موجودة في كل طابق قرب المصاعد. يوجد أيضا مرحاض للأشخاص ذوي الاحتياجات الخاصة في الطابق الأرضي.',
      fr: 'Les toilettes se trouvent à chaque étage près des ascenseurs. Toilettes accessibles PMR au rez-de-chaussée.',
      en: 'Restrooms are on every floor near the elevators. Accessible restrooms are on the ground floor.',
    },
    keywords: ['toilettes', 'toilet', 'restroom', 'wc', 'دورة', 'دورات', 'مياه', 'حمام', 'مرحاض'],
    actionId: 'info-desk',
    usageCount: 50,
    lastUpdated: today,
    category: 'navigation',
    published: true,
  },
  {
    id: 'prayer-room',
    canonicalQuestion: {
      ar: 'أين قاعة الصلاة ؟',
      fr: 'Où est la salle de prière ?',
      en: 'Where is the prayer room?',
    },
    answerText: {
      ar: 'قاعة الصلاة موجودة في الطابق الأول قرب مصاعد المنطقة الشرقية. توجد مساحات منفصلة للرجال والنساء، ومكان للوضوء.',
      fr: 'La salle de prière est au 1er étage, près des ascenseurs côté est. Espaces séparés hommes/femmes, avec une zone d’ablutions.',
      en: 'The prayer room is on the first floor near the east-side elevators. Separate areas for men and women, with an ablutions area.',
    },
    keywords: ['prière', 'prayer', 'salle', 'مصلى', 'صلاة', 'وضوء'],
    actionId: 'info-desk',
    usageCount: 42,
    lastUpdated: today,
    category: 'navigation',
    published: true,
  },
  {
    id: 'atm',
    canonicalQuestion: {
      ar: 'أين الصراف الآلي ؟',
      fr: 'Où est le distributeur de billets (DAB) ?',
      en: 'Where is the ATM?',
    },
    answerText: {
      ar: 'يوجد صرافان آليان في الطابق الأرضي قرب المدخل الرئيسي، وصراف ثالث قرب قاعة الطعام في الطابق الثاني.',
      fr: 'Deux DAB se trouvent au rez-de-chaussée près de l’entrée principale, et un troisième au 2e étage près du food court.',
      en: 'Two ATMs are on the ground floor near the main entrance, and a third one is on the second floor near the food court.',
    },
    keywords: ['atm', 'dab', 'distributeur', 'billets', 'cash', 'cashpoint', 'صراف', 'آلي', 'سحب'],
    actionId: 'counter-3',
    usageCount: 35,
    lastUpdated: today,
    category: 'navigation',
    published: true,
  },
  {
    id: 'lost-found',
    canonicalQuestion: {
      ar: 'أين أبلّغ عن غرض مفقود ؟',
      fr: 'Comment signaler un objet perdu ?',
      en: 'How do I report a lost item?',
    },
    answerText: {
      ar: 'توجه إلى مكتب الأمن في الطابق الأرضي مع وصف الغرض ومكان فقدانه التقريبي. الأغراض المسلَّمة تُحفظ لمدة 30 يوما.',
      fr: 'Allez au bureau de sécurité au rez-de-chaussée avec la description de l’objet et l’endroit approximatif où vous l’avez perdu. Les objets remis sont gardés 30 jours.',
      en: 'Go to the security office on the ground floor with a description of the item and the approximate place you lost it. Found items are kept for 30 days.',
    },
    keywords: ['perdu', 'objet', 'lost', 'found', 'security', 'sécurité', 'مفقود', 'مفقودات', 'أمن'],
    actionId: 'office-contact',
    usageCount: 22,
    lastUpdated: today,
    category: 'support',
    published: true,
  },
  {
    id: 'document-renewal-counter',
    canonicalQuestion: { ar: 'أين مكتب الاستقبال؟', fr: 'Où est le point information ?', en: 'Where is the information desk?' },
    answerText: {
      ar: 'مكتب الاستقبال موجود في الطابق الأرضي قرب المدخل الرئيسي والمصاعد.',
      fr: 'Le point information est au rez-de-chaussée près de l’entrée principale et des ascenseurs.',
      en: 'The information desk is on the ground floor near the main entrance and elevators.',
    },
    keywords: ['information', 'desk', 'where', 'accueil', 'point information', 'أين', 'استقبال'],
    actionId: 'counter-3',
    usageCount: 34,
    lastUpdated: today,
    category: 'navigation',
    published: true,
  },
  {
    id: 'required-documents',
    canonicalQuestion: { ar: 'أين المواقف؟', fr: 'Où est le parking ?', en: 'Where is parking?' },
    answerText: {
      ar: 'المواقف موجودة في P1 و P2. استخدم المدخل الجنوبي للوصول الأسرع.',
      fr: 'Le parking se trouve aux niveaux P1 et P2. Utilisez l’entrée sud pour un accès plus rapide.',
      en: 'Parking is available at P1 and P2. Use the south entrance for faster access.',
    },
    keywords: ['parking', 'park', 'voiture', 'p1', 'p2', 'موقف', 'مواقف', 'سيارة'],
    actionId: 'info-desk',
    usageCount: 51,
    lastUpdated: today,
    category: 'navigation',
    published: true,
  },
  {
    id: 'languages',
    canonicalQuestion: { ar: 'هل يمكنني التحدث بالعربية أو الفرنسية أو الإنجليزية؟', fr: 'Puis-je parler arabe, français ou anglais ?', en: 'Can I speak Arabic, French, or English?' },
    answerText: {
      ar: 'نعم، يمكنك اختيار العربية أو الفرنسية أو الإنجليزية من أعلى الشاشة.',
      fr: 'Oui, vous pouvez choisir arabe, français ou anglais en haut de l’écran.',
      en: 'Yes, you can choose Arabic, French, or English at the top of the screen.',
    },
    keywords: ['language', 'langue', 'arabe', 'english', 'لغة', 'عربية'],
    usageCount: 14,
    lastUpdated: today,
    category: 'language',
    published: true,
  },
  {
    id: 'opening-hours',
    canonicalQuestion: { ar: 'ما هي أوقات العمل؟', fr: 'Quels sont les horaires ?', en: 'What are the opening hours?' },
    answerText: {
      ar: 'المركز مفتوح كل يوم من 10:00 صباحا إلى 10:00 مساء.',
      fr: 'Le centre est ouvert tous les jours de 10h00 à 22h00.',
      en: 'The mall is open every day from 10:00 AM to 10:00 PM.',
    },
    keywords: ['hours', 'opening', 'closing', 'open', 'close', 'closed', 'time', 'when', 'today', 'horaires', 'horaire', 'ouvert', 'ouverture', 'ferme', 'fermer', 'fermeture', 'quand', 'aujourd', 'ساعة', 'ساعات', 'وقت', 'أوقات', 'مفتوح', 'مغلق', 'يغلق', 'يفتح', 'متى'],
    usageCount: 29,
    lastUpdated: today,
    category: 'services',
    published: true,
  },
  {
    id: 'which-counter',
    canonicalQuestion: { ar: 'لا أعرف أين أذهب.', fr: 'Je ne sais pas où aller.', en: 'I do not know where to go.' },
    answerText: {
      ar: 'ابدأ بمكتب الاستقبال في الطابق الأرضي. يمكن للموظف توجيهك حسب المحل أو الخدمة.',
      fr: 'Commencez par le point information au rez-de-chaussée. Un agent vous orientera selon la boutique ou le service.',
      en: 'Start at the ground-floor information desk. Staff will guide you based on the shop or service.',
    },
    keywords: ['where', 'not sure', 'lost', 'où', 'perdu', 'أين', 'تائه', 'لا أعرف'],
    actionId: 'counter-3',
    usageCount: 37,
    lastUpdated: today,
    category: 'navigation',
    published: true,
  },
  {
    id: 'qr-code',
    canonicalQuestion: { ar: 'هل يمكنني مسح رمز QR؟', fr: 'Puis-je scanner un code QR ?', en: 'Can I scan a QR code?' },
    answerText: {
      ar: 'نعم، امسح الرمز لفتح خريطة المركز على هاتفك.',
      fr: 'Oui, scannez le code pour ouvrir le plan du centre sur votre téléphone.',
      en: 'Yes, scan the code to open the mall map on your phone.',
    },
    keywords: ['qr', 'scan', 'map', 'plan', 'carte', 'رمز', 'خريطة'],
    actionId: 'renewal-checklist',
    usageCount: 18,
    lastUpdated: today,
    category: 'navigation',
    published: true,
  },
]

export const pilotScenarios: PilotScenario[] = [
  apcScenario,
  {
    id: 'algerie-poste-branch',
    title: 'Algérie Poste Branch',
    customerType: 'Public service / branch network',
    recommendedFor: 'A second pilot where queueing, documents, and multilingual guidance are highly visible.',
    description: 'A branch assistant for CCP, Edahabia, parcels, ticketing, and information desk routing.',
    valueProposition:
      'Reduce queue confusion and route visitors before they reach the wrong counter.',
    demoTalkTrack: [
      'Apply the Algérie Poste scenario from admin setup.',
      'Ask the kiosk where to go for CCP services and show counter routing.',
      'Ask what documents are needed and show the QR checklist.',
      'Explain that the same backend can run across many branch locations later.',
    ],
    profile: posteProfile,
    actions: posteActions,
    answers: posteAnswers,
    unknownQuestions: [
      {
        id: 'unknown-poste-edahabia-delay',
        question: 'Ma carte Edahabia n’est pas arrivée. Que faire ?',
        language: 'fr',
        fallbackResponse,
        count: 2,
        confidence: 'medium',
        status: 'new',
        createdAt: '2026-05-17T09:00:00.000Z',
      },
      {
        id: 'unknown-poste-family-pickup',
        question: 'Can my brother pick up my parcel?',
        language: 'en',
        fallbackResponse,
        count: 1,
        confidence: 'low',
        status: 'new',
        createdAt: '2026-05-17T09:20:00.000Z',
      },
    ],
  },
  {
    id: 'mall-information-desk',
    title: 'Mall Information Desk',
    customerType: 'Retail / mall reception',
    recommendedFor: 'A commercial pilot with simple routing, map, parking, and lost-item questions.',
    description: 'A mall assistant for directions, shops, restaurants, parking, restrooms, and lost items.',
    valueProposition:
      'Give visitors quick directions while keeping staffing and avatar costs low.',
    demoTalkTrack: [
      'Apply the mall scenario from admin setup.',
      'Ask where parking is, then show the direction card.',
      'Ask for the QR map and show the phone-friendly action panel.',
      'Show that the same product can serve small malls with Lite First pricing.',
    ],
    profile: mallProfile,
    actions: mallActions,
    answers: mallAnswers,
    unknownQuestions: [
      {
        id: 'unknown-mall-prayer-room',
        question: 'Où est la salle de prière ?',
        language: 'fr',
        fallbackResponse,
        count: 3,
        confidence: 'medium',
        status: 'new',
        createdAt: '2026-05-17T10:30:00.000Z',
      },
      {
        id: 'unknown-mall-stroller',
        question: 'هل يمكنني استعارة عربة أطفال؟',
        language: 'ar',
        fallbackResponse,
        count: 1,
        confidence: 'low',
        status: 'new',
        createdAt: '2026-05-17T11:15:00.000Z',
      },
    ],
  },
]

export const pilotScenarioSummaries: PilotScenarioSummary[] = pilotScenarios.map((scenario) => ({
  id: scenario.id,
  title: scenario.title,
  customerType: scenario.customerType,
  recommendedFor: scenario.recommendedFor,
  description: scenario.description,
  valueProposition: scenario.valueProposition,
  demoTalkTrack: scenario.demoTalkTrack,
}))

export function getPilotScenario(id: string) {
  return pilotScenarios.find((scenario) => scenario.id === id)
}
