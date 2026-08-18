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
} as const
