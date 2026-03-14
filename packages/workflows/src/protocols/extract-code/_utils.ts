export function trimFirstSpaces(text: string) {
  const lines = text.split('\n');

  const indentations = lines
    .filter((line) => line.trim().length > 0)
    .map((line) => {
      const match = line.match(/^( *)/);
      return match ? match[1].length : 0;
    });

  const minIndent = indentations.length > 0 ? Math.min(...indentations) : 0;

  if (minIndent === 0) return text;

  const regex = new RegExp(`^ {${minIndent}}`, 'gm');
  return text.replace(regex, '');
}
