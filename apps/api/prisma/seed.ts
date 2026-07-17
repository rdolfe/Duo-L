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
          TS("Bonsoir.", "good evening"),
          RP("Vous croisez un voisin dans la rue.", "Tom", "Hi! How are you?",
            "I am fine, thank you.", "Not bad, and you?"),
        ],
      },
      {
        title: "Se présenter",
        exercises: [
          LR("My name is Anna.", "Je m'appelle Anna."),
          TS("Je m'appelle Paul.", "my name is paul", "i am paul", "i'm paul"),
          LR("Nice to meet you.", "Enchanté."),
          RP("Vous rencontrez une collègue pour la première fois.", "Sarah", "Hello, I'm Sarah. What's your name?",
            "My name is Alex, nice to meet you.", "I am Alex, how are you?"),
        ],
      },
      {
        title: "La politesse",
        exercises: [
          LR("Please.", "S'il vous plaît."),
          LR("Thank you very much.", "Merci beaucoup."),
          TS("Excusez-moi.", "excuse me", "sorry"),
          RA("Hello! Thank you very much for your help. You are very kind. Have a nice day!"),
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
          TS("Un thé, s'il vous plaît.", "a tea please", "one tea please", "a cup of tea please"),
          RP("Le serveur prend votre commande.", "Waiter", "Good morning! What can I get you?",
            "I would like a coffee, please.", "A tea and a croissant, please."),
          LR("How much is it?", "Combien ça coûte ?"),
        ],
      },
      {
        title: "Les nombres",
        exercises: [
          LR("One, two, three, four, five.", "Un, deux, trois, quatre, cinq."),
          TS("J'ai deux frères.", "i have two brothers"),
          LR("It costs ten dollars.", "Ça coûte dix dollars."),
          RA("I have three cats and two dogs. My sister has one bird. We have six animals at home."),
        ],
      },
      {
        title: "La famille",
        exercises: [
          LR("This is my mother.", "Voici ma mère."),
          TS("Mon père s'appelle John.", "my father's name is john", "my father is called john", "my dad's name is john"),
          LR("I have a little sister.", "J'ai une petite sœur."),
          RP("Un ami regarde une photo de famille.", "Emma", "Who is this on the photo?",
            "This is my mother and my father.", "This is my little sister."),
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
          TS("Où est la gare ?", "where is the train station", "where is the station"),
          TS("Où sont les toilettes ?", "where are the toilets", "where is the bathroom", "where is the restroom"),
          RP("Vous êtes perdu dans la rue.", "Passerby", "You look lost. Can I help you?",
            "Yes, where is the train station?", "Yes, I am looking for the museum."),
        ],
      },
      {
        title: "À la gare",
        exercises: [
          LR("A ticket to London, please.", "Un billet pour Londres, s'il vous plaît."),
          TS("Le train part à quelle heure ?", "what time does the train leave", "when does the train leave"),
          RP("Au guichet de la gare.", "Agent", "Good morning, where would you like to go?",
            "A ticket to London, please.", "I would like to go to Paris."),
          RA("The train to London leaves at nine. It arrives at eleven. The ticket costs twenty pounds."),
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
          TS("Je voudrais une chambre avec vue.", "i would like a room with a view", "i want a room with a view"),
          RP("À la réception de l'hôtel.", "Receptionist", "Welcome! Do you have a reservation?",
            "Yes, I have a reservation for two nights.", "No, do you have a room available?"),
          LR("What time is breakfast served?", "À quelle heure le petit-déjeuner est-il servi ?"),
        ],
      },
      {
        title: "À l'aéroport",
        exercises: [
          LR("My flight is delayed.", "Mon vol est retardé."),
          TS("Où est la porte d'embarquement ?", "where is the boarding gate", "where is the gate"),
          RP("Au comptoir d'enregistrement.", "Agent", "Can I see your passport, please?",
            "Of course, here it is.", "Yes, one moment please."),
          RA("My flight leaves at seven in the morning. I need to be at the airport two hours early. I always check my passport twice."),
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
          TS("Combien coûte cette veste ?", "how much is this jacket", "how much does this jacket cost"),
          RP("Dans une boutique de vêtements.", "Seller", "Hello, can I help you find something?",
            "Yes, I am looking for a black jacket.", "No thank you, I am just looking."),
          LR("Can I pay by card?", "Puis-je payer par carte ?"),
        ],
      },
      {
        title: "Au restaurant",
        exercises: [
          LR("A table for two, please.", "Une table pour deux, s'il vous plaît."),
          TS("Je vais prendre le poulet.", "i will have the chicken", "i'll have the chicken", "i will take the chicken"),
          RP("Le serveur revient à votre table.", "Waiter", "How was everything tonight?",
            "It was delicious, thank you.", "Very good, can we have the bill please?"),
          RA("Last night we went to a small Italian restaurant. I ordered pasta and my friend chose the fish. The food was delicious and not too expensive."),
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
          TS("Je fais du sport trois fois par semaine.", "i play sports three times a week", "i do sports three times a week", "i exercise three times a week"),
          RP("Une discussion entre amis.", "Mike", "What do you usually do on weekends?",
            "I usually go hiking with my friends.", "I like to stay home and read books."),
          RA("I have been playing the guitar for five years. At first it was difficult, but now I really enjoy it. Music helps me relax after a long day at work."),
        ],
      },
      {
        title: "Donner son opinion",
        exercises: [
          LR("In my opinion, this movie is overrated.", "À mon avis, ce film est surestimé."),
          TS("Je pense que tu as raison.", "i think you are right", "i think you're right"),
          RP("Un débat sur les réseaux sociaux.", "Julia", "Do you think social media is good for society?",
            "In my opinion, it depends on how we use it.", "I believe it has more disadvantages than benefits."),
          LR("I see your point, but I disagree.", "Je comprends ton point de vue, mais je ne suis pas d'accord."),
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
          TS("Pourquoi voulez-vous travailler ici ?", "why do you want to work here"),
          RP("Face au recruteur.", "Recruiter", "Tell me about your greatest strength.",
            "I am very organized and I learn quickly.", "I work well under pressure and in a team."),
          RA("Thank you for this opportunity. I believe my experience matches this position perfectly. I am motivated, reliable, and I look forward to joining your team."),
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
          TS("Ce n'est pas aussi simple que ça en a l'air.", "it is not as simple as it seems", "it's not as simple as it looks", "it is not as simple as it looks"),
          RP("Une réunion houleuse au bureau.", "Colleague", "I think we should cut the research budget entirely.",
            "I see your point, however that would hurt us in the long run.", "With all due respect, I strongly disagree with that approach."),
          RA("While I understand the appeal of this proposal, we must consider its long-term consequences. Cutting costs today could seriously undermine our competitiveness tomorrow."),
        ],
      },
      {
        title: "Argumenter avec nuance",
        exercises: [
          LR("On the one hand it saves money, on the other hand it increases risk.", "D'un côté ça économise de l'argent, de l'autre ça augmente le risque."),
          TS("Tout bien considéré, je pense que cela en vaut la peine.", "all things considered i think it is worth it", "all things considered i think it's worth it"),
          RA("The evidence suggests that remote work increases productivity for most employees. Nevertheless, it may weaken team cohesion over time, which is precisely why a hybrid approach deserves serious consideration."),
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
          TS("C'est la meilleure idée que j'aie jamais entendue... ou pas.", "that is the best idea i have ever heard or not", "that's the best idea i've ever heard or not"),
          RP("Après une présentation catastrophique.", "Coworker", "So, how do you think the presentation went?",
            "Let's just say it could have gone better.", "Honestly, it was a complete disaster, but we survived."),
          RA("British humour relies heavily on understatement and self-deprecation. Saying that something is not entirely terrible might actually be high praise, whereas calling it interesting could well be devastating criticism."),
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
          TS("Ce n'est pas la fin, ce n'est même pas le commencement de la fin.", "this is not the end it is not even the beginning of the end", "it is not the end it is not even the beginning of the end"),
          RA("Ladies and gentlemen, we stand today at a crossroads. The choices we make in the coming months will echo for generations. Let us therefore choose courage over comfort, and substance over spectacle."),
          RA("Throughout history, the most enduring speeches have shared three qualities: clarity of purpose, rhythm of delivery, and an unshakeable conviction that words, wielded wisely, can change the world."),
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
          MC("She ___ to work every day.", ["goes", "go", "going", "gone"], "goes", "3e personne du singulier"),
          FB("They ___ football on Sundays.", "play", "verbe « jouer »"),
          WT("Il mange une pomme.", "he eats an apple", "he is eating an apple"),
          LT("I usually wake up at seven o'clock."),
        ],
      },
      {
        title: "Questions et négations",
        exercises: [
          MC("Comment dit-on « Je ne comprends pas » ?", ["I don't understand", "I don't understood", "I not understand", "I no understand"], "I don't understand"),
          FB("___ you like coffee?", "do", "auxiliaire des questions"),
          LT("Where do you live?"),
          TS("Est-ce que tu parles anglais ?", "do you speak english"),
        ],
      },
      {
        title: "Le passé simple",
        exercises: [
          MC("Yesterday, I ___ a great movie.", ["watched", "watch", "watching", "watches"], "watched", "action terminée hier"),
          FB("I ___ my keys this morning.", "lost", "perdre, au passé", "forgot"),
          WT("Nous sommes allés au restaurant hier soir.", "we went to the restaurant last night", "we went to a restaurant last night", "we went to the restaurant yesterday evening"),
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
          FB("Can I ___ your phone for a minute?", "borrow", "emprunter", "use"),
          WT("Je cherche un appartement près du centre-ville.", "i am looking for an apartment near the city center", "i'm looking for an apartment near the city centre", "i am looking for a flat near the city center"),
        ],
      },
      {
        title: "Dictée intermédiaire",
        exercises: [
          LT("If it rains tomorrow, we will stay at home."),
          LT("I have been learning English for two years."),
          LR("She said she would call me back.", "Elle a dit qu'elle me rappellerait."),
          RA("Learning a language is like building a house. You need strong foundations, patience, and daily practice. Every new word is another brick in the wall."),
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
          MC("If I ___ rich, I would travel the world.", ["were", "was", "am", "be"], "were", "conditionnel irréel"),
          FB("She has been working here ___ 2015.", "since", "« depuis » + date précise"),
          MC("Que signifie « to give up » ?", ["abandonner", "donner", "monter", "offrir"], "abandonner"),
          WT("J'aurais dû t'écouter.", "i should have listened to you"),
        ],
      },
      {
        title: "Dictée soutenue",
        exercises: [
          LT("Despite the heavy rain, the ceremony went ahead as planned."),
          LT("Had I known about the meeting, I would have attended."),
          LR("The report must be submitted by Friday at the latest.", "Le rapport doit être rendu vendredi au plus tard."),
          RA("Negotiating effectively requires more than fluent speech. One must listen carefully, anticipate objections, and respond with both precision and tact, especially when the stakes are high."),
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
          FB("The politician was accused of ___ the truth.", "distorting", "déformer", "twisting", "bending"),
          WT("Quoi qu'il arrive, nous devons rester objectifs.", "whatever happens we must remain objective", "no matter what happens we must remain objective", "whatever happens we have to stay objective"),
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
          LT("The unprecedented circumstances necessitated an entirely novel approach."),
          LT("Notwithstanding the committee's reservations, the proposal was unanimously approved."),
          MC("« to eschew » signifie :", ["éviter délibérément", "mâcher", "poursuivre", "saluer"], "éviter délibérément"),
          RA("Peter Piper picked a peck of pickled peppers. She sells seashells by the seashore. How much wood would a woodchuck chuck if a woodchuck could chuck wood?"),
        ],
      },
      {
        title: "Traduction magistrale",
        exercises: [
          WT("La procrastination est le voleur du temps.", "procrastination is the thief of time"),
          MC("Choisis la tournure la plus idiomatique pour « Il pleut des cordes » :", ["It's raining cats and dogs", "It rains ropes", "It's raining strings", "Water is falling hard"], "It's raining cats and dogs"),
          LT("Eloquence is the art of saying the right thing at the right moment."),
          RA("True mastery of a foreign language reveals itself not in flawless grammar, but in the effortless dance between wit, nuance, and timing that native speakers perform without a second thought."),
        ],
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
  // En production, ne jamais écraser une base déjà peuplée (ça effacerait la
  // progression des joueurs). Relancer avec FORCE_SEED=1 pour tout recréer.
  const existing = await prisma.unit.count();
  if (existing > 0 && !process.env.FORCE_SEED) {
    console.log("Base déjà peuplée (" + existing + " unités) — seed ignoré. FORCE_SEED=1 pour forcer.");
    return;
  }
  await prisma.userBadge.deleteMany();
  await prisma.badge.deleteMany();
  await prisma.exerciseAttempt.deleteMany();
  await prisma.lessonProgress.deleteMany();
  await prisma.exercise.deleteMany();
  await prisma.lesson.deleteMany();
  await prisma.unit.deleteMany();

  let unitOrder: Record<string, number> = {};
  for (const u of UNITS) {
    unitOrder[u.cefrLevel] = (unitOrder[u.cefrLevel] ?? 0) + 1;
    const unit = await prisma.unit.create({
      data: { cefrLevel: u.cefrLevel, title: u.title, description: u.description, sortOrder: unitOrder[u.cefrLevel] },
    });
    let li = 0;
    for (const l of u.lessons) {
      li++;
      const lesson = await prisma.lesson.create({
        data: { unitId: unit.id, title: l.title, sortOrder: li, xpReward: l.xp ?? 15 },
      });
      let ei = 0;
      for (const ex of l.exercises) {
        ei++;
        await prisma.exercise.create({
          data: { lessonId: lesson.id, type: ex.type, sortOrder: ei, content: JSON.stringify(ex), minScore: 55 },
        });
      }
    }
  }

  for (const b of BADGES) {
    await prisma.badge.create({ data: b });
  }

  console.log("Seed terminé :", UNITS.length, "unités,", UNITS.reduce((n, u) => n + u.lessons.length, 0), "leçons.");
}

main().finally(() => prisma.$disconnect());
