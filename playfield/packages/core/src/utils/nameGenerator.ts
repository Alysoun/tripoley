import names from '../data/names.json';

interface NameGroup {
  surnames: string[];
  firstNames: string[];
  description: string;
}

const nameGroups: Record<string, NameGroup> = {
  general: {
    surnames: names.surnames.filter(
      (name) => !name.includes(' ') && !name.includes('-') && !name.includes("'")
    ),
    firstNames: names.firstNames,
    description: 'Common single-word names',
  },
  compound: {
    surnames: names.surnames.filter(
      (name) => name.startsWith('Mc') || name.startsWith('Mac') || name.startsWith("O'")
    ),
    firstNames: names.firstNames,
    description: 'Names with Western European compound patterns',
  },
};

export const generateName = generateRandomName;

export function generateRandomName(
  options: { useCompoundNames?: boolean } = {}
): string {
  const group = options.useCompoundNames ? nameGroups.compound : nameGroups.general;
  const firstName = group.firstNames[Math.floor(Math.random() * group.firstNames.length)];
  const lastName = group.surnames[Math.floor(Math.random() * group.surnames.length)];
  return `${firstName} ${lastName}`;
}

export function generateUniqueNames(
  count: number,
  options: { useCompoundNames?: boolean } = {}
): string[] {
  const uniqueNames = new Set<string>();
  const maxAttempts = count * 2;
  let attempts = 0;
  while (uniqueNames.size < count && attempts < maxAttempts) {
    uniqueNames.add(generateRandomName(options));
    attempts++;
  }
  return Array.from(uniqueNames);
}
