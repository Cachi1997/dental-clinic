// Lowercases the text and removes accents, so "Núñez" becomes "nunez".
// NFD splits each accented letter into the letter plus a separate accent mark,
// and the regular expression then drops the marks. The patients migration that
// added search_text fills existing rows with the same rule using translate().
export const normalizeForSearch = (text: string) =>
  text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
