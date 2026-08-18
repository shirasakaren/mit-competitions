// Auto-discovers every .lottie file dropped into src/assets/animations/ —
// new files the user adds later are picked up with no code changes needed.
// Keyed by filename (without extension) so callers reference a stable name.
const modules = import.meta.glob('/src/assets/animations/*.lottie', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>

function keyFor(path: string): string {
  const file = path.split('/').pop() ?? path
  return file.replace(/\.lottie$/, '')
}

export const ANIMATIONS: Record<string, string> = Object.fromEntries(
  Object.entries(modules).map(([path, url]) => [keyFor(path), url]),
)

// Semantic aliases so call sites read by intent, not by exact filename.
// Falls back gracefully (renders nothing) if a name isn't present yet.
export const ANIM = {
  aiThinking: ANIMATIONS['AI Star loader UI'],
  checkmark: ANIMATIONS['black checkmark'],
  cow: ANIMATIONS['Black Cow'],
  loader: ANIMATIONS['Black loader'],
  sparkle: ANIMATIONS['Black sparkle'],
  catFace: ANIMATIONS['Cat Face'],
  cat: ANIMATIONS['CAT'],
  cat2: ANIMATIONS['cat2333s'],
  crowPeople: ANIMATIONS['Crow People'],
  deleted: ANIMATIONS['Deleted'],
  done: ANIMATIONS['Done'],
  fingerprint: ANIMATIONS['fingerprint'],
  duck: ANIMATIONS['Floating Duck'],
  gears: ANIMATIONS['Gears'],
  graphStats: ANIMATIONS['Graph (Statistics) evaluation'],
  paymentSuccess: ANIMATIONS['Payment Success'],
  pieChart: ANIMATIONS['Pie Chart'],
  rocketLaunch: ANIMATIONS['Rocket launch'],
  rocket: ANIMATIONS['rocket'],
  welcome: ANIMATIONS['Welcome'],
  // batch 2
  error404: ANIMATIONS['404 error'],
  error404Alt: ANIMATIONS['Error 404'],
  astronaut: ANIMATIONS['Animated Astronaut'],
  applicant: ANIMATIONS['Applicant'],
  beatingHeart: ANIMATIONS['Beating Heart'],
  boxCubeLoader: ANIMATIONS['Box Cube Loader'],
  bunny: ANIMATIONS['bunny mascot'],
  catTyping: ANIMATIONS['Cat typing'],
  celebrations: ANIMATIONS['celebrations'],
  confettiFile: ANIMATIONS['Confetti file'],
  confetti: ANIMATIONS['Confetti'],
  curbYourAI: ANIMATIONS['Curb your AI'],
  diningTable: ANIMATIONS['dining table'],
  download: ANIMATIONS['Download icon'],
  empty: ANIMATIONS['empty'],
  filesSearching: ANIMATIONS['Files Searching'],
  flowerLoop: ANIMATIONS['Flower Loop'],
  greenMascot: ANIMATIONS['Green mascot'],
  hacker: ANIMATIONS['Hacker State Machine'],
  koala: ANIMATIONS['koala chat'],
  locations: ANIMATIONS['locations'],
  love: ANIMATIONS['Love'],
  mascot: ANIMATIONS['mascot'],
  musicNote: ANIMATIONS['Music Note'],
  processing: ANIMATIONS['Processing'],
  quiz: ANIMATIONS['quiz'],
  remixLoader: ANIMATIONS['Remix of loader'],
  sandyLoading: ANIMATIONS['Sandy Loading (Custom)'],
  searchingFile: ANIMATIONS['searching file'],
  searchingNotes: ANIMATIONS['Searching notes'],
  takeNote: ANIMATIONS['Take a note'],
  walkingTaco: ANIMATIONS['Walking taco'],
  warning: ANIMATIONS['Warning Alert Icon'],
  wumpus: ANIMATIONS['Wumpus Playing PC Game'],
} as const
