import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as rules from '../src/rules.js';
test('specified.md covers every weapon, enemy form, titan and plant with exact source fields',()=>{
 const text=fs.readFileSync(new URL('../specified.md',import.meta.url),'utf8');
 const rows=[...text.matchAll(/`(\{[^\n]+\})`/g)].map(m=>JSON.parse(m[1]));
 const configs=[...rules.WEAPONS,...rules.ENEMIES,rules.SMALL_SLIME_ENEMY,rules.SMALL_MAGMA_SLIME_ENEMY,...rules.TITANS,...rules.PLANTS];
 assert.equal(rows.length,configs.length);
 for(const c of configs){assert.deepEqual(rows.find(r=>c.id?r.id===c.id:r.name===c.name),c);assert.ok(text.includes(c.name));}
 for(const m of text.matchAll(/\]\(([^)]+)\)/g)){assert.ok(fs.existsSync(new URL('../'+m[1],import.meta.url)),m[1]);}
});
