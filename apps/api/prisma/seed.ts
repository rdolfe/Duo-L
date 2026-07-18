import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// ---------- Types de contenu ----------
type Ex =
  | { type: "LISTEN_REPEAT"; textEn: string; hintFr?: string }
  | { type: "TRANSLATE_SPEAK"; textFr: string; accepted: string[] }
  | { type: "ROLEPLAY"; contextFr: string; npcName: string; npcLine: string; choices: string[] }
  | { type: "READ_ALOUD"; paragraphEn: string }
  | { type: "MULTIPLE_CHOICE"; prompt: string; options: string[]; answer: string; hintFr?: string }
  | { type: "FILL_BLANK"; sentence: string; answer: string; hintFr?: string; alternatives?: string[] }
  | { type: "WRITE_TRANSLATION"; textFr: string; accepted: string[] }
  | { type: "LISTEN_TYPE"; textEn: string };

type LessonDef = { title: string; xp?: number; exercises: Ex[] };
type UnitDef = { cefrLevel: string; title: string; description: string; lessons: LessonDef[] };
type ExamDef = { cefrLevel: string; title: string; description: string; passScore?: number; xp?: number; exercises: Ex[] };

// Cours théoriques : explications en français, exemples anglais écoutables.
type CourseSection = {
  heading: string;
  body?: string;
  examples?: { en: string; fr: string }[];
  tip?: string;
};
type CourseDef = {
  cefrLevel: string;
  title: string;
  emoji: string;
  intro: string;
  sections: CourseSection[];
};

const LR = (textEn: string, hintFr?: string): Ex => ({ type: "LISTEN_REPEAT", textEn, hintFr });
const TS = (textFr: string, ...accepted: string[]): Ex => ({ type: "TRANSLATE_SPEAK", textFr, accepted });
const RP = (contextFr: string, npcName: string, npcLine: string, ...choices: string[]): Ex => ({
  type: "ROLEPLAY", contextFr, npcName, npcLine, choices,
});
const RA = (paragraphEn: string): Ex => ({ type: "READ_ALOUD", paragraphEn });
const MC = (prompt: string, options: string[], answer: string, hintFr?: string): Ex => ({
  type: "MULTIPLE_CHOICE", prompt, options, answer, hintFr,
});
const FB = (sentence: string, answer: string, hintFr?: string, ...alternatives: string[]): Ex => ({
  type: "FILL_BLANK", sentence, answer, hintFr, alternatives,
});
const WT = (textFr: string, ...accepted: string[]): Ex => ({ type: "WRITE_TRANSLATION", textFr, accepted });
const LT = (textEn: string): Ex => ({ type: "LISTEN_TYPE", textEn });

// Ordre pédagogique : on regroupe les exercices par type à l'intérieur de chaque
// leçon (d'abord l'oral, puis l'écrit), pour que le joueur enchaîne les mêmes
// gestes ensemble (répéter, parler, dialoguer, lire, QCM, mot manquant, traduire,
// dictée).
const TYPE_ORDER: Record<Ex["type"], number> = {
  LISTEN_REPEAT: 1,
  TRANSLATE_SPEAK: 2,
  ROLEPLAY: 3,
  READ_ALOUD: 4,
  MULTIPLE_CHOICE: 5,
  FILL_BLANK: 6,
  WRITE_TRANSLATION: 7,
  LISTEN_TYPE: 8,
};
const byType = (exercises: Ex[]): Ex[] =>
  exercises
    .map((ex, i) => ({ ex, i }))
    .sort((a, b) => TYPE_ORDER[a.ex.type] - TYPE_ORDER[b.ex.type] || a.i - b.i)
    .map(({ ex }) => ex);

const UNITS: UnitDef[] = [
  // ==================== A1 ====================
  {
    cefrLevel: "A1",
    title: "Les salutations",
    description: "Dire bonjour, se présenter et être poli.",
    lessons: [
      {
        title: "Dire bonjour",
        exercises: [
          LR("Hello!", "Bonjour !"),
          LR("Good morning.", "Bonjour (le matin)."),
          LR("Good afternoon.", "Bonjour (l'après-midi)."),
          TS("Bonsoir.", "good evening"),
          TS("Salut, ça va ?", "hi how are you", "hey how are you"),
          MC("Comment dit-on « Bonne nuit » ?", ["Good night", "Good morning", "Good evening", "Good day"], "Good night"),
          FB("___ morning, everyone!", "good", "le matin"),
          RP("Vous croisez un voisin dans la rue.", "Tom", "Hi! How are you?",
            "I am fine, thank you.", "Not bad, and you?"),
          LR("Have a nice day!", "Bonne journée !"),
          MC("Someone says « Hi! How are you? » — Que réponds-tu ?", ["I'm fine, thank you.", "I'm from Paris.", "It's Monday.", "Goodbye!"], "I'm fine, thank you.", "réfléchis à la question posée"),
          MC("Quelle phrase est correcte ?", ["Good evening, sir.", "Good evening sir you are?", "Evening good, sir.", "Sir good evening is."], "Good evening, sir."),
          FB("Good ___, I'm going to bed.", "night", "avant de dormir"),
          LT("Good evening."),
        ],
      },
      {
        title: "Se présenter",
        exercises: [
          LR("My name is Anna.", "Je m'appelle Anna."),
          LR("Nice to meet you.", "Enchanté."),
          TS("Je m'appelle Paul.", "my name is paul", "i am paul", "i'm paul"),
          TS("D'où viens-tu ?", "where are you from"),
          MC("« I am from France » signifie :", ["Je viens de France", "Je vais en France", "J'aime la France", "Je suis en France"], "Je viens de France"),
          FB("What is your ___?", "name", "prénom/nom"),
          WT("Je suis étudiant.", "i am a student", "i'm a student"),
          RP("Vous rencontrez une collègue pour la première fois.", "Sarah", "Hello, I'm Sarah. What's your name?",
            "My name is Alex, nice to meet you.", "I am Alex, how are you?"),
          LR("It's a pleasure to meet you.", "C'est un plaisir de te rencontrer."),
          MC("« What's your name? » — Que réponds-tu ?", ["My name is Léo.", "I'm fine.", "Yes, I am.", "It's blue."], "My name is Léo.", "réfléchis à la question posée"),
          MC("Quelle phrase est correcte ?", ["I am twenty years old.", "I have twenty years.", "I am twenty years.", "I have twenty years old."], "I am twenty years old.", "piège du français « avoir 20 ans »"),
          FB("I ___ from Canada.", "am", "verbe être", "come"),
          LT("My name is John."),
        ],
      },
      {
        title: "La politesse",
        exercises: [
          LR("Please.", "S'il vous plaît."),
          LR("Thank you very much.", "Merci beaucoup."),
          LR("You're welcome.", "De rien."),
          TS("Excusez-moi.", "excuse me", "sorry"),
          MC("On répond à « Thank you » par :", ["You're welcome", "Please", "Sorry", "Goodbye"], "You're welcome"),
          FB("___ you very much!", "thank", "remercier"),
          WT("Je suis désolé.", "i am sorry", "i'm sorry"),
          RA("Hello! Thank you very much for your help. You are very kind. Have a nice day!"),
          LR("Could you repeat that, please?", "Peux-tu répéter, s'il te plaît ?"),
          MC("Tu bouscules quelqu'un dans la rue. Tu dis :", ["Excuse me, I'm sorry!", "You're welcome!", "Good night!", "See you later!"], "Excuse me, I'm sorry!", "réfléchis à la situation"),
          MC("« Can you help me, please? » — Réponse polie :", ["Of course!", "No.", "Me too.", "It's mine."], "Of course!"),
          FB("Excuse me, ___ you help me?", "can", "demander de l'aide", "could"),
          LT("You are very kind."),
        ],
      },
    ],
  },
  {
    cefrLevel: "A1",
    title: "La vie quotidienne",
    description: "Le café, les nombres et la famille.",
    lessons: [
      {
        title: "Au café",
        exercises: [
          LR("I would like a coffee, please.", "Je voudrais un café, s'il vous plaît."),
          LR("How much is it?", "Combien ça coûte ?"),
          TS("Un thé, s'il vous plaît.", "a tea please", "one tea please", "a cup of tea please"),
          TS("L'addition, s'il vous plaît.", "the bill please", "the check please", "can i have the bill please"),
          MC("Pour commander, on dit :", ["I would like", "I am like", "I would love it", "I want it now"], "I would like"),
          FB("A coffee, ___ please.", "yes", "réponse polie", "sure"),
          WT("Je voudrais de l'eau.", "i would like some water", "i would like water", "can i have some water"),
          RP("Le serveur prend votre commande.", "Waiter", "Good morning! What can I get you?",
            "I would like a coffee, please.", "A tea and a croissant, please."),
          MC("Le serveur demande « Anything else? » — tu as fini de commander :", ["No, thank you. That's all.", "Yes, goodbye.", "One more, nothing please.", "I am a coffee."], "No, thank you. That's all.", "réfléchis à la situation"),
          MC("Quelle phrase est correcte ?", ["I would like a tea, please.", "I like would a tea please.", "I would a tea like please.", "Would I like a tea please."], "I would like a tea, please."),
          FB("Here is your coffee! — Thank ___!", "you", "réponse polie"),
          LT("How much is the coffee?"),
        ],
      },
      {
        title: "Les nombres",
        exercises: [
          LR("One, two, three, four, five.", "Un, deux, trois, quatre, cinq."),
          LR("It costs ten dollars.", "Ça coûte dix dollars."),
          TS("J'ai deux frères.", "i have two brothers"),
          TS("Il y a trois pommes.", "there are three apples"),
          MC("Combien font « two plus three » ?", ["five", "four", "six", "seven"], "five"),
          FB("I am ___ years old. (7)", "seven", "écris le nombre en lettres ou en chiffres", "7"),
          WT("J'ai quinze ans.", "i am fifteen", "i am fifteen years old", "i'm fifteen"),
          RA("I have three cats and two dogs. My sister has one bird. We have six animals at home."),
          MC("Tom has four apples. He eats one. How many apples now?", ["three", "four", "five", "two"], "three", "petit calcul en anglais"),
          MC("Which number is « nineteen »?", ["19", "9", "90", "29"], "19"),
          FB("Ten plus ten is ___.", "twenty", "calcul", "20"),
          LT("There are twelve months in a year."),
        ],
      },
      {
        title: "La famille",
        exercises: [
          LR("This is my mother.", "Voici ma mère."),
          LR("I have a little sister.", "J'ai une petite sœur."),
          TS("Mon père s'appelle John.", "my father's name is john", "my father is called john", "my dad's name is john"),
          TS("As-tu des frères et sœurs ?", "do you have any brothers or sisters", "do you have brothers or sisters"),
          MC("« brother » signifie :", ["frère", "sœur", "père", "cousin"], "frère"),
          FB("My ___ is my mother's mother.", "grandmother", "la mère de ma mère", "grandma"),
          WT("Voici ma famille.", "this is my family", "here is my family"),
          RP("Un ami regarde une photo de famille.", "Emma", "Who is this on the photo?",
            "This is my mother and my father.", "This is my little sister."),
          MC("« My mother's brother » is my…", ["uncle", "aunt", "cousin", "grandfather"], "uncle", "réfléchis au lien de parenté"),
          MC("Quelle phrase est correcte ?", ["She is my sister.", "She are my sister.", "She my sister is.", "Her is my sister."], "She is my sister."),
          FB("My father's father is my ___.", "grandfather", "le père de mon père", "grandpa"),
          LT("This is my brother and my sister."),
        ],
      },
    ],
  },
  {
    cefrLevel: "A1",
    title: "Se déplacer",
    description: "Demander son chemin et prendre le train.",
    lessons: [
      {
        title: "Demander son chemin",
        exercises: [
          LR("Where is the train station?", "Où est la gare ?"),
          LR("Go straight ahead.", "Allez tout droit."),
          TS("Où est la gare ?", "where is the train station", "where is the station"),
          TS("Où sont les toilettes ?", "where are the toilets", "where is the bathroom", "where is the restroom"),
          MC("« turn left » signifie :", ["tourner à gauche", "tourner à droite", "tout droit", "faire demi-tour"], "tourner à gauche"),
          FB("Where ___ the museum?", "is", "verbe être au singulier"),
          WT("C'est près d'ici ?", "is it near here", "is it close to here", "is it near"),
          RP("Vous êtes perdu dans la rue.", "Passerby", "You look lost. Can I help you?",
            "Yes, where is the train station?", "Yes, I am looking for the museum."),
          MC("« Where is the bank? » — « It's ___ the supermarket. »", ["next to", "into", "on top", "inside of"], "next to", "à côté de"),
          MC("On te demande ton chemin mais tu ne sais pas. Tu dis :", ["Sorry, I don't know.", "Yes, of course.", "It's very good.", "You're welcome."], "Sorry, I don't know.", "réfléchis à la situation"),
          FB("Go ___ ahead and turn left.", "straight", "tout droit"),
          LT("Turn right at the corner."),
        ],
      },
      {
        title: "À la gare",
        exercises: [
          LR("A ticket to London, please.", "Un billet pour Londres, s'il vous plaît."),
          LR("Which platform is it?", "C'est quel quai ?"),
          TS("Le train part à quelle heure ?", "what time does the train leave", "when does the train leave"),
          TS("Un aller-retour, s'il vous plaît.", "a return ticket please", "a round trip please", "a round trip ticket please"),
          MC("« platform » signifie :", ["le quai", "le billet", "le train", "la sortie"], "le quai"),
          FB("A ticket ___ London, please.", "to", "direction"),
          WT("Le train est en retard.", "the train is late", "the train is delayed"),
          RP("Au guichet de la gare.", "Agent", "Good morning, where would you like to go?",
            "A ticket to London, please.", "I would like to go to Paris."),
          RA("The train to London leaves at nine. It arrives at eleven. The ticket costs twenty pounds."),
          MC("The train leaves at 9:00. It is 8:50. How many minutes do you have?", ["ten", "twenty", "five", "fifteen"], "ten", "petit calcul"),
          MC("Quelle phrase est correcte ?", ["What time does the train leave?", "What time the train leaves?", "What time leave the train?", "The train what time leaves?"], "What time does the train leave?"),
          FB("The train ___ at platform two.", "arrives", "arriver"),
          LT("The next train leaves at ten."),
        ],
      },
    ],
  },
  // ==================== A2 ====================
  {
    cefrLevel: "A2",
    title: "Voyager",
    description: "L'hôtel, l'aéroport et les vacances.",
    lessons: [
      {
        title: "À l'hôtel",
        exercises: [
          LR("I have a reservation for two nights.", "J'ai une réservation pour deux nuits."),
          LR("What time is breakfast served?", "À quelle heure le petit-déjeuner est-il servi ?"),
          TS("Je voudrais une chambre avec vue.", "i would like a room with a view", "i want a room with a view"),
          TS("Y a-t-il le wifi gratuit ?", "is there free wifi", "do you have free wifi"),
          MC("« a double room » est :", ["une chambre double", "une chambre simple", "une suite", "un dortoir"], "une chambre double"),
          FB("I have a ___ for two nights.", "reservation", "réservation", "booking"),
          WT("À quelle heure est le départ ?", "what time is check out", "what time is checkout", "when is check out"),
          RP("À la réception de l'hôtel.", "Receptionist", "Welcome! Do you have a reservation?",
            "Yes, I have a reservation for two nights.", "No, do you have a room available?"),
          MC("« Is breakfast included? » signifie :", ["Le petit-déjeuner est-il compris ?", "Où est le petit-déjeuner ?", "Le petit-déjeuner est-il bon ?", "À quelle heure est le petit-déjeuner ?"], "Le petit-déjeuner est-il compris ?"),
          MC("Quelle phrase est correcte ?", ["I'd like to book a room.", "I'd like booking a room.", "I like to booking a room.", "I'd like book a room."], "I'd like to book a room."),
          FB("Your room is on the second ___.", "floor", "étage"),
          LT("Breakfast is served at eight."),
        ],
      },
      {
        title: "À l'aéroport",
        exercises: [
          LR("My flight is delayed.", "Mon vol est retardé."),
          LR("Where is the boarding gate?", "Où est la porte d'embarquement ?"),
          TS("Où est la porte d'embarquement ?", "where is the boarding gate", "where is the gate"),
          TS("J'ai un bagage à enregistrer.", "i have a bag to check in", "i have one bag to check in", "i have a suitcase to check in"),
          MC("« boarding pass » signifie :", ["carte d'embarquement", "passeport", "billet de train", "valise"], "carte d'embarquement"),
          FB("My flight is ___, I have to wait.", "delayed", "retardé", "late"),
          WT("Mon vol part à sept heures.", "my flight leaves at seven", "my flight is at seven", "my flight departs at seven"),
          RP("Au comptoir d'enregistrement.", "Agent", "Can I see your passport, please?",
            "Of course, here it is.", "Yes, one moment please."),
          RA("My flight leaves at seven in the morning. I need to be at the airport two hours early. I always check my passport twice."),
          MC("Your flight is at 10:00. You must arrive two hours early. You arrive at:", ["8:00", "9:00", "10:00", "12:00"], "8:00", "petit calcul"),
          MC("Quelle phrase est correcte ?", ["How long is the flight?", "How long the flight is?", "The flight how long is?", "How long does the flight?"], "How long is the flight?"),
          FB("Passengers must show their boarding ___ at the gate.", "pass", "carte d'embarquement"),
          LT("The gate closes in twenty minutes."),
        ],
      },
    ],
  },
  {
    cefrLevel: "A2",
    title: "Sortir et acheter",
    description: "Les magasins et le restaurant.",
    lessons: [
      {
        title: "Au magasin",
        exercises: [
          LR("Do you have this in a smaller size?", "L'avez-vous en plus petite taille ?"),
          LR("Can I pay by card?", "Puis-je payer par carte ?"),
          TS("Combien coûte cette veste ?", "how much is this jacket", "how much does this jacket cost"),
          TS("Est-ce que je peux essayer ça ?", "can i try this on", "may i try this on"),
          MC("« too expensive » signifie :", ["trop cher", "trop grand", "trop petit", "pas assez"], "trop cher"),
          FB("Can I pay by ___?", "card", "moyen de paiement", "credit card"),
          WT("C'est trop grand.", "it is too big", "it's too big"),
          RP("Dans une boutique de vêtements.", "Seller", "Hello, can I help you find something?",
            "Yes, I am looking for a black jacket.", "No thank you, I am just looking."),
          MC("The jacket costs fifty dollars. You pay with one hundred dollars. Your change:", ["fifty dollars", "forty dollars", "sixty dollars", "one hundred dollars"], "fifty dollars", "petit calcul"),
          MC("« Can I try it on? » — le vendeur répond :", ["Sure, the fitting room is over there.", "No, it's raining.", "Yes, it's five o'clock.", "I'm just looking."], "Sure, the fitting room is over there.", "réfléchis à la situation"),
          FB("It's too big. Do you have a ___ size?", "smaller", "plus petit"),
          LT("How much does it cost?"),
        ],
      },
      {
        title: "Au restaurant",
        exercises: [
          LR("A table for two, please.", "Une table pour deux, s'il vous plaît."),
          LR("The bill, please.", "L'addition, s'il vous plaît."),
          TS("Je vais prendre le poulet.", "i will have the chicken", "i'll have the chicken", "i will take the chicken"),
          TS("Pourrais-je avoir de l'eau ?", "could i have some water", "can i have some water", "may i have some water"),
          MC("« starter » veut dire :", ["entrée", "plat principal", "dessert", "boisson"], "entrée"),
          FB("A table ___ two, please.", "for", "pour"),
          WT("C'était délicieux.", "it was delicious", "that was delicious"),
          RP("Le serveur revient à votre table.", "Waiter", "How was everything tonight?",
            "It was delicious, thank you.", "Very good, can we have the bill please?"),
          RA("Last night we went to a small Italian restaurant. I ordered pasta and my friend chose the fish. The food was delicious and not too expensive."),
          LR("Enjoy your meal!", "Bon appétit !"),
          MC("You are vegetarian. Which dish do you choose?", ["The vegetable pasta", "The beef burger", "The roast chicken", "The fish and chips"], "The vegetable pasta", "réfléchis au menu"),
          MC("Quelle phrase est correcte ?", ["Could we have the bill, please?", "Could we have bill the please?", "The bill could we have please?", "Could the bill we have?"], "Could we have the bill, please?"),
          FB("I'll have the chicken ___ main course.", "as", "comme plat", "for"),
          LT("Can we have the menu, please?"),
        ],
      },
    ],
  },
  // ==================== B1 ====================
  {
    cefrLevel: "B1",
    title: "Vie sociale",
    description: "Parler de soi, de ses loisirs et donner son avis.",
    lessons: [
      {
        title: "Parler de ses loisirs",
        exercises: [
          LR("In my free time, I enjoy hiking and photography.", "Pendant mon temps libre, j'aime la randonnée et la photo."),
          LR("I usually go running on weekends.", "Je vais généralement courir le week-end."),
          TS("Je fais du sport trois fois par semaine.", "i play sports three times a week", "i do sports three times a week", "i exercise three times a week"),
          TS("J'adore lire des romans.", "i love reading novels", "i love to read novels"),
          MC("« I am keen on cooking » signifie :", ["J'aime beaucoup cuisiner", "Je déteste cuisiner", "Je cuisine mal", "Je ne cuisine jamais"], "J'aime beaucoup cuisiner"),
          FB("I am really into ___ these days.", "photography", "un loisir", "cooking", "running"),
          WT("Je joue de la guitare depuis cinq ans.", "i have been playing the guitar for five years", "i have played the guitar for five years"),
          RP("Une discussion entre amis.", "Mike", "What do you usually do on weekends?",
            "I usually go hiking with my friends.", "I like to stay home and read books."),
          RA("I have been playing the guitar for five years. At first it was difficult, but now I really enjoy it. Music helps me relax after a long day at work."),
          LR("It helps me unwind after work.", "Ça m'aide à décompresser après le travail."),
          MC("« I can't stand football » signifie :", ["Je déteste le football", "J'adore le football", "Je joue au football", "Je regarde le football debout"], "Je déteste le football", "piège !"),
          MC("Which sentence is correct?", ["I have been playing tennis since 2020.", "I am playing tennis since 2020.", "I play tennis since 2020.", "I played tennis since 2020."], "I have been playing tennis since 2020."),
          FB("She spends her free time ___ novels.", "reading", "gérondif"),
          LT("I enjoy hiking in the mountains."),
        ],
      },
      {
        title: "Donner son opinion",
        exercises: [
          LR("In my opinion, this movie is overrated.", "À mon avis, ce film est surestimé."),
          LR("I see your point, but I disagree.", "Je comprends ton point de vue, mais je ne suis pas d'accord."),
          TS("Je pense que tu as raison.", "i think you are right", "i think you're right"),
          TS("Je ne suis pas d'accord avec toi.", "i disagree with you", "i do not agree with you", "i don't agree with you"),
          MC("« I couldn't agree more » veut dire :", ["Je suis tout à fait d'accord", "Je ne suis pas d'accord", "Je ne sais pas", "Peut-être"], "Je suis tout à fait d'accord"),
          FB("In my ___, the book is better than the film.", "opinion", "avis", "view"),
          WT("D'après moi, c'est une bonne idée.", "in my opinion it is a good idea", "in my opinion it's a good idea", "i think it is a good idea"),
          RP("Un débat sur les réseaux sociaux.", "Julia", "Do you think social media is good for society?",
            "In my opinion, it depends on how we use it.", "I believe it has more disadvantages than benefits."),
          MC("Ton ami dit « I think this film is amazing! » — tu n'es PAS d'accord :", ["Really? I found it quite boring.", "Me too, it's terrible.", "Yes, I hate it too.", "I agree, it's awful."], "Really? I found it quite boring.", "attention à la cohérence"),
          MC("Which sentence is correct?", ["I agree with you.", "I am agree with you.", "I agree to you.", "I am agreed with you."], "I agree with you.", "piège du français « je suis d'accord »"),
          FB("I see your point, ___ I disagree.", "but", "connecteur", "however"),
          LT("I strongly believe we should try."),
        ],
      },
      {
        title: "Raconter son week-end",
        exercises: [
          LR("I had a great time with my friends.", "J'ai passé un super moment avec mes amis."),
          LR("We ended up watching movies all night.", "On a fini par regarder des films toute la nuit."),
          TS("Qu'est-ce que tu as fait ce week-end ?", "what did you do this weekend", "what did you do on the weekend"),
          TS("On est allés se promener malgré la pluie.", "we went for a walk despite the rain", "we went for a walk in spite of the rain"),
          RP("Lundi matin, à la machine à café.", "Colleague", "So, how was your weekend?",
            "It was great, I visited my parents.", "Pretty quiet, I just relaxed at home."),
          MC("« It was a blast! » signifie :", ["C'était génial", "C'était bruyant", "Ça a explosé", "C'était décevant"], "C'était génial"),
          MC("Which sentence is correct?", ["I didn't do anything special.", "I didn't did anything special.", "I don't did anything special.", "I didn't done anything special."], "I didn't do anything special."),
          FB("We ___ up late and missed the bus.", "woke", "se réveiller, au passé"),
          WT("On s'est bien amusés samedi soir.", "we had a lot of fun on saturday night", "we had a lot of fun saturday night", "we had great fun on saturday night"),
          LT("We spent the whole afternoon in the park."),
        ],
      },
    ],
  },
  {
    cefrLevel: "B1",
    title: "Le monde du travail",
    description: "Entretiens et vie professionnelle.",
    lessons: [
      {
        title: "Un entretien d'embauche",
        exercises: [
          LR("I have three years of experience in marketing.", "J'ai trois ans d'expérience en marketing."),
          LR("I work well under pressure.", "Je travaille bien sous pression."),
          TS("Pourquoi voulez-vous travailler ici ?", "why do you want to work here"),
          TS("Je suis disponible immédiatement.", "i am available immediately", "i'm available immediately", "i am available right away"),
          MC("« a strength » dans un entretien est :", ["une qualité", "un défaut", "un salaire", "un congé"], "une qualité"),
          FB("I have three years of ___ in this field.", "experience", "expérience"),
          WT("Je suis motivé et fiable.", "i am motivated and reliable", "i'm motivated and reliable"),
          RP("Face au recruteur.", "Recruiter", "Tell me about your greatest strength.",
            "I am very organized and I learn quickly.", "I work well under pressure and in a team."),
          RA("Thank you for this opportunity. I believe my experience matches this position perfectly. I am motivated, reliable, and I look forward to joining your team."),
          MC("Le recruteur demande « What is your main weakness? » — la meilleure réponse :", ["I sometimes focus too much on details.", "I am always late.", "I hate working.", "I have no weaknesses at all."], "I sometimes focus too much on details.", "réfléchis à ce qui reste professionnel"),
          MC("Which sentence is correct?", ["I have worked here for three years.", "I work here since three years.", "I am working here since three years.", "I have worked here since three years."], "I have worked here for three years."),
          FB("I look forward to ___ from you.", "hearing", "gérondif après « look forward to »"),
          LT("I am looking for a new challenge."),
        ],
      },
      {
        title: "Au téléphone et par e-mail",
        exercises: [
          LR("Could you hold the line, please?", "Pouvez-vous patienter, s'il vous plaît ?"),
          LR("I'm calling about my order.", "J'appelle au sujet de ma commande."),
          TS("Pourriez-vous m'envoyer les détails par e-mail ?", "could you send me the details by email", "could you email me the details"),
          TS("Je vous rappelle dès que possible.", "i will call you back as soon as possible", "i'll call you back as soon as possible"),
          RP("Un client appelle le support.", "Client", "Hello, I have a problem with my invoice.",
            "I'm sorry to hear that. Can you give me your order number?", "Let me check that for you right away."),
          MC("« Please find attached… » s'utilise pour :", ["joindre un document à un e-mail", "chercher un objet perdu", "conclure une réunion", "saluer un collègue"], "joindre un document à un e-mail"),
          MC("Au téléphone, « Who's calling, please? » signifie :", ["C'est de la part de qui ?", "Qui appelez-vous ?", "Pourquoi appelez-vous ?", "Quel est votre numéro ?"], "C'est de la part de qui ?"),
          FB("I'm writing ___ regard to your application.", "with", "formule d'e-mail"),
          WT("Merci de votre réponse rapide.", "thank you for your quick reply", "thanks for your quick reply", "thank you for your prompt reply"),
          LT("I'll forward the email to the whole team."),
        ],
      },
    ],
  },
  // ==================== B2 ====================
  {
    cefrLevel: "B2",
    title: "Débats et idées",
    description: "Argumenter, nuancer, convaincre.",
    lessons: [
      {
        title: "Exprimer un désaccord",
        exercises: [
          LR("I'm afraid I have to disagree with that statement.", "Je crains de devoir contester cette affirmation."),
          LR("With all due respect, I see it differently.", "Avec tout le respect que je vous dois, je le vois autrement."),
          TS("Ce n'est pas aussi simple que ça en a l'air.", "it is not as simple as it seems", "it's not as simple as it looks", "it is not as simple as it looks"),
          TS("Je comprends votre point de vue, cependant je ne suis pas d'accord.", "i see your point however i disagree", "i understand your point but i disagree"),
          MC("« I beg to differ » signifie :", ["Je me permets de ne pas être d'accord", "Je suis d'accord", "Je m'excuse", "Je ne comprends pas"], "Je me permets de ne pas être d'accord"),
          FB("I'm afraid I have to ___ with you on that.", "disagree", "ne pas être d'accord"),
          WT("Je crains que ce ne soit pas exact.", "i am afraid that is not accurate", "i'm afraid that is not correct", "i am afraid that is not correct"),
          RP("Une réunion houleuse au bureau.", "Colleague", "I think we should cut the research budget entirely.",
            "I see your point, however that would hurt us in the long run.", "With all due respect, I strongly disagree with that approach."),
          RA("While I understand the appeal of this proposal, we must consider its long-term consequences. Cutting costs today could seriously undermine our competitiveness tomorrow."),
          MC("« I take your point » signifie :", ["Je reconnais la validité de ton argument", "Je prends des notes", "Je refuse d'écouter", "Je change de sujet"], "Je reconnais la validité de ton argument"),
          MC("Which sentence is the most diplomatic?", ["I see what you mean, but have you considered the risks?", "You are completely wrong.", "That's a stupid idea.", "No. Just no."], "I see what you mean, but have you considered the risks?", "réfléchis au ton"),
          FB("I agree with you up to a ___, but not entirely.", "point", "jusqu'à un certain…"),
          LT("I'm afraid I can't agree with that."),
        ],
      },
      {
        title: "Argumenter avec nuance",
        exercises: [
          LR("On the one hand it saves money, on the other hand it increases risk.", "D'un côté ça économise de l'argent, de l'autre ça augmente le risque."),
          LR("That said, there are some clear benefits.", "Cela dit, il y a des avantages évidents."),
          TS("Tout bien considéré, je pense que cela en vaut la peine.", "all things considered i think it is worth it", "all things considered i think it's worth it"),
          TS("D'un autre côté, cela pourrait poser problème.", "on the other hand it could be a problem", "on the other hand this could be a problem"),
          MC("« nevertheless » veut dire :", ["néanmoins", "par exemple", "en effet", "d'abord"], "néanmoins"),
          FB("On the one hand it is cheap; on the ___ hand it is risky.", "other", "l'autre côté"),
          WT("Cela dit, nous devrions être prudents.", "that said we should be careful", "having said that we should be careful"),
          RA("The evidence suggests that remote work increases productivity for most employees. Nevertheless, it may weaken team cohesion over time, which is precisely why a hybrid approach deserves serious consideration."),
          MC("« The results are somewhat disappointing » — la nuance exprimée :", ["légèrement décevant", "totalement décevant", "excellent", "sans importance"], "légèrement décevant"),
          MC("Which linker introduces a contrast?", ["However", "Therefore", "Moreover", "Indeed"], "However", "réfléchis au rôle de chaque connecteur"),
          FB("The plan is ambitious; ___, it may succeed.", "nevertheless", "néanmoins", "nonetheless", "however"),
          LT("On the whole, the plan seems reasonable."),
        ],
      },
      {
        title: "Convaincre et négocier",
        exercises: [
          LR("Let's find some common ground.", "Trouvons un terrain d'entente."),
          LR("I'm willing to compromise on the price.", "Je suis prêt à faire un compromis sur le prix."),
          TS("Qu'est-ce que vous proposez concrètement ?", "what exactly do you propose", "what do you propose exactly", "what are you proposing exactly"),
          TS("Cette solution profite aux deux parties.", "this solution benefits both parties", "this solution benefits both sides"),
          RP("Négociation serrée avec un fournisseur.", "Supplier", "This is our final offer, I'm afraid.",
            "Let's meet halfway on this.", "I'll need to discuss it with my team first."),
          MC("« a win-win situation » est :", ["une situation gagnant-gagnant", "une double victoire sportive", "un pari risqué", "un jeu à somme nulle"], "une situation gagnant-gagnant"),
          MC("Which sentence is the most persuasive opener?", ["Imagine cutting your costs by thirty percent.", "I want to sell you something.", "You probably won't like this.", "This is a long presentation."], "Imagine cutting your costs by thirty percent.", "réfléchis à l'accroche"),
          FB("We won't budge ___ this point.", "on", "ne pas céder sur"),
          WT("Si vous signez aujourd'hui, la livraison est offerte.", "if you sign today delivery is free", "if you sign today we offer free delivery", "if you sign today shipping is free"),
          LT("Both sides finally reached an agreement."),
        ],
      },
    ],
  },
  // ==================== C1 ====================
  {
    cefrLevel: "C1",
    title: "Nuances et style",
    description: "Humour, ironie et registres de langue.",
    lessons: [
      {
        title: "L'ironie et l'humour",
        exercises: [
          LR("Well, that meeting was an absolute triumph, wasn't it?", "Eh bien, cette réunion était un triomphe absolu, n'est-ce pas ? (ironique)"),
          LR("Oh, brilliant. Just what we needed.", "Oh, génial. C'est exactement ce qu'il nous fallait. (ironique)"),
          TS("C'est la meilleure idée que j'aie jamais entendue... ou pas.", "that is the best idea i have ever heard or not", "that's the best idea i've ever heard or not"),
          TS("Disons que ça aurait pu mieux se passer.", "let's just say it could have gone better", "let us just say it could have gone better"),
          MC("« That's rich, coming from you » exprime :", ["l'ironie / le reproche", "un compliment", "un remerciement", "une excuse"], "l'ironie / le reproche"),
          FB("Let's just say it could have gone ___.", "better", "mieux"),
          WT("Honnêtement, c'était un désastre, mais on a survécu.", "honestly it was a disaster but we survived", "honestly it was a complete disaster but we survived"),
          RP("Après une présentation catastrophique.", "Coworker", "So, how do you think the presentation went?",
            "Let's just say it could have gone better.", "Honestly, it was a complete disaster, but we survived."),
          RA("British humour relies heavily on understatement and self-deprecation. Saying that something is not entirely terrible might actually be high praise, whereas calling it interesting could well be devastating criticism."),
          MC("Le plan de ton collègue a échoué. Il demande « So? » — réponse ironique :", ["Well, that went swimmingly.", "It failed, unfortunately.", "I am very sorry for you.", "Let's try again tomorrow."], "Well, that went swimmingly.", "réfléchis au second degré"),
          MC("« Not my cup of tea » signifie :", ["Pas à mon goût", "Pas mon thé", "Trop cher pour moi", "Trop compliqué"], "Pas à mon goût"),
          FB("The show was interesting, to say the ___.", "least", "euphémisme"),
          LT("That could have gone a little better."),
        ],
      },
      {
        title: "Diplomatie et registres",
        exercises: [
          LR("With respect, I believe there may be another explanation.", "Sauf votre respect, il y a peut-être une autre explication."),
          LR("Perhaps we could revisit this at a later stage.", "Peut-être pourrions-nous y revenir plus tard."),
          TS("Il serait peut-être judicieux d'attendre.", "it might be wise to wait", "it may be wise to wait", "perhaps it would be wise to wait"),
          TS("Je crains que ce ne soit pas envisageable.", "i am afraid that is not feasible", "i'm afraid that is not an option", "i am afraid that is not an option"),
          MC("Version diplomatique de « Your plan is bad » :", ["Your plan may benefit from a few adjustments.", "Your plan is terrible, sorry.", "I hate your plan.", "Who made this plan?"], "Your plan may benefit from a few adjustments."),
          MC("« I hear what you're saying » annonce souvent :", ["un désaccord poli", "un accord total", "un compliment", "une question"], "un désaccord poli"),
          MC("Registre familier (britannique) de « exhausted » :", ["knackered", "enervated", "lethargic", "somnolent"], "knackered"),
          FB("Would you be so ___ as to forward the document?", "kind", "formule très polie"),
          WT("Nous vous serions reconnaissants de répondre rapidement.", "we would be grateful for a prompt reply", "we would appreciate a prompt reply", "we would be grateful if you could reply promptly"),
          LT("I wonder if you might reconsider your position."),
        ],
      },
    ],
  },
  // ==================== C2 ====================
  {
    cefrLevel: "C2",
    title: "Éloquence",
    description: "Discours, rhétorique et maîtrise totale.",
    lessons: [
      {
        title: "L'art du discours",
        exercises: [
          LR("Ask not what your country can do for you; ask what you can do for your country.", "Célèbre anaphore de J.F. Kennedy."),
          LR("We shall not flag or fail. We shall go on to the end.", "Nous ne faiblirons ni n'échouerons. Nous irons jusqu'au bout. (Churchill)"),
          TS("Ce n'est pas la fin, ce n'est même pas le commencement de la fin.", "this is not the end it is not even the beginning of the end", "it is not the end it is not even the beginning of the end"),
          TS("Choisissons le courage plutôt que le confort.", "let us choose courage over comfort", "let's choose courage over comfort"),
          MC("Une « anaphore » consiste à :", ["répéter un mot en début de phrases", "poser une question", "conclure un discours", "citer un auteur"], "répéter un mot en début de phrases"),
          WT("Les mots, maniés avec sagesse, peuvent changer le monde.", "words wielded wisely can change the world", "words used wisely can change the world"),
          RA("Ladies and gentlemen, we stand today at a crossroads. The choices we make in the coming months will echo for generations. Let us therefore choose courage over comfort, and substance over spectacle."),
          RA("Throughout history, the most enduring speeches have shared three qualities: clarity of purpose, rhythm of delivery, and an unshakeable conviction that words, wielded wisely, can change the world."),
          MC("Quelle figure de style : « We shall fight on the beaches, we shall fight on the landing grounds… » ?", ["une anaphore", "une métaphore", "une litote", "un oxymore"], "une anaphore", "répétition en début de phrases"),
          MC("Which sentence uses a rhetorical question?", ["How much longer must we wait for justice?", "We have waited a long time.", "Justice takes time.", "We are still waiting."], "How much longer must we wait for justice?"),
          FB("Ask not what your country can do for you; ask what ___ can do for your country.", "you", "célèbre chiasme"),
          LT("We stand today at a crossroads."),
        ],
      },
      {
        title: "Débattre comme un maître",
        exercises: [
          LR("My opponent's argument, however eloquent, rests on a false premise.", "L'argument de mon adversaire, aussi éloquent soit-il, repose sur une prémisse fausse."),
          LR("Let us not mistake conviction for correctness.", "Ne confondons pas conviction et justesse."),
          TS("Permettez-moi de reformuler la question.", "allow me to rephrase the question", "let me rephrase the question"),
          TS("C'est précisément là que le raisonnement s'effondre.", "that is precisely where the reasoning collapses", "this is precisely where the reasoning falls apart", "that is exactly where the reasoning falls apart"),
          MC("Dénoncer un « straw man », c'est reprocher à l'adversaire :", ["d'avoir déformé votre argument", "d'être fragile", "de brûler les étapes", "de citer trop fidèlement"], "d'avoir déformé votre argument"),
          MC("Une attaque « ad hominem » vise :", ["la personne plutôt que l'argument", "l'argument principal", "le public", "la conclusion seulement"], "la personne plutôt que l'argument"),
          MC("Which rebuttal is the most devastatingly polite?", ["I admire the confidence with which my colleague ignores the evidence.", "You're wrong and you know it.", "Whatever, next question.", "I refuse to answer that."], "I admire the confidence with which my colleague ignores the evidence."),
          FB("Correlation does not imply ___ .", "causation", "le grand classique des débats"),
          WT("La charge de la preuve incombe à celui qui affirme.", "the burden of proof lies with the one who asserts", "the burden of proof lies with the person making the claim", "the burden of proof rests on the one who asserts"),
          LT("A sound argument needs no raised voice."),
        ],
      },
    ],
  },
  // ==================== ÉCRIT & MIXTE — NIVEAU MOYEN ====================
  {
    cefrLevel: "A2",
    title: "Grammaire en action",
    description: "QCM, phrases à trous et dictées pour consolider les bases.",
    lessons: [
      {
        title: "Le présent simple",
        exercises: [
          TS("Elle va au travail tous les jours.", "she goes to work every day"),
          MC("She ___ to work every day.", ["goes", "go", "going", "gone"], "goes", "3e personne du singulier"),
          MC("We ___ television in the evening.", ["watch", "watches", "watching", "watched"], "watch"),
          FB("They ___ football on Sundays.", "play", "verbe « jouer »"),
          FB("He ___ coffee every morning.", "drinks", "3e personne du singulier", "has"),
          WT("Il mange une pomme.", "he eats an apple", "he is eating an apple"),
          MC("Read: « Tom works at night and sleeps during the day. » — When does Tom sleep?", ["during the day", "at night", "in the evening", "never"], "during the day", "compréhension"),
          MC("Which sentence is correct?", ["My sister lives in London.", "My sister live in London.", "My sister living in London.", "My sister is live in London."], "My sister lives in London."),
          LT("I usually wake up at seven o'clock."),
        ],
      },
      {
        title: "Questions et négations",
        exercises: [
          TS("Est-ce que tu parles anglais ?", "do you speak english"),
          MC("Comment dit-on « Je ne comprends pas » ?", ["I don't understand", "I don't understood", "I not understand", "I no understand"], "I don't understand"),
          MC("___ she like tea?", ["Does", "Do", "Is", "Are"], "Does"),
          FB("___ you like coffee?", "do", "auxiliaire des questions"),
          FB("She ___ not live here.", "does", "auxiliaire à la 3e personne"),
          WT("Nous ne travaillons pas le dimanche.", "we do not work on sundays", "we don't work on sundays", "we do not work on sunday"),
          MC("Which question is correct?", ["Where does she work?", "Where she works?", "Where does she works?", "Where do she work?"], "Where does she work?", "réfléchis à l'auxiliaire"),
          MC("Read: « Lisa doesn't eat meat, but she eats fish. » — Lisa mange…", ["du poisson", "de la viande", "ni l'un ni l'autre", "les deux"], "du poisson", "compréhension"),
          LT("Where do you live?"),
        ],
      },
      {
        title: "Le passé simple",
        exercises: [
          TS("Hier, j'ai regardé un film.", "yesterday i watched a movie", "yesterday i watched a film"),
          MC("Yesterday, I ___ a great movie.", ["watched", "watch", "watching", "watches"], "watched", "action terminée hier"),
          MC("They ___ to Spain last summer.", ["went", "goed", "gone", "going"], "went"),
          FB("I ___ my keys this morning.", "lost", "perdre, au passé", "forgot"),
          FB("She ___ a beautiful song yesterday.", "sang", "chanter, au passé"),
          WT("Nous sommes allés au restaurant hier soir.", "we went to the restaurant last night", "we went to a restaurant last night", "we went to the restaurant yesterday evening"),
          MC("Read: « Anna visited Rome last year. » — the action is…", ["finished", "happening now", "in the future", "impossible"], "finished", "réfléchis au temps"),
          MC("Which sentence is correct?", ["Did you see the match yesterday?", "Did you saw the match yesterday?", "Do you saw the match yesterday?", "You did see the match yesterday?"], "Did you see the match yesterday?"),
          LT("She bought a new car last week."),
        ],
      },
    ],
  },
  {
    cefrLevel: "B1",
    title: "Compréhension et expression",
    description: "Vocabulaire, dictées et traduction écrite de niveau intermédiaire.",
    lessons: [
      {
        title: "Vocabulaire du quotidien",
        exercises: [
          MC("Quel mot signifie « célèbre » ?", ["famous", "favorite", "familiar", "funny"], "famous"),
          MC("« to borrow » signifie :", ["emprunter", "prêter", "acheter", "vendre"], "emprunter"),
          MC("Le contraire de « expensive » est :", ["cheap", "rich", "costly", "large"], "cheap"),
          FB("Can I ___ your phone for a minute?", "borrow", "emprunter", "use"),
          FB("This restaurant is quite ___, I can't afford it.", "expensive", "cher", "pricey"),
          WT("Je cherche un appartement près du centre-ville.", "i am looking for an apartment near the city center", "i'm looking for an apartment near the city centre", "i am looking for a flat near the city center"),
          MC("Read: « Sam is broke. » — Sam…", ["has no money", "is injured", "is tired", "is angry"], "has no money", "expression familière"),
          MC("« I'm running late » signifie :", ["Je suis en retard", "Je cours vite", "Je pars tôt", "Je fais un footing"], "Je suis en retard", "piège !"),
          LT("I need to buy some groceries."),
        ],
      },
      {
        title: "Dictée intermédiaire",
        exercises: [
          LR("She said she would call me back.", "Elle a dit qu'elle me rappellerait."),
          WT("S'il pleut, nous resterons à la maison.", "if it rains we will stay at home", "if it rains we'll stay home", "if it rains we will stay home"),
          RA("Learning a language is like building a house. You need strong foundations, patience, and daily practice. Every new word is another brick in the wall."),
          MC("« She would call me back » — « to call back » signifie :", ["rappeler", "appeler à l'aide", "raccrocher", "annuler"], "rappeler"),
          MC("Read: « Unless it rains, we'll have the picnic. » — le pique-nique a lieu…", ["s'il ne pleut pas", "s'il pleut", "dans tous les cas", "jamais"], "s'il ne pleut pas", "réfléchis à « unless »"),
          LT("If it rains tomorrow, we will stay at home."),
          LT("I have been learning English for two years."),
          LT("She promised to send the report by Monday."),
        ],
      },
      {
        title: "Expressions du quotidien",
        exercises: [
          MC("« to hang out » signifie :", ["passer du temps, traîner", "raccrocher", "étendre le linge", "sortir de prison"], "passer du temps, traîner"),
          MC("« I'm on my way » veut dire :", ["J'arrive", "Je suis perdu", "Je pars en voyage", "Je suis occupé"], "J'arrive"),
          MC("Read: « Let's split the bill. » — on propose de…", ["partager l'addition", "annuler la commande", "payer pour tout le monde", "partir sans payer"], "partager l'addition"),
          MC("« It's up to you » signifie :", ["C'est toi qui décides", "C'est au-dessus de toi", "C'est ta faute", "C'est ton tour"], "C'est toi qui décides"),
          FB("Can you ___ me a hand with these boxes?", "give", "donner un coup de main", "lend"),
          FB("I'm running ___ of time.", "out", "à court de"),
          TS("Ça te dit d'aller boire un café ?", "do you fancy a coffee", "do you want to grab a coffee", "how about a coffee"),
          WT("Tiens-moi au courant.", "keep me posted", "keep me informed", "let me know"),
          LT("Let me know if you need anything."),
        ],
      },
    ],
  },
  // ==================== ÉCRIT & MIXTE — NIVEAU DIFFICILE ====================
  {
    cefrLevel: "B2",
    title: "Précision et style",
    description: "Grammaire avancée, expressions idiomatiques et dictées soutenues.",
    lessons: [
      {
        title: "Grammaire avancée",
        exercises: [
          TS("Si j'étais riche, je voyagerais partout.", "if i were rich i would travel everywhere", "if i was rich i would travel everywhere"),
          MC("If I ___ rich, I would travel the world.", ["were", "was", "am", "be"], "were", "conditionnel irréel"),
          MC("Que signifie « to give up » ?", ["abandonner", "donner", "monter", "offrir"], "abandonner"),
          FB("She has been working here ___ 2015.", "since", "« depuis » + date précise"),
          FB("I have lived here ___ ten years.", "for", "« depuis » + durée"),
          WT("J'aurais dû t'écouter.", "i should have listened to you"),
          MC("Which sentence is correct?", ["If she had studied, she would have passed.", "If she studied, she would have passed.", "If she has studied, she would passed.", "If she would have studied, she passed."], "If she had studied, she would have passed.", "3e conditionnel"),
          MC("Read: « He barely made it to the meeting. » — il est arrivé…", ["de justesse", "en avance", "confortablement", "il n'est pas venu"], "de justesse"),
          FB("I wish I ___ taller.", "were", "souhait irréel", "was"),
          LT("Despite the heavy rain, the ceremony went ahead as planned."),
        ],
      },
      {
        title: "Dictée soutenue",
        exercises: [
          LR("The report must be submitted by Friday at the latest.", "Le rapport doit être rendu vendredi au plus tard."),
          WT("Si j'avais su, j'y serais allé.", "if i had known i would have gone", "had i known i would have gone"),
          RA("Negotiating effectively requires more than fluent speech. One must listen carefully, anticipate objections, and respond with both precision and tact, especially when the stakes are high."),
          MC("« The meeting was called off » signifie :", ["La réunion a été annulée", "La réunion a commencé", "La réunion a été bruyante", "La réunion a été déplacée"], "La réunion a été annulée"),
          MC("Which word best completes: « The results were ___ expectations. »", ["beyond", "among", "inside", "against of"], "beyond", "au-delà des attentes"),
          LT("Had I known about the meeting, I would have attended."),
          LT("The decision was postponed until further notice."),
        ],
      },
      {
        title: "Le passif et l'impersonnel",
        exercises: [
          LR("The decision was made behind closed doors.", "La décision a été prise à huis clos."),
          LR("It is said that the building is haunted.", "On dit que le bâtiment est hanté."),
          TS("Le rapport a été publié hier.", "the report was published yesterday"),
          TS("On m'a offert un nouveau poste.", "i was offered a new position", "i was offered a new job"),
          MC("« The window ___ during the night. »", ["was broken", "is breaking", "broke it", "has broke"], "was broken", "passif au passé"),
          MC("« It is believed that… » se traduit :", ["On pense que…", "Il croit que…", "C'est incroyable que…", "Il faut croire en…"], "On pense que…"),
          MC("Which sentence is passive?", ["The novel was written in 1984.", "She wrote the novel in 1984.", "The novel is exciting.", "Writers write novels."], "The novel was written in 1984."),
          FB("English ___ spoken all over the world.", "is", "passif présent"),
          WT("Le suspect a été arrêté par la police.", "the suspect was arrested by the police"),
          LT("The results will be announced next week."),
        ],
      },
    ],
  },
  {
    cefrLevel: "C1",
    title: "Finesse lexicale",
    description: "Vocabulaire rare, nuances et pièges de traduction.",
    lessons: [
      {
        title: "Nuances de vocabulaire",
        exercises: [
          MC("« ubiquitous » signifie :", ["omniprésent", "ambigu", "obsolète", "urgent"], "omniprésent"),
          MC("The evidence was purely ___.", ["circumstantial", "circumstance", "circumscribed", "circulatory"], "circumstantial", "indices indirects"),
          MC("« meticulous » veut dire :", ["minutieux", "paresseux", "rapide", "malhonnête"], "minutieux"),
          FB("The politician was accused of ___ the truth.", "distorting", "déformer", "twisting", "bending"),
          FB("Her argument was ___ and hard to follow.", "convoluted", "alambiqué", "confusing"),
          WT("Quoi qu'il arrive, nous devons rester objectifs.", "whatever happens we must remain objective", "no matter what happens we must remain objective", "whatever happens we have to stay objective"),
          MC("Which word means « to make something worse »?", ["exacerbate", "alleviate", "mitigate", "improve"], "exacerbate", "réfléchis au sens"),
          MC("Read: « His answer was evasive. » — sa réponse était…", ["fuyante", "précise", "brutale", "drôle"], "fuyante"),
          FB("His speech was deliberately ___ to avoid commitment.", "vague", "flou", "ambiguous"),
          LT("The committee reached a unanimous decision."),
        ],
      },
      {
        title: "Collocations avancées",
        exercises: [
          MC("On dit :", ["heavy rain", "strong rain", "big rain", "hard rain"], "heavy rain", "la collocation naturelle"),
          MC("« to ___ a promise »", ["keep", "hold", "stay", "guard"], "keep"),
          MC("On dit :", ["to make a decision", "to do a decision", "to take up a decision", "to build a decision"], "to make a decision"),
          MC("« utterly » se combine le mieux avec :", ["ridiculous", "good", "nice", "fine"], "ridiculous", "utterly + adjectif fort"),
          MC("« a burning question » est :", ["une question urgente", "une question dangereuse", "une question interdite", "une question stupide"], "une question urgente"),
          FB("She paid me a lovely ___ about my speech.", "compliment", "collocation : pay a compliment"),
          FB("The scandal did lasting ___ to his reputation.", "damage", "collocation : do damage"),
          TS("Cette théorie ne tient pas la route.", "this theory does not hold water", "this theory doesn't hold water", "this theory does not stand up"),
          WT("Il a une connaissance approfondie du sujet.", "he has an in-depth knowledge of the subject", "he has a thorough knowledge of the subject", "he has in-depth knowledge of the subject"),
          LT("Her argument carries considerable weight."),
        ],
      },
    ],
  },
  {
    cefrLevel: "C2",
    title: "Virtuosité",
    description: "Dictées d'expert, virelangues et traductions littéraires.",
    lessons: [
      {
        title: "Dictée d'expert",
        exercises: [
          MC("« to eschew » signifie :", ["éviter délibérément", "mâcher", "poursuivre", "saluer"], "éviter délibérément"),
          MC("« ephemeral » veut dire :", ["éphémère", "éternel", "énorme", "évident"], "éphémère"),
          RA("Peter Piper picked a peck of pickled peppers. She sells seashells by the seashore. How much wood would a woodchuck chuck if a woodchuck could chuck wood?"),
          MC("« Notwithstanding » est le plus proche de :", ["despite", "because of", "thanks to", "including"], "despite"),
          MC("Read: « The minister's denial was categorical. » — son démenti était…", ["sans appel", "hésitant", "partiel", "ironique"], "sans appel"),
          LT("The unprecedented circumstances necessitated an entirely novel approach."),
          LT("Notwithstanding the committee's reservations, the proposal was unanimously approved."),
        ],
      },
      {
        title: "Traduction magistrale",
        exercises: [
          MC("Choisis la tournure la plus idiomatique pour « Il pleut des cordes » :", ["It's raining cats and dogs", "It rains ropes", "It's raining strings", "Water is falling hard"], "It's raining cats and dogs"),
          WT("La procrastination est le voleur du temps.", "procrastination is the thief of time"),
          WT("La véritable éloquence consiste à dire ce qu'il faut, et rien de plus.", "true eloquence consists in saying what is needed and nothing more", "true eloquence is saying what is necessary and nothing more"),
          RA("True mastery of a foreign language reveals itself not in flawless grammar, but in the effortless dance between wit, nuance, and timing that native speakers perform without a second thought."),
          MC("Best translation of « avoir le cafard » :", ["to feel blue", "to have a cockroach", "to be a beetle", "to feel insect"], "to feel blue", "expression idiomatique"),
          MC("Which sentence is the most idiomatic?", ["That job interview was a piece of cake.", "That job interview was a slice of bread.", "That job interview was a cup of sugar.", "That job interview was a bowl of soup."], "That job interview was a piece of cake."),
          LT("Eloquence is the art of saying the right thing at the right moment."),
        ],
      },
      {
        title: "Faux amis et pièges ultimes",
        exercises: [
          MC("« eventually » signifie :", ["finalement", "éventuellement", "également", "évidemment"], "finalement", "LE faux ami classique"),
          MC("« to demand » signifie :", ["exiger", "demander poliment", "se demander", "questionner"], "exiger", "bien plus fort que le français"),
          MC("« deceptive » veut dire :", ["trompeur", "décevant", "réceptif", "perceptible"], "trompeur", "décevant = disappointing"),
          MC("« sensible » signifie :", ["raisonnable", "sensible", "émotif", "fragile"], "raisonnable", "sensible (fr) = sensitive"),
          MC("« to achieve » :", ["accomplir", "acheter", "achever quelqu'un", "abandonner"], "accomplir"),
          FB("His speech was full of hidden ___ meanings.", "double", "double sens"),
          TS("Ce mot n'a pas d'équivalent exact en anglais.", "this word has no exact equivalent in english", "this word has no exact english equivalent"),
          WT("Traduire, c'est trahir un peu.", "to translate is to betray a little", "translation is a small betrayal", "to translate is to betray a bit"),
          LT("The subtle irony of the original is easily lost."),
          RA("False friends are the translator's oldest enemies. Eventually is not éventuellement, sensible is not sensible, and a librairie sells books while a library merely lends them."),
        ],
      },
    ],
  },
  // ==================== QUIZ QCM (une unité par niveau) ====================
  {
    cefrLevel: "A1",
    title: "Quiz A1",
    description: "Des QCM du plus facile au plus piégeux pour tester tes bases.",
    lessons: [
      {
        title: "QCM faciles",
        exercises: [
          MC("« dog » signifie :", ["chien", "chat", "oiseau", "poisson"], "chien"),
          MC("« red » est la couleur :", ["rouge", "bleu", "vert", "jaune"], "rouge"),
          MC("Comment dit-on « au revoir » ?", ["Goodbye", "Good night", "Good luck", "Welcome"], "Goodbye"),
          MC("« water » signifie :", ["de l'eau", "du vin", "du lait", "du café"], "de l'eau"),
          MC("Quel jour vient après Monday ?", ["Tuesday", "Sunday", "Thursday", "Friday"], "Tuesday"),
          MC("« I am hungry » veut dire :", ["J'ai faim", "J'ai soif", "Je suis fatigué", "J'ai froid"], "J'ai faim"),
          MC("Le pluriel de « cat » est :", ["cats", "cates", "caties", "cat"], "cats"),
        ],
      },
      {
        title: "QCM modérés",
        exercises: [
          MC("« There ___ two apples on the table. »", ["are", "is", "am", "be"], "are", "pluriel"),
          MC("Quelle heure est « half past nine » ?", ["9 h 30", "9 h 15", "8 h 30", "9 h 45"], "9 h 30"),
          MC("« She ___ a red car. »", ["has", "have", "is", "haves"], "has"),
          MC("Le contraire de « big » est :", ["small", "tall", "long", "old"], "small"),
          MC("« How old are you? » demande :", ["ton âge", "ta taille", "ton nom", "ton adresse"], "ton âge"),
          MC("« We ___ from Spain. »", ["are", "is", "be", "am"], "are"),
          MC("Read: « Tom is Anna's brother. » — Anna est…", ["la sœur de Tom", "la mère de Tom", "la fille de Tom", "l'amie de Tom"], "la sœur de Tom", "compréhension"),
        ],
      },
      {
        title: "QCM difficiles",
        exercises: [
          MC("« It's five to eight » signifie :", ["7 h 55", "8 h 05", "5 h 08", "8 h 55"], "7 h 55", "five to = moins cinq"),
          MC("Quelle phrase est correcte ?", ["There is some milk in the fridge.", "There is any milk in the fridge.", "There are some milk in the fridge.", "It has some milk in the fridge."], "There is some milk in the fridge.", "some en phrase affirmative"),
          MC("« a loaf of bread » est :", ["un pain entier", "une tranche de pain", "une miette", "un sandwich"], "un pain entier"),
          MC("Read: « The shop opens at 9 and closes at 5. » — it is open for…", ["eight hours", "nine hours", "five hours", "four hours"], "eight hours", "petit calcul"),
          MC("Le possessif correct : « This is ___ book. » (le livre de Marie)", ["Marie's", "Maries", "Marie", "of Marie"], "Marie's"),
          MC("« How much » ou « How many » ? « ___ sugar do you want? »", ["How much", "How many", "How lot", "How some"], "How much", "sugar est indénombrable"),
          MC("« I don't have ___ money. »", ["any", "some", "a", "many"], "any", "any en phrase négative"),
        ],
      },
    ],
  },
  {
    cefrLevel: "A2",
    title: "Quiz A2",
    description: "QCM de grammaire et de vocabulaire du quotidien, en trois paliers.",
    lessons: [
      {
        title: "QCM faciles",
        exercises: [
          MC("« cheap » signifie :", ["pas cher", "cher", "gratuit", "cassé"], "pas cher"),
          MC("Hier = :", ["yesterday", "tomorrow", "today", "tonight"], "yesterday"),
          MC("« He ___ TV every evening. »", ["watches", "watch", "watching", "watched"], "watches"),
          MC("Le passé de « go » est :", ["went", "goed", "gone", "going"], "went"),
          MC("« a return ticket » est :", ["un aller-retour", "un aller simple", "un remboursement", "un reçu"], "un aller-retour"),
          MC("« I ___ pasta yesterday. »", ["ate", "eat", "eats", "eaten"], "ate"),
          MC("« luggage » signifie :", ["les bagages", "le passeport", "le billet", "la douane"], "les bagages"),
        ],
      },
      {
        title: "QCM modérés",
        exercises: [
          MC("« ___ they arrive on time? » (passé)", ["Did", "Do", "Does", "Were"], "Did"),
          MC("« She didn't ___ the email. »", ["send", "sent", "sends", "sending"], "send", "après didn't : base verbale"),
          MC("Read: « The museum is closed on Mondays. » — on peut y aller…", ["le mardi", "le lundi", "jamais", "seulement le lundi"], "le mardi", "compréhension"),
          MC("« always » se place :", ["avant le verbe (I always eat…)", "en fin de phrase", "avant le sujet", "n'importe où"], "avant le verbe (I always eat…)"),
          MC("« I'm going ___ buy some bread. »", ["to", "for", "at", "in"], "to"),
          MC("Le comparatif de « good » est :", ["better", "gooder", "more good", "best"], "better"),
          MC("« They ___ at home last night. »", ["were", "was", "are", "be"], "were"),
        ],
      },
      {
        title: "QCM difficiles",
        exercises: [
          MC("Quelle phrase est correcte ?", ["I have never been to Japan.", "I have never gone in Japan.", "I never was to Japan.", "I have never be in Japan."], "I have never been to Japan."),
          MC("« Whose jacket is this? » demande :", ["à qui appartient la veste", "où est la veste", "combien coûte la veste", "de quelle couleur est la veste"], "à qui appartient la veste"),
          MC("« She's taller ___ her brother. »", ["than", "that", "as", "of"], "than"),
          MC("Read: « The 8:15 train is running 20 minutes late. » — il partira à :", ["8:35", "8:15", "8:20", "7:55"], "8:35", "petit calcul"),
          MC("« You ___ smoke here, it's forbidden. »", ["mustn't", "don't must", "must", "can"], "mustn't"),
          MC("Le superlatif de « expensive » :", ["the most expensive", "the expensivest", "the more expensive", "most expensive of"], "the most expensive"),
          MC("« enough » se place : « The coffee is ___ . »", ["hot enough", "enough hot", "hot too", "very enough"], "hot enough", "enough APRÈS l'adjectif"),
        ],
      },
    ],
  },
  {
    cefrLevel: "B1",
    title: "Quiz B1",
    description: "Present perfect, nuances et pièges du niveau intermédiaire.",
    lessons: [
      {
        title: "QCM faciles",
        exercises: [
          MC("« to improve » signifie :", ["améliorer", "imprimer", "improviser", "empirer"], "améliorer"),
          MC("« I have lived here ___ 2019. »", ["since", "for", "during", "from"], "since"),
          MC("« a deadline » est :", ["une date limite", "une ligne morte", "une file d'attente", "une pause"], "une date limite"),
          MC("« I used to play tennis » signifie :", ["Je jouais au tennis (avant)", "J'ai l'habitude de jouer", "Je joue souvent", "Je viens de jouer"], "Je jouais au tennis (avant)"),
          MC("« to hire » veut dire :", ["embaucher", "licencier", "démissionner", "postuler"], "embaucher"),
          MC("« I've just finished » signifie :", ["Je viens de finir", "J'ai fini depuis longtemps", "Je finis bientôt", "Je finis toujours"], "Je viens de finir"),
          MC("Le contraire de « to succeed » :", ["to fail", "to win", "to try", "to pass"], "to fail"),
        ],
      },
      {
        title: "QCM modérés",
        exercises: [
          MC("« Have you finished ___? »", ["yet", "already", "still", "never"], "yet", "yet en question = déjà"),
          MC("« While I ___ dinner, the phone rang. »", ["was cooking", "cooked", "am cooking", "cook"], "was cooking", "action en cours interrompue"),
          MC("Read: « Despite his efforts, he failed. » — il a…", ["échoué malgré ses efforts", "réussi grâce à ses efforts", "abandonné sans effort", "réussi sans effort"], "échoué malgré ses efforts"),
          MC("« I'd rather stay home » signifie :", ["Je préférerais rester à la maison", "Je devrais rester", "Je dois rester", "Je déteste rester"], "Je préférerais rester à la maison"),
          MC("« The meeting has been ___ until Friday. »", ["postponed", "posted", "proposed", "pretended"], "postponed", "reporté"),
          MC("Quelle phrase est correcte ?", ["She has been working here since March.", "She is working here since March.", "She works here since March.", "She worked here since March now."], "She has been working here since March."),
          MC("« unless » signifie :", ["à moins que", "parce que", "dès que", "tandis que"], "à moins que"),
        ],
      },
      {
        title: "QCM difficiles",
        exercises: [
          MC("« He said he ___ come. » (discours indirect)", ["would", "will", "shall", "can"], "would"),
          MC("« I wish I ___ more time. »", ["had", "have", "would have", "has"], "had", "souhait irréel → prétérit"),
          MC("Read: « Hardly anyone came to the meeting. » — la réunion était…", ["presque vide", "bondée", "annulée", "houleuse"], "presque vide", "hardly = à peine"),
          MC("« to look after » signifie :", ["s'occuper de", "chercher", "regarder derrière", "ressembler à"], "s'occuper de"),
          MC("« It's worth ___ . »", ["trying", "to try", "try", "tried"], "trying", "worth + -ing"),
          MC("« a fortnight » est :", ["deux semaines", "une nuit forte", "un mois", "quinze jours de vacances payées"], "deux semaines"),
          MC("Quelle phrase est correcte ?", ["If I see him, I'll tell him.", "If I will see him, I tell him.", "If I would see him, I'll tell him.", "If I see him, I would told him."], "If I see him, I'll tell him.", "1er conditionnel"),
        ],
      },
      {
        title: "QCM faciles II",
        exercises: [
          MC("« a nap » est :", ["une sieste", "une nappe", "un plan", "une serviette"], "une sieste"),
          MC("« to book a table » :", ["réserver une table", "lire à table", "acheter une table", "nettoyer une table"], "réserver une table"),
          MC("Le contraire de « early » :", ["late", "soon", "fast", "never"], "late"),
          MC("« I feel like eating pizza » signifie :", ["J'ai envie de manger une pizza", "Je ressemble à une pizza", "Je me sens comme une pizza", "Je dois manger une pizza"], "J'ai envie de manger une pizza"),
          MC("« a commute » est :", ["un trajet domicile-travail", "un ordinateur", "une réunion", "une pause déjeuner"], "un trajet domicile-travail"),
          MC("« to move house » :", ["déménager", "bouger les meubles", "construire une maison", "vendre une maison"], "déménager"),
          MC("« I can't make it tonight » signifie :", ["Je ne peux pas venir ce soir", "Je ne sais pas cuisiner ce soir", "Je ne comprends pas ce soir", "Je ne veux pas dormir ce soir"], "Je ne peux pas venir ce soir"),
        ],
      },
      {
        title: "QCM modérés II",
        exercises: [
          MC("« She's been to Rome twice. » — elle…", ["y est allée deux fois", "y habite", "y va bientôt", "n'y est jamais allée"], "y est allée deux fois"),
          MC("« ___ I was cooking, he was watching TV. »", ["While", "During", "Since", "Until"], "While", "pendant que + phrase"),
          MC("Which is correct?", ["He's used to working at night.", "He's used to work at night.", "He use to working at night.", "He used to working at night."], "He's used to working at night.", "be used to + -ing = être habitué"),
          MC("« I'd better leave now » exprime :", ["un conseil que je me donne", "une préférence festive", "un regret", "une interdiction"], "un conseil que je me donne"),
          MC("Read: « The film wasn't as good as I expected. » — le film était…", ["moins bien que prévu", "meilleur que prévu", "exactement comme prévu", "annulé"], "moins bien que prévu"),
          MC("Pourquoi dit-on « some advice » et jamais « an advice » ?", ["advice est indénombrable", "advice est pluriel", "advice est féminin", "an est interdit devant un a"], "advice est indénombrable"),
          MC("« to get rid of » signifie :", ["se débarrasser de", "s'énerver contre", "se souvenir de", "prendre soin de"], "se débarrasser de"),
        ],
      },
      {
        title: "QCM difficiles II",
        exercises: [
          MC("« Hardly had I sat down when the phone rang » signifie :", ["À peine assis, le téléphone a sonné", "Je me suis assis difficilement", "Le téléphone a à peine sonné", "Je refusais de m'asseoir"], "À peine assis, le téléphone a sonné"),
          MC("« a white lie » est :", ["un pieux mensonge", "un mensonge énorme", "une vérité pure", "une page blanche"], "un pieux mensonge"),
          MC("« You needn't have come » implique :", ["tu es venu, mais ce n'était pas nécessaire", "tu n'es pas venu", "tu dois venir", "tu viendras peut-être"], "tu es venu, mais ce n'était pas nécessaire"),
          MC("Read: « He turned up out of the blue. » — il est arrivé…", ["à l'improviste", "déguisé en bleu", "en retard", "déprimé"], "à l'improviste"),
          MC("« the sooner, the better » :", ["le plus tôt sera le mieux", "tôt ou tard", "mieux vaut tard que jamais", "plus c'est long, mieux c'est"], "le plus tôt sera le mieux"),
          MC("« I'm broke » vs « it's broken » :", ["fauché / cassé", "cassé / fauché", "les deux : fauché", "les deux : cassé"], "fauché / cassé"),
          MC("« Would you mind opening the window? » — réponse qui ACCEPTE :", ["Not at all.", "Yes, I would.", "I mind.", "Never."], "Not at all.", "mind = est-ce que ça t'ennuie ?"),
        ],
      },
    ],
  },
  {
    cefrLevel: "B2",
    title: "Quiz B2",
    description: "Conditionnels, phrasal verbs et subtilités : trois paliers corsés.",
    lessons: [
      {
        title: "QCM faciles",
        exercises: [
          MC("« to carry out a plan » signifie :", ["exécuter un plan", "porter un plan", "annuler un plan", "dessiner un plan"], "exécuter un plan"),
          MC("« likely » veut dire :", ["probable", "sympathique", "semblable", "léger"], "probable"),
          MC("« to run out of milk » :", ["ne plus avoir de lait", "courir chercher du lait", "renverser du lait", "détester le lait"], "ne plus avoir de lait"),
          MC("« a drawback » est :", ["un inconvénient", "un retour", "un tiroir", "un avantage"], "un inconvénient"),
          MC("« to cope with » signifie :", ["faire face à", "copier", "couper avec", "collaborer"], "faire face à"),
          MC("« currently » veut dire :", ["actuellement", "couramment", "rapidement", "récemment"], "actuellement", "faux ami !"),
          MC("« to set up a company » :", ["créer une entreprise", "vendre une entreprise", "fermer une entreprise", "visiter une entreprise"], "créer une entreprise"),
        ],
      },
      {
        title: "QCM modérés",
        exercises: [
          MC("« If I ___ you, I would apologize. »", ["were", "was being", "am", "would be"], "were"),
          MC("« The project ___ by an external team. » (passif)", ["was carried out", "carried out", "was carrying out", "has carried"], "was carried out"),
          MC("Read: « The offer is too good to turn down. » — il faut…", ["accepter l'offre", "refuser l'offre", "négocier l'offre", "ignorer l'offre"], "accepter l'offre", "turn down = refuser"),
          MC("« by the time we arrived, the film ___ . »", ["had started", "started", "has started", "was starting"], "had started", "past perfect"),
          MC("« eventually » signifie :", ["finalement", "éventuellement", "rapidement", "peut-être"], "finalement", "faux ami !"),
          MC("« He denied ___ the money. »", ["stealing", "to steal", "steal", "stole"], "stealing", "deny + -ing"),
          MC("Quelle phrase est correcte ?", ["I look forward to seeing you.", "I look forward to see you.", "I'm looking forward see you.", "I look forward for seeing you."], "I look forward to seeing you."),
        ],
      },
      {
        title: "QCM difficiles",
        exercises: [
          MC("« No sooner ___ than it started to rain. »", ["had we left", "we had left", "we left", "did we left"], "had we left", "inversion après no sooner"),
          MC("« actual » signifie :", ["réel", "actuel", "récent", "précis"], "réel", "faux ami : actuel = current"),
          MC("« to make do with » :", ["se contenter de", "fabriquer avec", "faire avec plaisir", "réussir grâce à"], "se contenter de"),
          MC("Read: « The proposal fell through at the last minute. » — le projet…", ["a échoué", "a été signé", "a été reporté", "a été amélioré"], "a échoué", "fall through"),
          MC("« Were it not for your help, … » signifie :", ["Sans ton aide", "Grâce à ton aide", "Avec un peu d'aide", "Malgré ton aide"], "Sans ton aide", "inversion soutenue"),
          MC("« a foregone conclusion » est :", ["une issue courue d'avance", "une conclusion oubliée", "un malentendu", "une décision annulée"], "une issue courue d'avance"),
          MC("« He is said ___ very rich. »", ["to be", "being", "that he is", "be"], "to be", "structure passive de rumeur"),
        ],
      },
      {
        title: "QCM faciles II",
        exercises: [
          MC("« to postpone » :", ["reporter", "poster", "supposer", "imposer"], "reporter"),
          MC("« a deadline extension » est :", ["un délai supplémentaire", "une ligne plus longue", "une date d'embauche", "une prolongation de contrat"], "un délai supplémentaire"),
          MC("« reliable » signifie :", ["fiable", "relié", "lisible", "aimable"], "fiable"),
          MC("« to attend a meeting » :", ["assister à une réunion", "attendre une réunion", "organiser une réunion", "annuler une réunion"], "assister à une réunion", "faux ami !"),
          MC("« a skill » est :", ["une compétence", "un couteau", "une échelle", "un diplôme"], "une compétence"),
          MC("Le contraire de « to hire » :", ["to fire", "to higher", "to rent", "to retire"], "to fire"),
          MC("« overtime » signifie :", ["des heures supplémentaires", "le temps qui passe", "une pause", "un chronomètre"], "des heures supplémentaires"),
        ],
      },
      {
        title: "QCM modérés II",
        exercises: [
          MC("« The house ___ built in 1920. »", ["was", "has", "did", "is being"], "was", "passif au passé"),
          MC("« I'd rather you ___ smoke here. »", ["didn't", "don't", "won't", "not"], "didn't", "would rather + sujet + prétérit"),
          MC("« in spite of » se construit avec :", ["un nom (in spite of the rain)", "une phrase complète", "un verbe conjugué", "will"], "un nom (in spite of the rain)"),
          MC("Read: « Sales have picked up since January. » — les ventes…", ["repartent à la hausse", "ont chuté", "stagnent", "ont été suspendues"], "repartent à la hausse"),
          MC("« to look into a problem » :", ["examiner un problème", "regarder par la fenêtre", "ignorer un problème", "créer un problème"], "examiner un problème"),
          MC("« unlikely » signifie :", ["improbable", "antipathique", "malchanceux", "différent"], "improbable"),
          MC("« The sooner you start, ___ you'll finish. »", ["the earlier", "earlier", "the early", "more early"], "the earlier"),
        ],
      },
      {
        title: "QCM difficiles II",
        exercises: [
          MC("« Not only ___ late, but he also forgot the files. »", ["was he", "he was", "he is", "did he was"], "was he", "inversion après not only"),
          MC("« to take something with a pinch of salt » :", ["ne pas prendre au pied de la lettre", "assaisonner un plat", "critiquer durement", "accepter sans discuter"], "ne pas prendre au pied de la lettre"),
          MC("« He would have called if he ___ . »", ["had known", "knew", "would know", "has known"], "had known", "3e conditionnel"),
          MC("Read: « The CEO stepped down amid the scandal. » — le PDG…", ["a démissionné", "a été promu", "a nié", "a porté plainte"], "a démissionné"),
          MC("« a ballpark figure » est :", ["une estimation approximative", "un chiffre exact", "un score de baseball", "un budget sportif"], "une estimation approximative"),
          MC("« seldom » signifie :", ["rarement", "souvent", "seulement", "soudainement"], "rarement"),
          MC("« By this time next year, I ___ my studies. »", ["will have finished", "will finish", "finish", "am finishing"], "will have finished", "futur antérieur"),
        ],
      },
    ],
  },
  {
    cefrLevel: "C1",
    title: "Quiz C1",
    description: "Lexique fin, collocations et sous-entendus : le grand tri.",
    lessons: [
      {
        title: "QCM faciles",
        exercises: [
          MC("« reluctant » signifie :", ["réticent", "brillant", "reconnaissant", "détendu"], "réticent"),
          MC("« to endorse » veut dire :", ["approuver publiquement", "endormir", "endosser un manteau", "renverser"], "approuver publiquement"),
          MC("« thorough » signifie :", ["minutieux", "à travers", "brutal", "rapide"], "minutieux"),
          MC("« a setback » est :", ["un revers", "un retour en arrière", "un siège arrière", "un succès"], "un revers"),
          MC("« compelling » veut dire :", ["captivant / convaincant", "obligatoire", "compliqué", "complet"], "captivant / convaincant"),
          MC("« to undermine » signifie :", ["saper, fragiliser", "creuser une mine", "souligner", "renforcer"], "saper, fragiliser"),
          MC("« scarce » veut dire :", ["rare", "effrayant", "abondant", "cher"], "rare"),
        ],
      },
      {
        title: "QCM modérés",
        exercises: [
          MC("« She turned down the offer, ___ surprised everyone. »", ["which", "what", "that", "who"], "which", "relative de commentaire"),
          MC("Read: « His apology rang hollow. » — ses excuses semblaient…", ["peu sincères", "très émouvantes", "bruyantes", "tardives"], "peu sincères"),
          MC("« on the verge of » signifie :", ["au bord de", "à l'opposé de", "au sommet de", "à la place de"], "au bord de"),
          MC("La collocation correcte :", ["to draw a conclusion", "to pull a conclusion", "to drag a conclusion", "to push a conclusion"], "to draw a conclusion"),
          MC("« albeit » veut dire :", ["quoique", "en outre", "désormais", "notamment"], "quoique"),
          MC("« He is nothing if not thorough » signifie :", ["Il est extrêmement minutieux", "Il n'est pas minutieux", "Il n'est rien du tout", "Il est parfois minutieux"], "Il est extrêmement minutieux", "tournure emphatique"),
          MC("« a moot point » est :", ["un point discutable", "un point final", "un détail sans intérêt", "un argument décisif"], "un point discutable"),
        ],
      },
      {
        title: "QCM difficiles",
        exercises: [
          MC("« damning with faint praise » consiste à :", ["critiquer par un éloge tiède", "insulter ouvertement", "féliciter chaleureusement", "se taire poliment"], "critiquer par un éloge tiède"),
          MC("« Little did he know that… » signifie :", ["Il était loin de se douter que…", "Il savait peu de choses sur…", "Il connaissait à peine…", "Il refusait de savoir…"], "Il était loin de se douter que…"),
          MC("Read: « The report stopped short of naming names. » — le rapport…", ["n'a pas été jusqu'à citer des noms", "a cité tous les noms", "était trop court", "a été interrompu"], "n'a pas été jusqu'à citer des noms"),
          MC("« ostensibly » veut dire :", ["en apparence", "avec ostentation", "évidemment", "obstinément"], "en apparence"),
          MC("La nuance : « childish » vs « childlike » —", ["childish est péjoratif, childlike est positif", "les deux sont identiques", "childlike est péjoratif", "les deux sont péjoratifs"], "childish est péjoratif, childlike est positif"),
          MC("« to pay lip service to » :", ["soutenir en paroles seulement", "faire un compliment sincère", "embrasser", "payer en liquide"], "soutenir en paroles seulement"),
          MC("« a Pyrrhic victory » se dit d'une victoire :", ["trop coûteuse pour être fêtée", "écrasante", "obtenue par chance", "volée"], "trop coûteuse pour être fêtée"),
        ],
      },
      {
        title: "QCM faciles II",
        exercises: [
          MC("« to grasp a concept » :", ["saisir un concept", "attraper un objet", "inventer un concept", "rejeter une idée"], "saisir un concept"),
          MC("« noteworthy » signifie :", ["remarquable", "digne d'un cahier", "célèbre", "récent"], "remarquable"),
          MC("« to allege » :", ["alléguer, prétendre", "alléger", "élire", "allier"], "alléguer, prétendre"),
          MC("« a breakthrough » est :", ["une percée décisive", "une pause", "une panne", "une rupture amoureuse"], "une percée décisive"),
          MC("« deliberately » signifie :", ["délibérément", "avec délicatesse", "librement", "à voix haute"], "délibérément"),
          MC("« to withstand » :", ["résister à", "se retirer", "se tenir debout", "comprendre"], "résister à"),
          MC("« a shortcoming » est :", ["un défaut", "une arrivée imminente", "un raccourci", "une pénurie"], "un défaut"),
        ],
      },
      {
        title: "QCM modérés II",
        exercises: [
          MC("« for the sake of argument » signifie :", ["à titre d'hypothèse", "pour gagner le débat", "par esprit de contradiction", "sans raison"], "à titre d'hypothèse"),
          MC("« She all but confirmed the rumour » signifie :", ["elle l'a pratiquement confirmée", "elle l'a démentie", "elle a tout confirmé sauf ça", "elle a refusé de parler"], "elle l'a pratiquement confirmée"),
          MC("« a vested interest » est :", ["un intérêt personnel en jeu", "un investissement bancaire", "un gilet de sécurité", "une curiosité passagère"], "un intérêt personnel en jeu"),
          MC("Read: « His enthusiasm was infectious. » — son enthousiasme…", ["se communiquait aux autres", "était malsain", "rendait malade", "était feint"], "se communiquait aux autres"),
          MC("« to downplay » :", ["minimiser", "jouer doucement", "descendre", "déprimer"], "minimiser"),
          MC("« by and large » signifie :", ["dans l'ensemble", "de plus en plus", "au sens large", "côte à côte"], "dans l'ensemble"),
          MC("« a caveat » est :", ["une mise en garde", "une cave à vin", "un cheval", "un privilège"], "une mise en garde"),
        ],
      },
      {
        title: "QCM difficiles II",
        exercises: [
          MC("« He was economical with the truth » veut dire :", ["il a menti par omission", "il a dit toute la vérité", "il parle peu", "il est avare"], "il a menti par omission"),
          MC("« to split hairs » :", ["couper les cheveux en quatre", "se coiffer", "trancher un débat", "diviser une équipe"], "couper les cheveux en quatre"),
          MC("« tantamount to » signifie :", ["équivalent à", "opposé à", "supérieur à", "antérieur à"], "équivalent à"),
          MC("Read: « The minister gave a masterclass in evasion. » — le ministre…", ["a brillamment esquivé les questions", "a donné un cours magistral", "a démissionné avec éclat", "a répondu franchement"], "a brillamment esquivé les questions"),
          MC("« to court controversy » :", ["rechercher la polémique", "juger une affaire", "éviter le scandale", "faire la cour"], "rechercher la polémique"),
          MC("« an unmitigated disaster » est un désastre…", ["total, sans circonstances atténuantes", "évité de justesse", "naturel", "exagéré par les médias"], "total, sans circonstances atténuantes"),
          MC("« damning evidence » :", ["des preuves accablantes", "des preuves fragiles", "des preuves falsifiées", "des preuves religieuses"], "des preuves accablantes"),
        ],
      },
    ],
  },
  {
    cefrLevel: "C2",
    title: "Quiz C2",
    description: "Rhétorique, registres et pièges d'expert : le sommet du QCM.",
    lessons: [
      {
        title: "QCM faciles",
        exercises: [
          MC("« to elucidate » signifie :", ["élucider, clarifier", "éluder", "électrifier", "allonger"], "élucider, clarifier"),
          MC("« brevity » veut dire :", ["la brièveté", "la bravoure", "le brevet", "la brutalité"], "la brièveté"),
          MC("« quintessential » signifie :", ["typique par excellence", "cinquième", "essentiel mais rare", "précieux"], "typique par excellence"),
          MC("« to wield power » :", ["exercer le pouvoir", "vouloir le pouvoir", "abandonner le pouvoir", "partager le pouvoir"], "exercer le pouvoir"),
          MC("« an epiphany » est :", ["une révélation soudaine", "une fête religieuse uniquement", "une épidémie", "un discours final"], "une révélation soudaine"),
          MC("« terse » veut dire :", ["laconique", "tendre", "terne", "tordu"], "laconique"),
          MC("« to galvanize a crowd » :", ["électriser une foule", "disperser une foule", "compter une foule", "calmer une foule"], "électriser une foule"),
        ],
      },
      {
        title: "QCM modérés",
        exercises: [
          MC("Un « euphemism » sert à :", ["adoucir une réalité déplaisante", "exagérer un fait", "répéter une idée", "poser une question"], "adoucir une réalité déplaisante"),
          MC("« Reports of my death are greatly exaggerated » (Twain) est un exemple de :", ["understatement ironique", "hyperbole sincère", "métaphore filée", "anaphore"], "understatement ironique"),
          MC("« hitherto » signifie :", ["jusqu'ici", "désormais", "par conséquent", "au contraire"], "jusqu'ici"),
          MC("Read: « His prose verges on the baroque. » — son style est…", ["presque trop orné", "très sobre", "incompréhensible", "inachevé"], "presque trop orné"),
          MC("« to eschew obfuscation » signifie (avec ironie) :", ["éviter d'être obscur", "rechercher la complexité", "fuir les responsabilités", "mâcher ses mots"], "éviter d'être obscur"),
          MC("La différence « imply » / « infer » :", ["le locuteur implique, l'auditeur infère", "les deux sont identiques", "l'auditeur implique, le locuteur infère", "imply est plus poli"], "le locuteur implique, l'auditeur infère"),
          MC("« a tour de force » est :", ["un exploit magistral", "un voyage épuisant", "un coup de force", "une visite guidée"], "un exploit magistral"),
        ],
      },
      {
        title: "QCM difficiles",
        exercises: [
          MC("« I can resist everything except temptation » (Wilde) joue sur :", ["le paradoxe", "la litote", "l'anaphore", "l'allitération"], "le paradoxe"),
          MC("« mendacious » signifie :", ["mensonger", "mendiant", "menaçant", "méticuleux"], "mensonger"),
          MC("« to gild the lily » :", ["orner inutilement ce qui est déjà beau", "dorer un bijou", "cultiver des fleurs", "flatter un supérieur"], "orner inutilement ce qui est déjà beau"),
          MC("Read: « The senator's non-denial denial fooled no one. » — le sénateur a…", ["nié sans vraiment nier", "avoué clairement", "refusé de parler", "menti effrontément"], "nié sans vraiment nier"),
          MC("« perfidious » est un registre :", ["littéraire et péjoratif", "familier", "technique", "admiratif"], "littéraire et péjoratif"),
          MC("Le zeugme dans « She left in a taxi and in tears » repose sur :", ["un verbe reliant deux registres différents", "une répétition sonore", "une inversion", "une exagération"], "un verbe reliant deux registres différents"),
          MC("« sesquipedalian » désigne, avec ironie :", ["l'usage de mots très longs", "un animal à six pattes", "une phrase d'un mot et demi", "un discours d'une heure et demie"], "l'usage de mots très longs"),
        ],
      },
      {
        title: "QCM faciles II",
        exercises: [
          MC("« to ponder » :", ["méditer, réfléchir", "pondre", "peser un objet", "répondre"], "méditer, réfléchir"),
          MC("« candid » signifie :", ["franc, sincère", "naïf", "candidat", "sucré"], "franc, sincère", "faux ami : candide = naive"),
          MC("« a whim » est :", ["un caprice", "un murmure", "une roue", "un gémissement"], "un caprice"),
          MC("« to loathe » :", ["détester profondément", "se prélasser", "hésiter", "prêter"], "détester profondément"),
          MC("« scarcely » signifie :", ["à peine", "effrayamment", "précieusement", "sûrement"], "à peine"),
          MC("« a feat » est :", ["un exploit", "un pied", "une défaite", "une fête"], "un exploit"),
          MC("« astute » veut dire :", ["perspicace", "têtu", "malhonnête", "muet"], "perspicace"),
        ],
      },
      {
        title: "QCM modérés II",
        exercises: [
          MC("« a double entendre » est :", ["un sous-entendu grivois", "une double négation", "un malentendu", "une répétition"], "un sous-entendu grivois"),
          MC("« to wax lyrical about » :", ["s'enthousiasmer longuement sur", "cirer avec soin", "écrire des poèmes", "chanter faux"], "s'enthousiasmer longuement sur"),
          MC("« the elephant in the room » désigne :", ["le problème évident que tout le monde ignore", "un invité encombrant", "un meuble imposant", "une bonne surprise"], "le problème évident que tout le monde ignore"),
          MC("Read: « His retort was as swift as it was merciless. » — sa réplique était…", ["rapide et impitoyable", "lente mais gentille", "confuse", "préparée à l'avance"], "rapide et impitoyable"),
          MC("« He doesn't mince words » signifie :", ["il parle sans détour", "il parle la bouche pleine", "il cuisine bien", "il bégaie"], "il parle sans détour"),
          MC("« a portmanteau word » est :", ["un mot-valise (brunch, smog)", "un mot étranger", "un mot désuet", "un gros mot"], "un mot-valise (brunch, smog)"),
          MC("« hubris » désigne :", ["l'orgueil démesuré", "l'humilité", "la sagesse antique", "la peur du vide"], "l'orgueil démesuré"),
        ],
      },
      {
        title: "QCM difficiles II",
        exercises: [
          MC("« The lady doth protest too much » (Shakespeare) suggère :", ["qu'un déni excessif trahit le contraire", "qu'il faut protester davantage", "que la dame a raison", "qu'il faut se taire"], "qu'un déni excessif trahit le contraire"),
          MC("« weasel words » sont :", ["des mots vagues pour éviter de s'engager", "des compliments sournois", "des mots d'argot animalier", "des insultes déguisées"], "des mots vagues pour éviter de s'engager"),
          MC("« a shibboleth » est :", ["un marqueur linguistique d'appartenance", "un serpent biblique", "un discours confus", "une insulte ancienne"], "un marqueur linguistique d'appartenance"),
          MC("« Brevity is the soul of wit » est ironique dans Hamlet car :", ["Polonius le dit au milieu d'un discours interminable", "Hamlet déteste l'humour", "la phrase est très longue", "personne ne rit"], "Polonius le dit au milieu d'un discours interminable"),
          MC("Un « malapropism » est :", ["la confusion comique de mots proches", "un mal de tête", "une insulte élégante", "un accent régional"], "la confusion comique de mots proches"),
          MC("« apophasis » : « Je ne mentionnerai même pas ses échecs » consiste à :", ["mentionner en prétendant ne pas mentionner", "avouer son ignorance", "présenter des excuses", "répéter inutilement"], "mentionner en prétendant ne pas mentionner"),
          MC("Read: « The senator's non-denial denial fooled no one. » — le sénateur a…", ["nié sans vraiment nier", "avoué clairement", "refusé de parler", "convaincu tout le monde"], "nié sans vraiment nier"),
        ],
      },
    ],
  },
];

// ---------- Tests de fin de niveau (notés sur 20) ----------
// Un examen par niveau. Le réussir (score ≥ passScore %) débloque le niveau
// suivant. Les questions mélangent tous les types déjà pratiqués dans le niveau.
const EXAMS: ExamDef[] = [
  {
    cefrLevel: "A1",
    title: "Test de niveau A1",
    description: "Salutations, café, nombres, famille et déplacements. Réussis-le pour débloquer l'A2.",
    // Variations inédites : mêmes compétences que les leçons, phrases différentes.
    exercises: [
      TS("Bonsoir, comment allez-vous ?", "good evening how are you"),
      TS("Je voudrais un thé, s'il vous plaît.", "i would like a tea please", "i would like one tea please"),
      TS("Où est le musée ?", "where is the museum"),
      MC("« Where are you from? » — Que réponds-tu ?", ["I am from Italy.", "I am fine, thank you.", "I am hungry.", "I am late."], "I am from Italy."),
      MC("Quelle phrase est correcte ?", ["He is my father.", "He are my father.", "Him is my father.", "He my father is."], "He is my father."),
      MC("Emma has two dogs and three cats. How many pets does she have?", ["five", "four", "six", "three"], "five", "petit calcul en anglais"),
      MC("Il est 22 h, tu vas dormir. Tu dis :", ["Good night!", "Good morning!", "Good afternoon!", "Hello!"], "Good night!"),
      FB("Where ___ the toilets?", "are", "pluriel"),
      FB("I have two ___ and one sister.", "brothers", "frères"),
      WT("Ça coûte cinq dollars.", "it costs five dollars", "it is five dollars", "it's five dollars"),
      LT("I have a big family."),
      LT("The museum is on the left."),
    ],
  },
  {
    cefrLevel: "A2",
    title: "Test de niveau A2",
    description: "Voyage, achats, restaurant et grammaire de base. Réussis-le pour débloquer le B1.",
    // Variations inédites : mêmes compétences que les leçons, phrases différentes.
    exercises: [
      TS("Avez-vous une chambre de libre ?", "do you have a room available", "do you have a free room"),
      TS("Je cherche un pull bleu.", "i am looking for a blue sweater", "i'm looking for a blue sweater", "i am looking for a blue jumper"),
      TS("Le petit-déjeuner est-il compris ?", "is breakfast included"),
      MC("He ___ football every Saturday.", ["plays", "play", "playing", "played"], "plays", "présent simple, 3e personne"),
      MC("Last night, we ___ at a nice restaurant.", ["ate", "eat", "eaten", "eating"], "ate", "passé simple"),
      MC("À l'aéroport, « Your flight is cancelled » signifie :", ["Votre vol est annulé", "Votre vol est retardé", "Votre vol embarque", "Votre vol est complet"], "Votre vol est annulé"),
      MC("The shirt costs twenty dollars. You buy two. You pay:", ["forty dollars", "twenty dollars", "thirty dollars", "fifty dollars"], "forty dollars", "petit calcul"),
      FB("___ she speak Spanish?", "does", "question à la 3e personne"),
      FB("This hotel is very ___, only thirty euros a night!", "cheap", "pas cher"),
      WT("J'ai acheté deux billets hier.", "i bought two tickets yesterday"),
      LT("The fitting room is on the right."),
      LT("We arrived at the hotel at noon."),
    ],
  },
  {
    cefrLevel: "B1",
    title: "Test de niveau B1",
    description: "Loisirs, opinions, travail et vocabulaire courant. Réussis-le pour débloquer le B2.",
    // Variations inédites : mêmes compétences que les leçons, phrases différentes.
    exercises: [
      TS("Je joue au tennis deux fois par semaine.", "i play tennis twice a week"),
      TS("À mon avis, ce livre est meilleur que le film.", "in my opinion the book is better than the movie", "in my opinion the book is better than the film"),
      MC("« I'm fed up with this noise » signifie :", ["J'en ai marre de ce bruit", "J'adore ce bruit", "Je n'entends pas ce bruit", "Ce bruit m'endort"], "J'en ai marre de ce bruit"),
      MC("Which sentence is correct?", ["I have known her for ten years.", "I know her since ten years.", "I am knowing her for ten years.", "I have known her since ten years."], "I have known her for ten years."),
      MC("Un collègue propose une idée que tu trouves mauvaise. Réponse polie :", ["I'm not sure that would work, but let's discuss it.", "That's the worst idea ever.", "Whatever.", "You always have bad ideas."], "I'm not sure that would work, but let's discuss it."),
      MC("Read: « Sam can't afford this car. » — Sam…", ["n'a pas les moyens de l'acheter", "ne sait pas conduire", "déteste cette voiture", "vend cette voiture"], "n'a pas les moyens de l'acheter"),
      FB("I'm really looking forward ___ the weekend.", "to", "préposition"),
      FB("Could you ___ me a favour?", "do", "faire une faveur"),
      WT("Si tu es fatigué, va te coucher.", "if you are tired go to bed", "if you're tired go to bed"),
      WT("Elle m'a dit qu'elle arriverait en retard.", "she told me she would be late", "she told me that she would be late", "she said she would be late"),
      LT("He has worked abroad for several years."),
      LT("They promised to finish the project on time."),
    ],
  },
  {
    cefrLevel: "B2",
    title: "Test de niveau B2",
    description: "Désaccord, nuance, grammaire avancée et idiomes. Réussis-le pour débloquer le C1.",
    // Variations inédites : mêmes compétences que les leçons, phrases différentes.
    exercises: [
      TS("Si j'avais plus de temps, j'apprendrais le piano.", "if i had more time i would learn the piano", "if i had more time i would learn piano"),
      TS("D'un côté c'est risqué, de l'autre c'est prometteur.", "on the one hand it is risky on the other hand it is promising", "on the one hand it's risky on the other hand it's promising"),
      MC("If we ___ earlier, we would have caught the train.", ["had left", "left", "have left", "would leave"], "had left", "3e conditionnel"),
      MC("« to put off a meeting » signifie :", ["reporter une réunion", "annuler une réunion", "organiser une réunion", "écourter une réunion"], "reporter une réunion"),
      MC("Which sentence expresses the strongest doubt?", ["I highly doubt this plan will work.", "This plan might work.", "This plan could possibly work.", "I am sure this plan will work."], "I highly doubt this plan will work."),
      MC("Read: « The talks broke down after two hours. » — the negotiations…", ["failed", "succeeded", "were extended", "started late"], "failed"),
      FB("He has lived in Berlin ___ he was a child.", "since", "depuis + point de départ"),
      FB("___ the bad weather, the match went ahead.", "despite", "malgré"),
      WT("Tu aurais pu me prévenir.", "you could have warned me", "you could have told me"),
      WT("Plus on attend, pire ce sera.", "the longer we wait the worse it will be", "the more we wait the worse it will be"),
      LT("Scarcely had he arrived when the problems began."),
      LT("The proposal was rejected on financial grounds."),
    ],
  },
  {
    cefrLevel: "C1",
    title: "Test de niveau C1",
    description: "Ironie, registres et finesse lexicale. Réussis-le pour débloquer le C2.",
    // Variations inédites : mêmes compétences que les leçons, phrases différentes.
    exercises: [
      TS("Pour être honnête, ça ne s'est pas passé comme prévu.", "to be honest it did not go as planned", "to be honest it didn't go as planned"),
      TS("Quoi que tu décides, je te soutiendrai.", "whatever you decide i will support you"),
      MC("« a blessing in disguise » signifie :", ["un mal pour un bien", "une bénédiction religieuse", "un déguisement réussi", "une mauvaise surprise"], "un mal pour un bien"),
      MC("Which word means « impossible to deny »?", ["undeniable", "unreliable", "unbearable", "unavailable"], "undeniable"),
      MC("Le gâteau de ton ami est raté. Quelle réponse est ironique ?", ["Well, Gordon Ramsay must be trembling.", "This cake is not very good.", "I don't really like cakes.", "Maybe try another recipe."], "Well, Gordon Ramsay must be trembling."),
      MC("Read: « Her praise was faint at best. » — elle…", ["n'était guère enthousiaste", "était très enthousiaste", "criait fort", "refusait de parler"], "n'était guère enthousiaste"),
      FB("Her explanation only served to ___ the confusion.", "deepen", "aggraver", "increase", "worsen"),
      FB("The evidence was far from ___; nobody was convinced.", "conclusive", "concluant", "convincing"),
      WT("Aussi étrange que cela puisse paraître, il a raison.", "strange as it may seem he is right", "as strange as it may seem he is right"),
      RA("Mastering irony in a foreign language is no small feat. It demands an ear for tone, precise timing, and the delicate art of saying one thing while meaning quite another."),
      LT("His remarks were witty, if somewhat barbed."),
      LT("She handled the criticism with remarkable poise."),
    ],
  },
  {
    cefrLevel: "C2",
    title: "Test de niveau C2",
    description: "Éloquence, dictées d'expert et traduction littéraire. Le sommet du parcours.",
    // Variations inédites : mêmes compétences que les leçons, phrases différentes.
    exercises: [
      TS("La seule chose que nous devons craindre est la crainte elle-même.", "the only thing we have to fear is fear itself", "the only thing we must fear is fear itself"),
      TS("Ne demandez pas si c'est possible ; demandez comment le faire.", "do not ask if it is possible ask how to do it", "don't ask if it is possible ask how to do it"),
      MC("« to obfuscate » signifie :", ["obscurcir volontairement", "clarifier", "simplifier", "traduire"], "obscurcir volontairement"),
      MC("« a Pyrrhic victory » est :", ["une victoire trop coûteuse", "une victoire écrasante", "une victoire facile", "une défaite honorable"], "une victoire trop coûteuse"),
      MC("« She sells seashells by the seashore » est un exemple de :", ["allitération", "anaphore", "métaphore", "oxymore"], "allitération"),
      MC("Which sentence uses understatement (litote)?", ["The hurricane caused a bit of a mess.", "The hurricane destroyed absolutely everything!", "The hurricane was catastrophic.", "The hurricane was the worst in history."], "The hurricane caused a bit of a mess."),
      WT("C'est en forgeant qu'on devient forgeron.", "practice makes perfect", "practise makes perfect"),
      WT("Le pouvoir n'est rien sans la sagesse de s'en servir.", "power is nothing without the wisdom to use it"),
      RA("A truly great speech does not merely inform; it transforms. It takes the scattered hopes of a crowd and forges them into a single, unstoppable conviction."),
      LT("Brevity is the soul of wit."),
      LT("His eloquence, though understated, left a lasting impression."),
    ],
  },
];

// ---------- Cours théoriques (2-3 par niveau, sur les grands thèmes) ----------
const COURSES: CourseDef[] = [
  // ==================== A1 ====================
  {
    cefrLevel: "A1",
    title: "Saluer et se présenter",
    emoji: "👋",
    intro: "Les toutes premières phrases dont tu as besoin : dire bonjour au bon moment, te présenter et être poli.",
    sections: [
      {
        heading: "Les salutations selon le moment",
        body: "En anglais, le bonjour change avec l'heure de la journée. « Hello » et « Hi » marchent tout le temps ; les autres sont plus précis.",
        examples: [
          { en: "Hello! / Hi!", fr: "Bonjour ! / Salut ! (à toute heure)" },
          { en: "Good morning.", fr: "Bonjour (le matin, avant midi)" },
          { en: "Good afternoon.", fr: "Bonjour (l'après-midi)" },
          { en: "Good evening.", fr: "Bonsoir (en arrivant, le soir)" },
          { en: "Good night.", fr: "Bonne nuit (seulement pour se quitter ou aller dormir !)" },
        ],
        tip: "Piège : « Good night » ne veut pas dire bonsoir ! On l'utilise uniquement pour dire au revoir le soir ou avant de dormir.",
      },
      {
        heading: "Se présenter",
        body: "Deux façons simples de dire ton prénom, et les questions pour faire connaissance.",
        examples: [
          { en: "My name is Paul.", fr: "Je m'appelle Paul." },
          { en: "I am Paul. / I'm Paul.", fr: "Je suis Paul." },
          { en: "What's your name?", fr: "Comment t'appelles-tu ?" },
          { en: "Where are you from? — I am from France.", fr: "D'où viens-tu ? — Je viens de France." },
          { en: "Nice to meet you.", fr: "Enchanté(e)." },
        ],
        tip: "« I'm » est la contraction de « I am ». À l'oral, les anglophones utilisent presque toujours la contraction.",
      },
      {
        heading: "La politesse magique",
        body: "Quatre mots à connaître par cœur : ils rendent toutes tes phrases polies.",
        examples: [
          { en: "Please.", fr: "S'il te/vous plaît." },
          { en: "Thank you very much!", fr: "Merci beaucoup !" },
          { en: "You're welcome.", fr: "De rien. (la réponse à thank you)" },
          { en: "Excuse me… / Sorry!", fr: "Excusez-moi… (pour aborder) / Pardon ! (pour s'excuser)" },
        ],
        tip: "« Excuse me » sert à attirer l'attention AVANT (excuse me, where is…?). « Sorry » s'utilise APRÈS une maladresse.",
      },
    ],
  },
  {
    cefrLevel: "A1",
    title: "Être, avoir et les nombres",
    emoji: "🔢",
    intro: "Les deux verbes les plus importants de l'anglais, et les nombres pour compter, payer et donner ton âge.",
    sections: [
      {
        heading: "Le verbe « be » (être)",
        body: "Trois formes seulement au présent : am, are, is. C'est le verbe le plus utilisé de la langue.",
        examples: [
          { en: "I am happy.", fr: "Je suis content." },
          { en: "You are my friend. / We are late. / They are here.", fr: "Tu es mon ami. / Nous sommes en retard. / Ils sont là." },
          { en: "He is tall. / She is a doctor. / It is cold.", fr: "Il est grand. / Elle est médecin. / Il fait froid." },
        ],
      },
      {
        heading: "Le verbe « have » (avoir)",
        body: "« Have » pour tout le monde, sauf he/she/it qui prennent « has ».",
        examples: [
          { en: "I have two brothers.", fr: "J'ai deux frères." },
          { en: "She has a little sister.", fr: "Elle a une petite sœur." },
        ],
        tip: "Piège n°1 des francophones : l'âge se dit avec BE, pas have ! « J'ai 20 ans » = « I AM twenty (years old) », jamais « I have 20 years ».",
      },
      {
        heading: "Les nombres",
        body: "De 13 à 19, les nombres finissent en « -teen ». Les dizaines finissent en « -ty ». Attention à ne pas les confondre à l'oreille !",
        examples: [
          { en: "one, two, three, four, five, six, seven, eight, nine, ten", fr: "1 à 10" },
          { en: "eleven, twelve, thirteen, fourteen, fifteen…", fr: "11, 12, 13, 14, 15…" },
          { en: "twenty, thirty, forty, fifty… one hundred", fr: "20, 30, 40, 50… 100" },
          { en: "It costs twenty dollars.", fr: "Ça coûte vingt dollars." },
        ],
        tip: "« thirteen » (13) et « thirty » (30) se ressemblent : dans -teen, l'accent est sur la fin ; dans -ty, sur le début. Tends l'oreille !",
      },
      {
        heading: "La famille",
        examples: [
          { en: "mother / father — mum / dad", fr: "mère / père — maman / papa" },
          { en: "brother / sister", fr: "frère / sœur" },
          { en: "grandmother / grandfather", fr: "grand-mère / grand-père" },
          { en: "My father's name is John.", fr: "Mon père s'appelle John. (le 's marque la possession)" },
        ],
      },
    ],
  },
  {
    cefrLevel: "A1",
    title: "Se débrouiller partout",
    emoji: "🧭",
    intro: "Commander au café, demander ton chemin, prendre le train : les phrases de survie du voyageur débutant.",
    sections: [
      {
        heading: "Commander poliment",
        body: "« I would like » (je voudrais) est LA formule magique pour commander. Plus poli que « I want » (je veux).",
        examples: [
          { en: "I would like a coffee, please.", fr: "Je voudrais un café, s'il vous plaît." },
          { en: "Can I have some water, please?", fr: "Puis-je avoir de l'eau, s'il vous plaît ?" },
          { en: "How much is it?", fr: "Combien ça coûte ?" },
          { en: "The bill, please.", fr: "L'addition, s'il vous plaît." },
        ],
      },
      {
        heading: "Demander son chemin",
        body: "« Where is…? » au singulier, « Where are…? » au pluriel. Puis il faut comprendre la réponse !",
        examples: [
          { en: "Where is the train station?", fr: "Où est la gare ?" },
          { en: "Where are the toilets?", fr: "Où sont les toilettes ? (pluriel → are)" },
          { en: "Go straight ahead.", fr: "Allez tout droit." },
          { en: "Turn left. / Turn right.", fr: "Tournez à gauche. / Tournez à droite." },
          { en: "It's next to the supermarket.", fr: "C'est à côté du supermarché." },
        ],
      },
      {
        heading: "À la gare",
        examples: [
          { en: "A ticket to London, please.", fr: "Un billet POUR Londres (direction = to)" },
          { en: "What time does the train leave?", fr: "À quelle heure part le train ?" },
          { en: "Which platform is it?", fr: "C'est quel quai ?" },
          { en: "The train is late / delayed.", fr: "Le train est en retard / retardé." },
        ],
        tip: "Si tu ne comprends pas une réponse, ose : « Sorry, can you repeat, please? » (Pardon, pouvez-vous répéter ?). Ça marche partout.",
      },
    ],
  },
  // ==================== A2 ====================
  {
    cefrLevel: "A2",
    title: "Le présent simple",
    emoji: "⏰",
    intro: "Le temps des habitudes et des vérités générales — avec son fameux « -s » à la 3e personne et les questions en do/does.",
    sections: [
      {
        heading: "La règle d'or : le -s",
        body: "Au présent simple, le verbe ne change JAMAIS… sauf avec he, she, it : on ajoute un -s. C'est l'erreur n°1 mondiale en anglais.",
        examples: [
          { en: "I work. You work. We work. They work.", fr: "Le verbe reste identique…" },
          { en: "He works. She goes. It costs.", fr: "…mais he/she/it prennent un -s (go → goes)." },
          { en: "She goes to work every day.", fr: "Elle va au travail tous les jours." },
        ],
      },
      {
        heading: "Questions et négations : do / does",
        body: "Pour poser une question ou dire non, l'anglais utilise l'auxiliaire do (does pour he/she/it). Et le verbe perd alors son -s !",
        examples: [
          { en: "Do you like coffee?", fr: "Aimes-tu le café ?" },
          { en: "Does she speak English?", fr: "Parle-t-elle anglais ? (does + verbe SANS -s)" },
          { en: "I don't understand.", fr: "Je ne comprends pas." },
          { en: "She doesn't live here.", fr: "Elle n'habite pas ici." },
        ],
        tip: "Le -s ne peut être qu'à UN seul endroit : « Does she speakS » est impossible. Does a déjà pris le -s !",
      },
      {
        heading: "Les mots de fréquence",
        examples: [
          { en: "I always wake up at seven.", fr: "Je me réveille toujours à 7 h." },
          { en: "She usually goes running on Sundays.", fr: "Elle va généralement courir le dimanche." },
          { en: "We sometimes watch TV. / They never eat meat.", fr: "Parfois / jamais" },
        ],
      },
    ],
  },
  {
    cefrLevel: "A2",
    title: "Le passé simple (prétérit)",
    emoji: "🕰️",
    intro: "Pour raconter ce qui s'est passé hier : les verbes en -ed, les irréguliers incontournables et les questions avec did.",
    sections: [
      {
        heading: "Verbes réguliers : + ed",
        examples: [
          { en: "I watched a movie yesterday.", fr: "J'ai regardé un film hier. (watch → watched)" },
          { en: "They played football on Sunday.", fr: "Ils ont joué au foot dimanche." },
          { en: "We visited Rome last year.", fr: "Nous avons visité Rome l'année dernière." },
        ],
      },
      {
        heading: "Les irréguliers à connaître par cœur",
        body: "Les verbes les plus courants sont presque tous irréguliers. Voici les indispensables :",
        examples: [
          { en: "go → went / eat → ate / buy → bought", fr: "aller / manger / acheter" },
          { en: "see → saw / have → had / lose → lost", fr: "voir / avoir / perdre" },
          { en: "We went to a restaurant last night.", fr: "Nous sommes allés au restaurant hier soir." },
          { en: "She bought a new car last week.", fr: "Elle a acheté une nouvelle voiture la semaine dernière." },
        ],
      },
      {
        heading: "Questions et négations : did",
        body: "Comme do/does au présent, mais en une seule forme : did. Et le verbe revient à sa forme de base.",
        examples: [
          { en: "Did you see the match yesterday?", fr: "As-tu vu le match hier ? (did + see, pas saw !)" },
          { en: "I didn't go to the party.", fr: "Je ne suis pas allé à la fête." },
        ],
        tip: "Les marqueurs de temps du prétérit : yesterday, last night, last week, last year, two days ago… Dès que tu les vois, pense passé !",
      },
    ],
  },
  {
    cefrLevel: "A2",
    title: "Voyager et acheter",
    emoji: "✈️",
    intro: "Hôtel, aéroport, boutique, restaurant : le vocabulaire et les tournures pour te débrouiller en voyage.",
    sections: [
      {
        heading: "À l'hôtel",
        examples: [
          { en: "I have a reservation for two nights.", fr: "J'ai une réservation pour deux nuits." },
          { en: "Do you have a room available?", fr: "Avez-vous une chambre de libre ?" },
          { en: "Is breakfast included?", fr: "Le petit-déjeuner est-il compris ?" },
          { en: "What time is check-out?", fr: "À quelle heure faut-il libérer la chambre ?" },
        ],
      },
      {
        heading: "À l'aéroport",
        examples: [
          { en: "My flight is delayed / cancelled.", fr: "Mon vol est retardé / annulé." },
          { en: "Where is the boarding gate?", fr: "Où est la porte d'embarquement ?" },
          { en: "boarding pass / passport / luggage", fr: "carte d'embarquement / passeport / bagages" },
        ],
      },
      {
        heading: "Faire les boutiques",
        examples: [
          { en: "How much is this jacket?", fr: "Combien coûte cette veste ?" },
          { en: "Can I try it on?", fr: "Puis-je l'essayer ?" },
          { en: "Do you have a smaller / bigger size?", fr: "Avez-vous une taille plus petite / plus grande ?" },
          { en: "Can I pay by card?", fr: "Puis-je payer par carte ?" },
          { en: "It's too expensive.", fr: "C'est trop cher." },
        ],
        tip: "« Can I…? » est parfait partout. « Could I…? » est juste un cran plus poli. Les deux s'utilisent sans risque.",
      },
      {
        heading: "Au restaurant",
        examples: [
          { en: "A table for two, please.", fr: "Une table pour deux, s'il vous plaît." },
          { en: "I'll have the chicken.", fr: "Je vais prendre le poulet. (I'll have = formule de commande)" },
          { en: "It was delicious!", fr: "C'était délicieux !" },
          { en: "Could we have the bill, please?", fr: "Pourrions-nous avoir l'addition ?" },
        ],
      },
    ],
  },
  // ==================== B1 ====================
  {
    cefrLevel: "B1",
    title: "Le present perfect",
    emoji: "🌉",
    intro: "Le pont entre le passé et le présent : « have + participe passé ». LE temps que les francophones confondent avec le passé composé.",
    sections: [
      {
        heading: "Quand l'utiliser ?",
        body: "Le present perfect relie une action passée au moment présent : expérience de vie, action qui continue encore, ou résultat visible maintenant.",
        examples: [
          { en: "I have been to London three times.", fr: "Je suis allé à Londres trois fois. (expérience, on ne dit pas quand)" },
          { en: "She has lost her keys.", fr: "Elle a perdu ses clés. (résultat : elle ne les a toujours pas)" },
          { en: "I have lived here for ten years.", fr: "J'habite ici depuis dix ans. (et j'y habite encore !)" },
        ],
        tip: "Avec une date ou un moment précis (yesterday, last year, in 2020), c'est le prétérit, jamais le present perfect : « I saw him yesterday ».",
      },
      {
        heading: "for ou since ?",
        body: "Les deux se traduisent par « depuis », mais ils ne s'utilisent pas pareil : for + durée, since + point de départ.",
        examples: [
          { en: "I have known her for ten years.", fr: "for + une durée (dix ans)" },
          { en: "She has been working here since 2015.", fr: "since + un point de départ (2015)" },
          { en: "I have been learning English for two years.", fr: "La forme en -ing insiste sur la durée de l'activité." },
        ],
      },
      {
        heading: "Les petits mots du perfect",
        examples: [
          { en: "Have you ever been to Japan?", fr: "ever = déjà (dans une question)" },
          { en: "I have never eaten sushi.", fr: "never = jamais" },
          { en: "She has just left.", fr: "just = viens juste de" },
          { en: "I have already finished. / I haven't finished yet.", fr: "already = déjà / not yet = pas encore" },
        ],
      },
    ],
  },
  {
    cefrLevel: "B1",
    title: "Donner son opinion",
    emoji: "💬",
    intro: "Dire ce que tu penses, être d'accord ou pas — poliment — et éviter le piège du « I am agree ».",
    sections: [
      {
        heading: "Introduire son avis",
        examples: [
          { en: "In my opinion, the book is better than the film.", fr: "À mon avis, le livre est meilleur que le film." },
          { en: "I think / I believe you are right.", fr: "Je pense / je crois que tu as raison." },
          { en: "If you ask me, it's a great idea.", fr: "Si tu veux mon avis, c'est une super idée." },
        ],
      },
      {
        heading: "Être d'accord… ou pas",
        body: "« Agree » est un VERBE en anglais, pas un adjectif. On dit « I agree », jamais « I am agree ».",
        examples: [
          { en: "I agree with you.", fr: "Je suis d'accord avec toi. (agree = verbe !)" },
          { en: "I couldn't agree more.", fr: "Je suis tout à fait d'accord. (littéralement : impossible d'être plus d'accord)" },
          { en: "I disagree. / I don't agree.", fr: "Je ne suis pas d'accord." },
          { en: "I see your point, but I disagree.", fr: "Je comprends ton point de vue, mais je ne suis pas d'accord." },
        ],
        tip: "Piège classique : « je suis d'accord » se traduit par « I agree » (verbe), PAS « I am agree ». C'est l'erreur la plus fréquente au B1 !",
      },
      {
        heading: "Nuancer poliment",
        examples: [
          { en: "Really? I found it quite boring.", fr: "Ah bon ? Je l'ai trouvé plutôt ennuyeux. (désaccord doux)" },
          { en: "I'm not sure that would work, but let's discuss it.", fr: "Je ne suis pas sûr que ça marche, mais discutons-en." },
          { en: "It depends on how we use it.", fr: "Ça dépend de comment on l'utilise." },
        ],
      },
    ],
  },
  {
    cefrLevel: "B1",
    title: "Le monde du travail",
    emoji: "💼",
    intro: "Réussir un entretien d'embauche en anglais : parler de ton expérience, de tes qualités, et les tournures pièges.",
    sections: [
      {
        heading: "Parler de son expérience",
        examples: [
          { en: "I have three years of experience in marketing.", fr: "J'ai trois ans d'expérience en marketing. (experience IN)" },
          { en: "I have worked here for three years.", fr: "Je travaille ici depuis trois ans. (present perfect + for)" },
          { en: "I am available immediately.", fr: "Je suis disponible immédiatement." },
        ],
      },
      {
        heading: "Qualités et défauts",
        body: "« Strength » = point fort, « weakness » = point faible. À un entretien, un bon défaut est un défaut professionnel et honnête.",
        examples: [
          { en: "I am organized, motivated and reliable.", fr: "Je suis organisé, motivé et fiable." },
          { en: "I work well under pressure.", fr: "Je travaille bien sous pression." },
          { en: "I sometimes focus too much on details.", fr: "Je me concentre parfois trop sur les détails. (un « bon » défaut)" },
        ],
      },
      {
        heading: "Les tournures à maîtriser",
        examples: [
          { en: "I look forward to hearing from you.", fr: "Dans l'attente de votre réponse. (look forward to + -ING !)" },
          { en: "Could you call me back?", fr: "Pouvez-vous me rappeler ? (call back = rappeler)" },
          { en: "I am looking for a new challenge.", fr: "Je cherche un nouveau défi." },
        ],
        tip: "Après « look forward to », le verbe prend -ing : « I look forward to hearING from you ». Le « to » ici n'est pas celui de l'infinitif !",
      },
    ],
  },
  // ==================== B2 ====================
  {
    cefrLevel: "B2",
    title: "Les conditionnels",
    emoji: "🔮",
    intro: "Imaginer, rêver, regretter : les trois conditionnels anglais et leurs pièges (If I were, would have, Had I known…).",
    sections: [
      {
        heading: "1er conditionnel : le futur possible",
        body: "Si c'est réaliste : if + présent, puis will. Jamais de will juste après if !",
        examples: [
          { en: "If it rains tomorrow, we will stay at home.", fr: "S'il pleut demain, nous resterons à la maison." },
          { en: "If you are tired, go to bed.", fr: "Si tu es fatigué, va te coucher." },
        ],
      },
      {
        heading: "2e conditionnel : l'imaginaire",
        body: "Si c'est hypothétique ou irréel : if + prétérit, puis would. Et on dit « If I WERE » (pas was) dans un registre soigné.",
        examples: [
          { en: "If I were rich, I would travel the world.", fr: "Si j'étais riche, je voyagerais partout." },
          { en: "If I had more time, I would learn the piano.", fr: "Si j'avais plus de temps, j'apprendrais le piano." },
          { en: "I wish I were taller.", fr: "J'aimerais être plus grand. (même logique : were)" },
        ],
      },
      {
        heading: "3e conditionnel : le regret",
        body: "Pour parler de ce qui aurait pu se passer : if + had + participe, puis would have + participe.",
        examples: [
          { en: "If she had studied, she would have passed.", fr: "Si elle avait étudié, elle aurait réussi." },
          { en: "Had I known, I would have come.", fr: "Si j'avais su, je serais venu. (inversion élégante : Had I known = If I had known)" },
          { en: "I should have listened to you.", fr: "J'aurais dû t'écouter. (should have + participe = regret)" },
          { en: "You could have warned me.", fr: "Tu aurais pu me prévenir." },
        ],
        tip: "L'inversion « Had I known… », « Scarcely had he arrived… » est très prisée à l'écrit soutenu — et adorée des examens !",
      },
    ],
  },
  {
    cefrLevel: "B2",
    title: "Nuancer et connecter ses idées",
    emoji: "⚖️",
    intro: "Les connecteurs logiques et les adverbes de nuance qui font passer ton anglais du « correct » au « convaincant ».",
    sections: [
      {
        heading: "Les connecteurs de contraste",
        examples: [
          { en: "However, the results were disappointing.", fr: "Cependant… (contraste fort, en début de phrase)" },
          { en: "Nevertheless, we decided to continue.", fr: "Néanmoins…" },
          { en: "Despite the rain, the match went ahead.", fr: "Malgré + nom (despite the rain)" },
          { en: "Although it was late, we kept working.", fr: "Bien que + phrase (although it was late)" },
          { en: "On the one hand… on the other hand…", fr: "D'un côté… de l'autre…" },
        ],
        tip: "Despite + nom, although + sujet-verbe. « Despite it was raining » est faux ; « Despite the rain » ou « Although it was raining » sont justes.",
      },
      {
        heading: "Les connecteurs d'addition et de conséquence",
        examples: [
          { en: "Moreover, the price is reasonable.", fr: "De plus… (addition)" },
          { en: "Therefore, we must act now.", fr: "Par conséquent… (conséquence)" },
          { en: "Indeed, the results speak for themselves.", fr: "En effet… (confirmation)" },
        ],
      },
      {
        heading: "Doser ses propos",
        body: "Les adverbes de degré te permettent d'être précis : légèrement déçu n'est pas anéanti !",
        examples: [
          { en: "The results are somewhat disappointing.", fr: "…quelque peu décevants (léger)" },
          { en: "It's quite interesting. / rather difficult.", fr: "assez intéressant / plutôt difficile (moyen)" },
          { en: "I highly doubt this plan will work.", fr: "Je doute fort que… (fort)" },
          { en: "I agree with you up to a point.", fr: "Je suis d'accord jusqu'à un certain point." },
        ],
      },
    ],
  },
  {
    cefrLevel: "B2",
    title: "Phrasal verbs et idiomes essentiels",
    emoji: "🧩",
    intro: "Les verbes à particule et expressions que les anglophones utilisent en permanence — et qui changent tout le sens.",
    sections: [
      {
        heading: "Les phrasal verbs incontournables",
        body: "Un verbe + une particule = un sens souvent imprévisible. Il faut les apprendre comme des mots à part entière.",
        examples: [
          { en: "to give up", fr: "abandonner" },
          { en: "to put off a meeting", fr: "reporter une réunion" },
          { en: "to call off a meeting", fr: "annuler une réunion" },
          { en: "The talks broke down.", fr: "Les négociations ont échoué. (break down = échouer / tomber en panne)" },
          { en: "to call back", fr: "rappeler (au téléphone)" },
        ],
      },
      {
        heading: "Exprimer le ras-le-bol et le goût",
        examples: [
          { en: "I'm fed up with this noise!", fr: "J'en ai marre de ce bruit !" },
          { en: "I can't stand football.", fr: "Je déteste le football. (piège : rien à voir avec « être debout »)" },
          { en: "It's not my cup of tea.", fr: "Ce n'est pas à mon goût." },
        ],
      },
      {
        heading: "Idiomes courants",
        examples: [
          { en: "It's raining cats and dogs.", fr: "Il pleut des cordes." },
          { en: "That interview was a piece of cake.", fr: "Cet entretien était du gâteau (très facile)." },
          { en: "Sam is broke.", fr: "Sam est fauché (n'a plus d'argent)." },
          { en: "a blessing in disguise", fr: "un mal pour un bien" },
        ],
        tip: "Ne traduis jamais un idiome mot à mot : cherche l'équivalent. « Il pleut des cordes » ne se dit pas « it rains ropes » !",
      },
    ],
  },
  // ==================== C1 ====================
  {
    cefrLevel: "C1",
    title: "L'ironie et l'understatement",
    emoji: "🎭",
    intro: "L'humour britannique repose sur l'euphémisme : comprendre ce qui est VRAIMENT dit derrière la politesse apparente.",
    sections: [
      {
        heading: "L'understatement : dire moins pour dire plus",
        body: "Les Britanniques minimisent systématiquement. Un compliment peut se cacher dans une phrase négative, et une critique dévastatrice dans un mot neutre.",
        examples: [
          { en: "It's not entirely terrible.", fr: "= C'est plutôt bien ! (éloge déguisé)" },
          { en: "That could have gone better.", fr: "= C'était une catastrophe." },
          { en: "The hurricane caused a bit of a mess.", fr: "= L'ouragan a tout détruit. (litote)" },
          { en: "The show was interesting, to say the least.", fr: "« Interesting » est souvent… une critique polie." },
        ],
        tip: "Quand un Britannique dit « interesting » avec un léger temps d'arrêt, méfie-toi : c'est rarement un compliment.",
      },
      {
        heading: "Le sarcasme et ses marqueurs",
        examples: [
          { en: "Oh, brilliant. Just what we needed.", fr: "Oh, génial. Exactement ce qu'il nous fallait. (ironique)" },
          { en: "Well, that went swimmingly.", fr: "Eh bien, ça s'est passé à merveille. (après un fiasco)" },
          { en: "That's rich, coming from you.", fr: "C'est fort, venant de toi. (reproche ironique)" },
          { en: "Well, Gordon Ramsay must be trembling.", fr: "…après un plat raté : Gordon Ramsay doit trembler." },
        ],
      },
      {
        heading: "L'autodérision",
        body: "Se moquer de soi-même est une politesse sociale en anglais britannique : ça met tout le monde à l'aise.",
        examples: [
          { en: "Let's just say cooking isn't my strong suit.", fr: "Disons que la cuisine n'est pas mon point fort." },
          { en: "Honestly, it was a complete disaster, but we survived.", fr: "Honnêtement, c'était un désastre, mais on a survécu." },
        ],
      },
    ],
  },
  {
    cefrLevel: "C1",
    title: "Vocabulaire de précision",
    emoji: "🔬",
    intro: "Les mots rares qui font la différence au C1 : nuances exactes, collocations et registre soutenu.",
    sections: [
      {
        heading: "Adjectifs de précision",
        examples: [
          { en: "ubiquitous", fr: "omniprésent" },
          { en: "meticulous", fr: "minutieux" },
          { en: "convoluted", fr: "alambiqué, difficile à suivre" },
          { en: "evasive", fr: "fuyant, évasif" },
          { en: "undeniable", fr: "indéniable" },
        ],
      },
      {
        heading: "Verbes soutenus",
        examples: [
          { en: "to exacerbate a problem", fr: "aggraver un problème" },
          { en: "to distort the truth", fr: "déformer la vérité" },
          { en: "to deepen the confusion", fr: "aggraver la confusion" },
          { en: "to eschew violence", fr: "éviter délibérément la violence" },
        ],
      },
      {
        heading: "Les collocations qui sonnent juste",
        body: "Un mot juste dans la mauvaise combinaison sonne étranger. Ces paires vont ensemble naturellement :",
        examples: [
          { en: "The evidence was far from conclusive.", fr: "…loin d'être concluante." },
          { en: "Her praise was faint at best.", fr: "Ses éloges étaient tièdes, au mieux. (faint praise)" },
          { en: "a categorical denial", fr: "un démenti catégorique" },
          { en: "purely circumstantial evidence", fr: "des preuves purement indirectes" },
        ],
        tip: "Apprends les mots PAR PAIRES (faint praise, conclusive evidence…) plutôt qu'isolés : c'est le secret d'un anglais naturel.",
      },
    ],
  },
  // ==================== C2 ====================
  {
    cefrLevel: "C2",
    title: "L'art de la rhétorique",
    emoji: "🏛️",
    intro: "Les figures de style des grands discours : anaphore, chiasme, litote… et pourquoi elles fonctionnent.",
    sections: [
      {
        heading: "L'anaphore : répéter pour marteler",
        body: "Répéter les mêmes mots en début de phrases successives crée un rythme hypnotique. L'arme favorite de Churchill.",
        examples: [
          { en: "We shall fight on the beaches, we shall fight on the landing grounds, we shall fight in the fields.", fr: "Churchill, 1940 : « we shall fight » martelé." },
          { en: "We shall not flag or fail. We shall go on to the end.", fr: "Nous ne faiblirons ni n'échouerons." },
        ],
      },
      {
        heading: "Le chiasme : le miroir",
        body: "Inverser la structure de deux propositions crée un effet de miroir mémorable.",
        examples: [
          { en: "Ask not what your country can do for you; ask what you can do for your country.", fr: "Kennedy, 1961 : le chiasme le plus célèbre du XXe siècle." },
        ],
      },
      {
        heading: "Litote, allitération et question rhétorique",
        examples: [
          { en: "The hurricane caused a bit of a mess.", fr: "Litote : minimiser pour amplifier." },
          { en: "She sells seashells by the seashore.", fr: "Allitération : répétition de sons (ici les s/sh)." },
          { en: "How much longer must we wait for justice?", fr: "Question rhétorique : on n'attend pas de réponse." },
        ],
      },
      {
        heading: "Ce qui fait un grand discours",
        examples: [
          { en: "clarity of purpose, rhythm of delivery, unshakeable conviction", fr: "clarté du propos, rythme, conviction inébranlable" },
          { en: "Let us choose courage over comfort, and substance over spectacle.", fr: "Le parallélisme (X over Y, X over Y) rend la phrase citable." },
        ],
        tip: "Brevity is the soul of wit (« la brièveté est l'âme de l'esprit », Shakespeare) : les phrases courtes frappent plus fort.",
      },
    ],
  },
  {
    cefrLevel: "C2",
    title: "Traduire l'intraduisible",
    emoji: "🪄",
    intro: "Proverbes, idiomes et registres : traduire le SENS et non les mots, la compétence ultime du C2.",
    sections: [
      {
        heading: "Chercher l'équivalent, pas la traduction",
        body: "Chaque langue a ses images. Le traducteur expert remplace l'image française par l'image anglaise équivalente.",
        examples: [
          { en: "It's raining cats and dogs.", fr: "Il pleut des cordes. (chats et chiens ↔ cordes !)" },
          { en: "Practice makes perfect.", fr: "C'est en forgeant qu'on devient forgeron." },
          { en: "to feel blue", fr: "avoir le cafard" },
          { en: "a Pyrrhic victory", fr: "une victoire à la Pyrrhus (trop coûteuse)" },
        ],
      },
      {
        heading: "Le registre : dire la même chose autrement",
        body: "Un même message peut être familier, neutre ou soutenu. Le C2, c'est choisir le bon niveau selon le contexte.",
        examples: [
          { en: "to obfuscate = to make deliberately unclear", fr: "obscurcir volontairement (très soutenu)" },
          { en: "notwithstanding = despite", fr: "nonobstant = malgré (juridique/formel)" },
          { en: "The unprecedented circumstances necessitated a novel approach.", fr: "Registre soutenu : chaque mot est choisi." },
        ],
      },
      {
        heading: "Les maximes qui se méritent",
        examples: [
          { en: "Procrastination is the thief of time.", fr: "La procrastination est le voleur du temps." },
          { en: "Brevity is the soul of wit.", fr: "La brièveté est l'âme de l'esprit." },
          { en: "Power is nothing without the wisdom to use it.", fr: "Le pouvoir n'est rien sans la sagesse de s'en servir." },
        ],
        tip: "Un idiome bien placé vaut dix phrases correctes : c'est lui qui fait dire « on croirait un natif ».",
      },
    ],
  },
];

const BADGES = [
  { slug: "first_lesson", titleFr: "Premiers mots", descriptionFr: "Terminer sa première leçon", icon: "🎤", criteriaType: "LESSONS", criteriaValue: 1 },
  { slug: "lessons_5", titleFr: "Bavard", descriptionFr: "Terminer 5 leçons", icon: "🗣️", criteriaType: "LESSONS", criteriaValue: 5 },
  { slug: "lessons_10", titleFr: "Orateur", descriptionFr: "Terminer 10 leçons", icon: "🎙️", criteriaType: "LESSONS", criteriaValue: 10 },
  { slug: "streak_3", titleFr: "Échauffement", descriptionFr: "3 jours d'affilée", icon: "🔥", criteriaType: "STREAK", criteriaValue: 3 },
  { slug: "streak_7", titleFr: "En feu", descriptionFr: "7 jours d'affilée", icon: "☄️", criteriaType: "STREAK", criteriaValue: 7 },
  { slug: "xp_100", titleFr: "Centurion", descriptionFr: "Gagner 100 XP", icon: "⚡", criteriaType: "XP", criteriaValue: 100 },
  { slug: "xp_500", titleFr: "Dynamo", descriptionFr: "Gagner 500 XP", icon: "💫", criteriaType: "XP", criteriaValue: 500 },
  { slug: "perfect_lesson", titleFr: "Perfectionniste", descriptionFr: "Réussir une leçon avec 90%+ partout", icon: "💎", criteriaType: "PERFECT", criteriaValue: 1 },
  { slug: "unit_complete", titleFr: "Conquérant", descriptionFr: "Terminer une unité complète", icon: "🏆", criteriaType: "UNITS", criteriaValue: 1 },
];

async function main() {
  // Deux modes :
  // - Synchronisation (défaut) : upsert de tout le contenu — le nouveau contenu
  //   est créé, l'existant est mis à jour, et on ne touche JAMAIS aux comptes
  //   ni à la progression. Ajouter du contenu ne demande plus de FORCE_SEED.
  // - FORCE_SEED=1 : remise à zéro complète (efface la progression des joueurs).
  const existingUnits = await prisma.unit.count();
  if (existingUnits > 0 && process.env.FORCE_SEED) {
    console.log("FORCE_SEED=1 — recréation complète du contenu (la progression est effacée)…");
    await prisma.userBadge.deleteMany();
    await prisma.badge.deleteMany();
    await prisma.exerciseAttempt.deleteMany();
    await prisma.examResult.deleteMany();
    await prisma.lessonProgress.deleteMany();
    await prisma.exercise.deleteMany();
    await prisma.lesson.deleteMany();
    await prisma.exam.deleteMany();
    await prisma.unit.deleteMany();
    await prisma.course.deleteMany();
  } else if (existingUnits > 0) {
    console.log("Base déjà peuplée — synchronisation du contenu (comptes et progression conservés)…");
  }

  let created = 0;
  let updated = 0;
  const syncExercise = async (parent: { lessonId?: string; examId?: string }, sortOrder: number, ex: Ex) => {
    const data = { type: ex.type, content: JSON.stringify(ex), minScore: 55 };
    const existing = await prisma.exercise.findFirst({ where: { ...parent, sortOrder } });
    if (existing) {
      await prisma.exercise.update({ where: { id: existing.id }, data });
      updated++;
    } else {
      await prisma.exercise.create({ data: { ...parent, sortOrder, ...data } });
      created++;
    }
  };

  let unitOrder: Record<string, number> = {};
  for (const u of UNITS) {
    unitOrder[u.cefrLevel] = (unitOrder[u.cefrLevel] ?? 0) + 1;
    const unit = await prisma.unit.upsert({
      where: { cefrLevel_sortOrder: { cefrLevel: u.cefrLevel, sortOrder: unitOrder[u.cefrLevel] } },
      create: { cefrLevel: u.cefrLevel, title: u.title, description: u.description, sortOrder: unitOrder[u.cefrLevel] },
      update: { title: u.title, description: u.description },
    });
    let li = 0;
    for (const l of u.lessons) {
      li++;
      const lesson = await prisma.lesson.upsert({
        where: { unitId_sortOrder: { unitId: unit.id, sortOrder: li } },
        create: { unitId: unit.id, title: l.title, sortOrder: li, xpReward: l.xp ?? 15 },
        update: { title: l.title, xpReward: l.xp ?? 15 },
      });
      let ei = 0;
      for (const ex of byType(l.exercises)) {
        ei++;
        await syncExercise({ lessonId: lesson.id }, ei, ex);
      }
    }
  }

  let examOrder = 0;
  for (const e of EXAMS) {
    examOrder++;
    const exam = await prisma.exam.upsert({
      where: { cefrLevel: e.cefrLevel },
      create: {
        cefrLevel: e.cefrLevel,
        title: e.title,
        description: e.description,
        sortOrder: examOrder,
        xpReward: e.xp ?? 50,
        passScore: e.passScore ?? 60,
      },
      update: {
        title: e.title,
        description: e.description,
        sortOrder: examOrder,
        xpReward: e.xp ?? 50,
        passScore: e.passScore ?? 60,
      },
    });
    let ei = 0;
    for (const ex of byType(e.exercises)) {
      ei++;
      await syncExercise({ examId: exam.id }, ei, ex);
    }
  }

  let courseOrder: Record<string, number> = {};
  for (const c of COURSES) {
    courseOrder[c.cefrLevel] = (courseOrder[c.cefrLevel] ?? 0) + 1;
    const content = JSON.stringify({ emoji: c.emoji, intro: c.intro, sections: c.sections });
    await prisma.course.upsert({
      where: { cefrLevel_sortOrder: { cefrLevel: c.cefrLevel, sortOrder: courseOrder[c.cefrLevel] } },
      create: { cefrLevel: c.cefrLevel, title: c.title, sortOrder: courseOrder[c.cefrLevel], content },
      update: { title: c.title, content },
    });
  }

  for (const b of BADGES) {
    await prisma.badge.upsert({ where: { slug: b.slug }, create: b, update: { ...b } });
  }

  const lessonCount = UNITS.reduce((n, u) => n + u.lessons.length, 0);
  const exerciseCount =
    UNITS.reduce((n, u) => n + u.lessons.reduce((m, l) => m + l.exercises.length, 0), 0) +
    EXAMS.reduce((n, e) => n + e.exercises.length, 0);
  console.log(
    "Seed terminé :", UNITS.length, "unités,", lessonCount, "leçons,",
    EXAMS.length, "tests de niveau,", COURSES.length, "cours,", exerciseCount, "exercices",
    `(${created} exercices créés, ${updated} mis à jour).`
  );
}

main().finally(() => prisma.$disconnect());
