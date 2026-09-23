import fs from 'node:fs/promises';
for(const name of ['model.mjs','schema.mjs'])await fs.copyFile(name,`public/${name}`);
