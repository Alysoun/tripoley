import nodeFetch from 'node-fetch';
import * as fs from 'fs/promises';
import * as path from 'path';
import AdmZip from 'adm-zip';
import { parse, CsvError } from 'csv-parse';

interface NameEntry {
    name: string;
    rank: number;
    count: number;
    gender?: 'M' | 'F';
}

async function downloadAndSaveSSANames(): Promise<void> {
    console.log('Downloading SSA first name data...');
    try {
        // Fetch the ZIP file
        const response = await nodeFetch('https://www.ssa.gov/oact/babynames/names.zip');
        const buffer = await response.buffer();
        const zip = new AdmZip(buffer);
        
        // Get the most recent year's file
        const nameFile = zip.getEntries().find(entry => entry.entryName.startsWith('yob2022'));
        if (!nameFile) {
            throw new Error('Could not find name data in ZIP file');
        }

        const data = nameFile.getData().toString('utf8');
        
        // Parse the CSV data
        const names: NameEntry[] = await new Promise((resolve, reject) => {
            parse(data, {
                skip_empty_lines: true
            }, (error: CsvError | undefined, records: string[][]) => {
                if (error) reject(error);
                else {
                    const entries = records.map((row, index) => ({
                        name: row[0],
                        gender: row[1] as 'M' | 'F',
                        count: parseInt(row[2], 10),
                        rank: index + 1
                    }));
                    resolve(entries);
                }
            });
        });

        // Take top 10,000 names
        const topNames = names.slice(0, 10000);

        // Save to file
        const outputPath = path.resolve(__dirname, '../src/data/first-names.json');
        await fs.writeFile(
            outputPath,
            JSON.stringify(topNames, null, 2)
        );

        console.log(`Successfully downloaded and saved ${topNames.length} first names to ${outputPath}`);
    } catch (error) {
        console.error('Error downloading SSA names:', error);
    }
}

downloadAndSaveSSANames(); 