/**
 * Sanitizes a string for use as a filename. Produces pure ASCII with no spaces:
 * strips diacritics (NFD + remove combining marks) and replaces any remaining
 * non-alphanumeric characters with dashes. This keeps the FileProvider content
 * URI clean so receiving apps resolve the filename correctly.
 */
export function sanitizeFileName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}
