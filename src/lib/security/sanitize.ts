const controlCharacters = /[\u0000-\u001F\u007F]/g;
const angleBrackets = /[<>]/g;

export function sanitizeText(value: string, maxLength: number) {
  return value.replace(controlCharacters, " ").replace(angleBrackets, "").trim().slice(0, maxLength);
}

export function sanitizeOptionalText(value: string | undefined, maxLength: number) {
  return value ? sanitizeText(value, maxLength) : undefined;
}

export function sanitizeTextArray(values: string[], maxLength = 40, maxItems = 12) {
  return values
    .map((value) => sanitizeText(value, maxLength))
    .filter(Boolean)
    .slice(0, maxItems);
}
