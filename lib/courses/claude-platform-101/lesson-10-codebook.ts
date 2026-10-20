// LESSON 10 (server only): a FICTIONAL "Demo Building Code" (DBC), big enough (~25k tokens) to show
// the cost of loading everything upfront. A few sections hold precise rules the sample questions ask about;
// the rest is generated filler. It is for the demo only: not a real building code.

export type CodeSection = { id: string; title: string; text: string };

const CHAPTERS = [
  "Administration", "Definitions", "Building Planning", "Foundations", "Stairs and Means of Egress",
  "Floors and Decks", "Fire and Smoke Safety", "Electrical", "Plumbing", "Energy Efficiency",
];

const TOPICS = [
  "Scope", "Permits", "Inspections", "Materials", "Loads", "Clearances", "Ventilation", "Anchorage",
  "Fastening", "Moisture control", "Accessibility", "Labeling",
];

// The sections the sample questions need. Values follow common residential practice, but this is a demo code.
const FIXED: Record<string, { title: string; text: string }> = {
  "DBC 5.3": {
    title: "Stair risers and treads",
    text:
      "Maximum riser height is 7 3/4 inches (196 mm). Minimum tread depth is 10 inches (254 mm), measured " +
      "horizontally between the vertical planes of the foremost projection of adjacent treads. Within any flight, the " +
      "greatest riser height shall not exceed the smallest by more than 3/8 inch. Minimum headroom over stairways is " +
      "6 feet 8 inches (2032 mm), measured vertically from the sloped line of the tread nosings.",
  },
  "DBC 5.4": {
    title: "Handrails",
    text:
      "Handrails are required on at least one side of each continuous run of treads with four or more risers. " +
      "Handrail height, measured vertically from the sloped plane adjoining the tread nosings, shall be not less than " +
      "34 inches (864 mm) and not more than 38 inches (965 mm). Handrails shall be continuous for the full length of the " +
      "flight and have a graspable circular cross-section of 1 1/4 to 2 inches in diameter.",
  },
  "DBC 6.6": {
    title: "Deck guards",
    text:
      "Guards are required along open-sided walking surfaces, including decks and porches, located more than 30 inches " +
      "(762 mm) measured vertically to the floor or grade below at any point within 36 inches horizontally. Required " +
      "guards shall be not less than 36 inches (914 mm) high. Openings in required guards shall not allow passage of a " +
      "sphere 4 inches (102 mm) in diameter.",
  },
  "DBC 7.2": {
    title: "Smoke alarms",
    text:
      "Smoke alarms shall be installed in each sleeping room, outside each separate sleeping area in the immediate " +
      "vicinity of the bedrooms, and on each additional story of the dwelling, including basements. Where more than one " +
      "smoke alarm is required, the alarms shall be interconnected so that activation of one alarm activates all alarms.",
  },
  "DBC 8.5": {
    title: "GFCI protection",
    text:
      "Ground-fault circuit-interrupter protection is required for all 125-volt, 15- and 20-ampere receptacles installed " +
      "in bathrooms, garages, outdoors, crawl spaces, unfinished basements, kitchens serving countertop surfaces, and " +
      "within 6 feet of the outside edge of a sink, bathtub or shower stall.",
  },
};

// Small deterministic random generator, so the book is identical on every run (important for caching!).
function rng(seed: number) {
  return () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32);
}

function filler(chapter: string, topic: string, rand: () => number): string {
  const pick = <T,>(xs: T[]) => xs[Math.floor(rand() * xs.length)];
  const n = () => Math.round(2 + rand() * 46);
  const sentences = [
    `This section applies to ${topic.toLowerCase()} for ${chapter.toLowerCase()} work in one- and two-family dwellings.`,
    `Work shall be ${pick(["inspected", "documented", "approved", "verified"])} before it is ${pick(["concealed", "enclosed", "occupied", "energized"])}.`,
    `Components shall maintain a minimum clearance of ${n()} inches from ${pick(["combustible materials", "adjacent structures", "finished grade", "openings"])}.`,
    `Where ${pick(["manufacturer instructions", "listed assemblies", "engineered designs"])} are more restrictive, they shall govern.`,
    `Fasteners shall be ${pick(["corrosion-resistant", "hot-dip galvanized", "stainless steel", "listed for the application"])} and spaced not more than ${n()} inches on center.`,
    `Records required by this section shall be kept for not less than ${Math.round(1 + rand() * 9)} years.`,
    `Alternative methods may be approved where they provide equivalent ${pick(["strength", "durability", "fire resistance", "safety"])}.`,
    `Damaged or deteriorated materials shall be replaced, not repaired, unless approved by the building official.`,
  ];
  return sentences.sort(() => rand() - 0.5).slice(0, 6).join(" ");
}

let cache: CodeSection[] | null = null;

export function codeBook(): CodeSection[] {
  if (cache) return cache;
  const rand = rng(42);
  const sections: CodeSection[] = [];
  CHAPTERS.forEach((chapter, ci) => {
    TOPICS.forEach((topic, ti) => {
      const id = `DBC ${ci + 1}.${ti + 1}`;
      const fixed = FIXED[id];
      sections.push(fixed ? { id, ...fixed } : { id, title: `${chapter}: ${topic}`, text: filler(chapter, topic, rand) });
    });
  });
  return (cache = sections);
}

export function codeBookText(): string {
  return codeBook().map((s) => `## ${s.id} ${s.title}\n${s.text}`).join("\n\n");
}

// Tools for the just-in-time version: search titles/text, then look up one section.
export function searchCode(query: string): string {
  const words = query.toLowerCase().split(/\W+/).filter((w) => w.length > 2);
  const scored = codeBook()
    .map((s) => {
      const title = s.title.toLowerCase();
      const text = s.text.toLowerCase();
      return { s, score: words.reduce((n, w) => n + (title.includes(w) ? 3 : 0) + (text.includes(w) ? 1 : 0), 0) };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);
  if (scored.length === 0) return "No matching sections.";
  return scored.map((x) => `${x.s.id}: ${x.s.title}`).join("\n");
}

export function lookupCode(section: string): string {
  const id = section.trim().toUpperCase().replace(/^(DBC)?\s*/, "DBC ");
  const found = codeBook().find((s) => s.id === id);
  if (!found) throw new Error(`No section "${section}". Use search_building_code to find section ids like "DBC 5.3".`);
  return `${found.id} ${found.title}\n${found.text}`;
}
