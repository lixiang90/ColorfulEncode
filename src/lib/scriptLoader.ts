import fs from 'fs';
import path from 'path';

export interface ScriptPreset {
  id: string;
  name: string;
  description: string;
  avatar: string;
  code: string;
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

  files.forEach(file => {
    if (file.endsWith('.py')) {
      const filePath = path.join(SCRIPTS_DIR, file);
      const content = fs.readFileSync(filePath, 'utf-8');
      const id = file.replace('.py', '');
      
      // Parse metadata from comments
      const nameMatch = content.match(/#\s*Name:\s*(.*)/);
      const descMatch = content.match(/#\s*Description:\s*(.*)/);
      const avatarMatch = content.match(/#\s*Avatar:\s*(.*)/);

      scripts[id] = {
        id,
        name: nameMatch ? nameMatch[1].trim() : id,
        description: descMatch ? descMatch[1].trim() : '',
        avatar: avatarMatch ? avatarMatch[1].trim() : '📜',
        code: content,
        isDefault: true
      };
    }
  });

  return scripts;
}
