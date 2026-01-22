const fs = require('fs');
const path = require('path');

const inputFile = path.join(__dirname, '../../Chat de WhatsApp con Yo nunca.txt');
const outputFile = path.join(__dirname, '../data/yonunca_data.json');

try {
    const data = fs.readFileSync(inputFile, 'utf8');
    const lines = data.split('\n');

    const statements = [];
    // Regex matches: "Number- Text" ignoring the timestamp/author part.
    // Explanation:
    // ^.*? - keys past timestamp/name part (lazy)
    // (\d+) - captures the ID
    // \s*-\s* - matches separator " - "
    // (.*)$ - captures the rest as text
    // Note: The file format seems to be: "date, time - User: ID- Text" OR just "ID- Text" for continuations?
    // Looking at the file, most are "User: Number- Text". Some are just "Number- Text".

    // We'll look for the pattern "Number-" or "Number -" anywhere in the line, but essentially we want the last occurrence if there are multiple numbers (unlikely), 
    // but really we want to capture the explicit "ID- Text" structure.

    // Let's iterate and try to match.
    const regex = /(?:^|:\s+?)(\d+)\s*-\s*(.+)$/;

    lines.forEach((line, index) => {
        const match = line.match(regex);
        if (match) {
            const id = parseInt(match[1], 10);
            const text = match[2].trim();
            statements.push({ id, text });
        }
    });

    // Remove duplicates based on ID? User said: "Obviamente, puede haber algún número que falte, o repetido, ... es gestionalo, pero por favor, no modifiques los yo nuncas."
    // I will keep them as is for now, but usually a Map by ID is better. 
    // However, if there are duplicate IDs with different text, we might lose one. 
    // User said "gestionalo" (handle it). 
    // Let's store them as a list. If we need to lookup by ID, we can search.

    console.log(`Parsed ${statements.length} statements.`);

    fs.writeFileSync(outputFile, JSON.stringify(statements, null, 2));
    console.log(`Saved to ${outputFile}`);

} catch (err) {
    console.error('Error parsing file:', err);
}
