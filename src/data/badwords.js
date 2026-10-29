// Cheap local pre-filter so most messages never need a Gemini call.
// This is intentionally a starter list — expand it as needed. It is not
// meant to catch everything; it exists purely to cut Gemini usage by
// skipping clearly-clean text and fast-flagging the obvious cases.
export const badwordPatterns = [
  /\bfuck(er|ing)?\b/i,
  /\bshit\b/i,
  /\bbitch\b/i,
  /\bnigg(a|er)\b/i,
  /\bcunt\b/i,
  /\bwhore\b/i,
  /\bslut\b/i,
  /\brape\b/i,
  /\bporn(hub|o)?\b/i,
  /\bxxx\b/i,
  /\bnude(s)?\b/i,
  /\bsex\s*(video|cam|chat)\b/i,
]

export function localFlag(text = '') {
  return badwordPatterns.some((re) => re.test(text))
}
