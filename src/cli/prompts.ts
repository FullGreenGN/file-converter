import path from 'node:path';
import { readdirSync } from 'node:fs';
import { access } from 'node:fs/promises';
import { createInterface } from 'node:readline';
import { stdin as inputStream, stdout as outputStream } from 'node:process';
import inquirer from 'inquirer';
import { type ConverterDefinition } from '../converters/types.js';

export async function promptPathWithAutocomplete(message: string, defaultValue = ''): Promise<string> {
  const suggestions = collectPathSuggestions();
  const rl = createInterface({
    input: inputStream,
    output: outputStream,
    completer: (line: string) => {
      const normalized = line.trim().toLowerCase();
      const matches = suggestions.filter((candidate) => candidate.toLowerCase().includes(normalized)).slice(0, 10);
      return [matches.length > 0 ? matches : suggestions.slice(0, 10), line];
    },
  });

  try {
    const promptLabel = defaultValue ? `${message} (${defaultValue}): ` : `${message}: `;
    const answer = await new Promise<string>((resolve) => {
      rl.question(promptLabel, resolve);
    });
    const resolved = answer.trim() || defaultValue.trim();

    if (!resolved) {
      throw new Error(`Please provide a ${message.toLowerCase()}.`);
    }

    return resolved;
  } finally {
    rl.close();
  }
}

export async function promptOutputFormat(definition: ConverterDefinition): Promise<string> {
  const answers = (await inquirer.prompt([
    {
      type: 'list',
      name: 'format',
      message: 'Select output format:',
      choices: definition.outputFormats.map((format) => ({ name: format.toUpperCase(), value: format })),
    },
  ])) as { format: string };

  return answers.format;
}

export async function ensureFileExists(filePath: string): Promise<void> {
  try {
    await access(filePath);
  } catch {
    throw new Error(`Input file not found: ${filePath}`);
  }
}

function collectPathSuggestions(): string[] {
  const root = process.cwd();
  const maxResults = 200;
  const maxDepth = 4;
  const results = new Set<string>();

  walk(root, 0);
  return [...results].slice(0, maxResults);

  function walk(currentDir: string, depth: number): void {
    if (results.size >= maxResults || depth > maxDepth) {
      return;
    }

    let entries;
    try {
      entries = readdirSync(currentDir, { withFileTypes: true });
    } catch {
      return;
    }

    entries.sort((a, b) => a.name.localeCompare(b.name));
    for (const entry of entries) {
      if (results.size >= maxResults) {
        break;
      }

      if (shouldIgnorePath(entry.name)) {
        continue;
      }

      const fullPath = path.join(currentDir, entry.name);
      const relativePath = path.relative(root, fullPath) || entry.name;
      const candidate = entry.isDirectory() ? `${relativePath}${path.sep}` : relativePath;
      results.add(candidate);

      if (entry.isDirectory()) {
        walk(fullPath, depth + 1);
      }
    }
  }
}

function shouldIgnorePath(name: string): boolean {
  return name === 'node_modules' || name === '.git' || name === 'dist' || name.startsWith('.pnpm');
}

