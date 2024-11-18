import names from '../data/names.json';

interface NameGroup {
    surnames: string[];
    firstNames: string[];
    description: string;
}

// Simplified approach focusing on common patterns rather than cultural mixing
const nameGroups: { [key: string]: NameGroup } = {
    general: {
        // Using most common names from Census/SSA data
        surnames: names.surnames.filter(name => 
            !name.includes(' ') && // Avoid compound surnames
            !name.includes('-') && // Avoid hyphenated names
            !name.includes("'")    // Avoid names with apostrophes
        ),
        firstNames: names.firstNames,
        description: "Common single-word names"
    },
    compound: {
        surnames: names.surnames.filter(name => 
            name.startsWith('Mc') || 
            name.startsWith('Mac') || 
            name.startsWith("O'")
        ),
        firstNames: names.firstNames,
        description: "Names with Western European compound patterns"
    }
};

export const generateName = generateRandomName;
export function generateRandomName(options: {
    useCompoundNames?: boolean;
} = {}): string {
    const group = options.useCompoundNames ? nameGroups.compound : nameGroups.general;
    
    const firstName = group.firstNames[Math.floor(Math.random() * group.firstNames.length)];
    const lastName = group.surnames[Math.floor(Math.random() * group.surnames.length)];
    
    return `${firstName} ${lastName}`;
}

// Optional: Generate multiple unique names
export function generateUniqueNames(count: number, options: {
    useCompoundNames?: boolean;
} = {}): string[] {
    const uniqueNames = new Set<string>();
    const maxAttempts = count * 2; // Prevent infinite loops
    let attempts = 0;

    while (uniqueNames.size < count && attempts < maxAttempts) {
        uniqueNames.add(generateRandomName(options));
        attempts++;
    }

    return Array.from(uniqueNames);
} 