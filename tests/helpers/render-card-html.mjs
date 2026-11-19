// Private, static layout review: same runtime DOM and CSS, recorded canvas paths as inline SVG images.
import fs from 'node:fs';
import {setupCards} from './reward-preview-fixture.mjs';
import * as rules from '../../src/rules.js';
const f=setupCards({staticMode:true});f.g.reset();f.g.openQuiz();const ids=[1,rules.PLANT_REWARD_START+rules.PLANTS.findIndex(p=>p.id==='cactus'),4+rules.GOLEMS.findIndex(p=>p.slime)];f.setCards(ids);
for(const canvas of f.document.querySelectorAll('.reward-preview canvas')){const img=f.document.createElement('img');const svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${canvas.width} ${canvas.height}">${f.contexts.get(canvas).shapes.join('')}</svg>`;img.src='data:image/svg+xml;base64,'+Buffer.from(svg).toString('base64');img.alt='';img.style.cssText='display:block;width:100%;height:100%;object-fit:contain';canvas.replaceWith(img);}
for(const el of f.document.querySelectorAll('script,link[rel="stylesheet"]'))el.remove();const style=f.document.createElement('style');style.textContent=fs.readFileSync(new URL('../../src/style.css',import.meta.url),'utf8')+'#world{background:linear-gradient(#a2cbd7,#779b69)}';f.document.head.append(style);const note=f.document.createElement('meta');note.name='description';note.content='QA-only static layout fixture, actual runtime DOM and projected game models; not an interactive build';f.document.head.append(note);
fs.writeFileSync(process.argv[2]||'/tmp/card-layout-review.html',f.dom.serialize());f.g.rewardPreviewPainter.clear();f.dom.window.close();
