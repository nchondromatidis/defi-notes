export function trimFirstSpaces(text: string, trimCount: number) {
  const regex = new RegExp(`^ {${trimCount}}`, 'gm');
  return text.replace(regex, '');
}
