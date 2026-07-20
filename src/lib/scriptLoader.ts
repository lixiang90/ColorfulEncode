import fs from 'fs';
import path from 'path';

export interface ScriptPreset {
  id: string;
  name: string;
  description: string;
  avatar: string;
  code: string;
  language: 'typescript' | 'python';
  isDefault?: boolean;
}

const SCRIPTS_DIR = path.join(process.cwd(), 'src', 'encode_scripts');

export function getScripts(): Record<string, ScriptPreset> {
  const scripts: Record<string, ScriptPreset> = {};

  if (!fs.existsSync(SCRIPTS_DIR)) {
    console.warn(`Scripts directory not found at ${SCRIPTS_DIR}`);
    return scripts;
  }

  const files = fs.readdirSync(SCRIPTS_DIR);

  // First pass: collect all .ts files (preferred)
  const tsFiles = files.filter(f => f.endsWith('.ts'));
  const pyFiles = files.filter(f => f.endsWith('.py'));

  // Track which base names already have a .ts version
  const tsBaseNames = new Set(tsFiles.map(f => f.replace('.ts', '')));

  // Load TypeScript scripts
  tsFiles.forEach(file => {
    const filePath = path.join(SCRIPTS_DIR, file);
    const content = fs.readFileSync(filePath, 'utf-8');
    const id = file.replace('.ts', '');

    // Parse metadata from // comments
    const nameMatch = content.match(/\/\/\s*Name:\s*(.*)/);
    const descMatch = content.match(/\/\/\s*Description:\s*(.*)/);
    const avatarMatch = content.match(/\/\/\s*Avatar:\s*(.*)/);

    scripts[id] = {
      id,
      name: nameMatch ? nameMatch[1].trim() : id,
      description: descMatch ? descMatch[1].trim() : '',
      avatar: avatarMatch ? avatarMatch[1].trim() : '📜',
      code: content,
      language: 'typescript',
      isDefault: true
    };
  });

  // Load Python scripts only if no .ts version exists
  pyFiles.forEach(file => {
    const id = file.replace('.py', '');
    if (tsBaseNames.has(id)) {
      // Skip: TypeScript version already exists
      return;
    }

    const filePath = path.join(SCRIPTS_DIR, file);
    const content = fs.readFileSync(filePath, 'utf-8');

    // Parse metadata from # comments
    const nameMatch = content.match(/#\s*Name:\s*(.*)/);
    const descMatch = content.match(/#\s*Description:\s*(.*)/);
    const avatarMatch = content.match(/#\s*Avatar:\s*(.*)/);

    scripts[id] = {
      id,
      name: nameMatch ? nameMatch[1].trim() : id,
      description: descMatch ? descMatch[1].trim() : '',
      avatar: avatarMatch ? avatarMatch[1].trim() : '📜',
      code: content,
      language: 'python',
      isDefault: true
    };
  });

  return scripts;
}
