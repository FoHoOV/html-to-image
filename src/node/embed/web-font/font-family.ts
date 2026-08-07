const GENERIC_FONT_FAMILIES = new Set([
  "cursive",
  "emoji",
  "fangsong",
  "fantasy",
  "math",
  "monospace",
  "sans-serif",
  "serif",
  "system-ui",
  "ui-monospace",
  "ui-rounded",
  "ui-sans-serif",
  "ui-serif",
]);

/**
 * Splits a `font-family` value on its top-level commas and adds each embeddable
 * family to `target`. Writes straight into the set rather than yielding, since
 * this runs once per node of the source tree.
 */
export function addUsedFontFamilies(value: string, target: Set<string>) {
  let quote = "";
  let start = 0;

  const addSlice = (end?: number) => {
    const family = normalizeUsedFontFamily(value.slice(start, end));
    if (family) {
      target.add(family);
    }
  };

  for (let index = 0; index < value.length; index += 1) {
    const character = value[index];
    if (character === "\\") {
      index += 1;
      continue;
    }
    if (quote) {
      if (character === quote) {
        quote = "";
      }
      continue;
    }
    if (character === '"' || character === "'") {
      quote = character;
      continue;
    }
    if (character === ",") {
      addSlice(index);
      start = index + 1;
    }
  }

  addSlice();
}

export function normalizeFontFamily(family: string) {
  const normalized = family.trim();
  const quote = normalized[0];
  const unquoted = isQuoted(normalized, quote)
    ? normalized.slice(1, -1)
    : normalized;

  return unquoted.trim().toLowerCase();
}

function normalizeUsedFontFamily(family: string) {
  const normalized = family.trim();
  const quote = normalized[0];
  const quoted = isQuoted(normalized, quote);
  const key = normalizeFontFamily(normalized);
  return !quoted && GENERIC_FONT_FAMILIES.has(key) ? "" : key;
}

function isQuoted(value: string, quote: string | undefined) {
  return (quote === '"' || quote === "'") && value[value.length - 1] === quote;
}
