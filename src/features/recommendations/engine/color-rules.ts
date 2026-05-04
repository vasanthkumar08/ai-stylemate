const colorFamilies: Record<string, string[]> = {
  neutral: ["black", "white", "ivory", "cream", "gray", "grey", "charcoal", "navy", "denim", "beige", "tan"],
  blue: ["blue", "navy", "denim", "sky", "cobalt"],
  warm: ["red", "burgundy", "orange", "yellow", "camel", "brown", "rust"],
  cool: ["green", "olive", "teal", "mint", "purple", "lavender"],
  soft: ["pink", "blush", "cream", "ivory", "sage"]
};

const compatibleFamilies: Record<string, string[]> = {
  neutral: ["neutral", "blue", "warm", "cool", "soft"],
  blue: ["neutral", "blue", "cool", "soft"],
  warm: ["neutral", "warm", "soft"],
  cool: ["neutral", "blue", "cool", "soft"],
  soft: ["neutral", "blue", "cool", "warm", "soft"]
};

const neutralColors = colorFamilies.neutral ?? [];

function normalizeColor(color: string) {
  return color.toLowerCase().trim();
}

export function getColorFamily(color: string) {
  const normalized = normalizeColor(color);
  const match = Object.entries(colorFamilies).find(([, colors]) =>
    colors.some((familyColor) => normalized.includes(familyColor))
  );

  return match?.[0] ?? "neutral";
}

export function getColorCompatibilityScore(colors: string[]) {
  const uniqueColors = Array.from(new Set(colors.map(normalizeColor).filter(Boolean)));

  if (uniqueColors.length <= 1) {
    return 1;
  }

  const families = uniqueColors.map(getColorFamily);
  const incompatiblePairs = families.flatMap((family, index) =>
    families
      .slice(index + 1)
      .filter((otherFamily) => !compatibleFamilies[family]?.includes(otherFamily))
  );

  const tooManyStatementColors = uniqueColors.filter(
    (color) => !neutralColors.some((neutral) => color.includes(neutral))
  ).length > 2;

  return Math.max(0.25, 1 - incompatiblePairs.length * 0.18 - (tooManyStatementColors ? 0.15 : 0));
}

export function buildColorNotes(colors: string[]) {
  const uniqueColors = Array.from(new Set(colors.map(normalizeColor).filter(Boolean)));
  const score = getColorCompatibilityScore(uniqueColors);

  if (uniqueColors.length === 0) {
    return ["Add a clear color anchor to make the outfit feel intentional."];
  }

  if (score >= 0.9) {
    return [`The ${uniqueColors.join(", ")} palette is cohesive and easy to wear.`];
  }

  if (score >= 0.7) {
    return [`The colors work together; keep accessories simple to avoid visual noise.`];
  }

  return ["The colors are expressive, so anchor the outfit with a neutral shoe or accessory."];
}
