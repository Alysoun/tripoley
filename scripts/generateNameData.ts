import nodeFetch from 'node-fetch';
import * as fs from 'fs/promises';
import * as path from 'path';
import { parse, Parser, CsvError } from 'csv-parse';
import { createReadStream } from 'fs';
import AdmZip from 'adm-zip';

interface NameEntry {
    name: string;
    rank: number;
    count: number;
    gender?: 'M' | 'F';
}

// Type for our diverse names structure
interface DiverseNames {
    firstNames: string[];
    lastNames: string[];
}

function properCapitalization(name: string): string {
    // First clean and normalize the name
    const cleanName = name.trim()
        .replace(/"/g, '')
        .toLowerCase();
    
    // Common Spanish/Portuguese/French/Italian compound patterns
    const compounds = [
        { pattern: 'dela', replacement: 'De La ' },
        { pattern: 'del', replacement: 'Del ' },
        { pattern: 'de la', replacement: 'De La ' },
        { pattern: 'mc', replacement: 'Mc' },
        { pattern: 'mac', replacement: 'Mac' },
        { pattern: "o'", replacement: "O'" },
        { pattern: "d'", replacement: "D'" },
        { pattern: 'van', replacement: 'Van ' },
        { pattern: 'von', replacement: 'Von ' },
        { pattern: 'san', replacement: 'San ' },
        { pattern: 'santa', replacement: 'Santa ' },
        { pattern: 'st', replacement: 'St. ' },
    ];

    // Special cases that should remain as-is
    const preserveNames = [
        'de la o',
        'de la paz',
        'de la y',
    ];

    if (preserveNames.includes(cleanName)) {
        return cleanName.split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    }

    // Check compound patterns in order (longest first to avoid partial matches)
    for (const {pattern, replacement} of compounds.sort((a, b) => b.pattern.length - a.pattern.length)) {
        if (cleanName.startsWith(pattern)) {
            const restOfName = cleanName.slice(pattern.length);
            if (replacement.endsWith(' ')) {
                return replacement + restOfName.charAt(0).toUpperCase() + restOfName.slice(1);
            } else {
                return replacement + restOfName.charAt(0).toUpperCase() + restOfName.slice(1);
            }
        }
    }

    // Default case: just capitalize first letter
    return cleanName.charAt(0).toUpperCase() + cleanName.slice(1);
}

// Helper function to parse CSV data
function parseCSV(input: string, options: any = { delimiter: ',' }): Promise<string[][]> {
    return new Promise((resolve, reject) => {
        parse(input, {
            ...options,
            skip_empty_lines: true
        }, (error: CsvError | undefined, data: string[][]) => {
            if (error) reject(error);
            else resolve(data);
        });
    });
}

async function fetchCensusSurnames(): Promise<string[]> {
    console.log('Reading Census surname data from local file...');
    try {
        const data = await fs.readFile(path.resolve(__dirname, '../src/data/surnames.csv'), 'utf-8');
        
        const lines = data.split('\n')
            .filter(line => line.trim().length > 0)
            .slice(1);

        const surnames = lines
            .map(line => {
                const [name] = line.split(',');
                return properCapitalization(name);
            })
            .filter(name => name.length > 0)
            .slice(0, 10000);

        console.log(`Successfully read ${surnames.length} surnames from local file`);
        console.log('Sample surnames:', surnames.slice(0, 5));
        
        return surnames;
    } catch (error) {
        console.error('Error reading Census surnames from local file:', error);
        return [];
    }
}

async function fetchSSANames(): Promise<NameEntry[]> {
    console.log('Reading SSA first name data from local file...');
    try {
        const data = await fs.readFile(path.resolve(__dirname, '../src/data/first-names.json'), 'utf-8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error reading SSA names from local file:', error);
        return [];
    }
}

// Our existing diverse names
const diverseNames: DiverseNames = {
    firstNames: [
        "Ming", "Wei", "Jin", "Hui", "Xiao", "Yuki", "Hiroshi", "Kenji", "Sakura", "Hana"
    ],
    lastNames: [
        "Wang", "Li", "Zhang", "Chen", "Liu", "Tanaka", "Sato", "Suzuki", "Kim", "Park"
    ]
};

async function generateNameData(): Promise<void> {
    try {
        // Create data directory if it doesn't exist
        await fs.mkdir(path.resolve(__dirname, '../src/data'), { recursive: true });

        // Fetch and process data
        const surnames = await fetchCensusSurnames();
        console.log(`Fetched ${surnames.length} surnames`);
        
        const firstNames = await fetchSSANames();
        console.log(`Fetched ${firstNames.length} first names`);

        // Combine with diverse names
        const combinedData = {
            surnames: [...surnames, ...diverseNames.lastNames],
            firstNames: [...firstNames.map(n => n.name), ...diverseNames.firstNames]
        };

        // Log some stats
        console.log('Final data stats:');
        console.log(`Total surnames: ${combinedData.surnames.length}`);
        console.log(`Total first names: ${combinedData.firstNames.length}`);

        // Write to JSON file
        const outputPath = path.resolve(__dirname, '../src/data/names.json');
        await fs.writeFile(
            outputPath,
            JSON.stringify(combinedData, null, 2)
        );

        console.log(`Name data generated successfully! Saved to ${outputPath}`);
    } catch (error) {
        console.error('Error generating name data:', error);
    }
}

generateNameData(); 