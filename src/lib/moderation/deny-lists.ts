/**
 * Curated deny-lists for name moderation Layer 1.
 * These are checked case-insensitively against normalized names.
 */

/**
 * Common profanity / slurs. This is not exhaustive — Layer 2 (OpenAI
 * moderation endpoint) catches what this misses. This list is intentionally
 * kept short and focused on the most common cases to minimize maintenance.
 */
export const PROFANITY: ReadonlySet<string> = new Set([
  // Racial slurs (abbreviated/hashed representations omitted — kept as
  // normalized lowercase full words for matching)
  "nigger", "nigga", "chink", "spic", "kike", "wetback", "gook",
  "beaner", "coon", "darkie", "jigaboo", "raghead", "towelhead",
  "cracker", "honky", "gringo",
  // Gendered slurs
  "bitch", "cunt", "whore", "slut",
  // Homophobic slurs
  "faggot", "fag", "dyke", "tranny",
  // General profanity that shouldn't be a display name
  "fuck", "shit", "asshole", "dickhead", "motherfucker",
  // Troll names
  "hitler", "adolf hitler", "osama bin laden", "bin laden",
]);

/**
 * Public figures — sitting/recent presidents, major candidates, and other
 * figures whose names on a donor wall could imply endorsement. This list
 * should be updated periodically. Matches are case-insensitive and trimmed.
 *
 * We check both full names and last names alone for very recognizable figures.
 */
export const PUBLIC_FIGURES: ReadonlySet<string> = new Set([
  // Presidents (living + recent)
  "donald trump", "trump",
  "joe biden", "biden",
  "barack obama", "obama",
  "george w bush", "george bush",
  "bill clinton", "clinton",
  "jimmy carter", "carter",
  // Vice Presidents (recent)
  "kamala harris", "harris",
  "mike pence", "pence",
  "jd vance", "vance",
  // 2024+ prominent candidates / political figures
  "ron desantis", "desantis",
  "nikki haley",
  "vivek ramaswamy",
  "robert f kennedy", "rfk",
  "bernie sanders",
  "elizabeth warren",
  "alexandria ocasio-cortez", "aoc",
  "ted cruz",
  "marco rubio",
  "mitch mcconnell",
  "nancy pelosi", "pelosi",
  "chuck schumer",
  "kevin mccarthy",
  "mike johnson",
  // Supreme Court justices
  "john roberts",
  "clarence thomas",
  "samuel alito",
  "sonia sotomayor",
  "elena kagan",
  "neil gorsuch",
  "brett kavanaugh",
  "amy coney barrett",
  "ketanji brown jackson",
  // Tech/media figures commonly used for trolling
  "elon musk", "musk",
  "mark zuckerberg", "zuckerberg",
  "jeff bezos", "bezos",
  "bill gates",
  // Foreign leaders
  "vladimir putin", "putin",
  "xi jinping",
  "kim jong un",
  "volodymyr zelensky", "zelensky",
  // Historical figures commonly trolled
  "adolf hitler",
  "joseph stalin", "stalin",
  "benito mussolini", "mussolini",
  "osama bin laden",
  "saddam hussein",
]);

/**
 * Patterns that indicate a name is actually a URL, email, handle, or
 * promotional content. Checked via regex rather than set membership.
 */
export const SPAM_PATTERNS: RegExp[] = [
  /https?:\/\//i,
  /www\./i,
  /\.com|\.org|\.net|\.io|\.co|\.gov/i,
  /@/,                        // email or social handle
  /#\w/,                      // hashtag
  /\.(jpg|png|gif|pdf)/i,     // file extensions
  /\b(buy|sell|discount|free|click|subscribe|promo)\b/i,
];
