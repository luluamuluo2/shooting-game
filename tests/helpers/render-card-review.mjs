// QA-only: record the real Canvas2D model paths into a review SVG, never shipped as a game route.
import fs from 'node:fs';
import {setupCards} from './reward-preview-fixture.mjs';
import * as rules from '../../src/rules.js';
const f=setupCards({reduced:true});
const groups=[
 [{id:1,label:'步枪'}, {id:rules.PLANT_REWARD_START+rules.PLANTS.findIndex(p=>p.id==='cactus'),label:'仙人掌'}, {id:4+rules.GOLEMS.findIndex(p=>p.slime),label:'粘液块傀儡'}],
 [{id:rules.SPELL_REWARDS.find(r=>r.spellKey==='fire-tornado'&&r.tier===1).id,label:'超级 · 雷暴火龙卷'}, {id:rules.SPELL_REWARDS.find(r=>r.spellKey==='blackhole'&&r.tier===2).id,label:'终极 · 末日黑洞'}, {id:3,label:'补充村民'}]
];
const out=['<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="610" viewBox="0 0 1080 610"><rect width="1080" height="610" fill="#f5f2e7"/><text x="30" y="35" font-family="sans-serif" font-size="21" fill="#243e3c">补给预览 · 实际 Canvas2D 几何投影记录（非 WebGL 截图）</text>'];
for(let row=0;row<groups.length;row++){
 const items=groups[row];f.setCards(items.map(x=>x.id));let i=0;for(const canvas of f.document.querySelectorAll('.reward-preview canvas')){
  const x=30+i*345,y=58+row*270,ctx=f.contexts.get(canvas);
  out.push(`<rect x="${x}" y="${y}" width="320" height="245" rx="12" fill="#e0ebda" stroke="#a9bba4"/><g transform="translate(${x+40},${y+12})">${ctx.shapes.join('')}</g><text x="${x+160}" y="${y+180}" text-anchor="middle" font-family="sans-serif" font-size="21" fill="#244a3d">${items[i].label}</text><text x="${x+160}" y="${y+214}" text-anchor="middle" font-family="sans-serif" font-size="17" fill="#244a3d">答对 ${items[i].id<3?1:items[i].id===3?2:3} 题</text>`);i++;
 }
}
out.push('</svg>');fs.writeFileSync(process.argv[2]||'/tmp/card-preview-review.svg',out.join('\n'));f.g.rewardPreviewPainter.clear();f.dom.window.close();
