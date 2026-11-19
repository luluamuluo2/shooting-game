import {setupCards} from './reward-preview-fixture.mjs';
import * as rules from '../../src/rules.js';
const f=setupCards();let clipped=[],total=0;for(const [width,height] of [[104,104],[240,140],[300,150]])for(let id=0;id<rules.SPELL_REWARD_START+rules.SPELL_REWARDS.length;id++){
 const c=f.document.createElement('canvas');Object.defineProperties(c,{clientWidth:{value:width},clientHeight:{value:height}});f.document.body.append(c);f.g.rewardPreviewPainter.mount([{...f.g.rewardPreviewDescriptor(id),canvas:c}]);
 for(const time of [0,275,550,825,1100]){f.step(time);const shapes=f.contexts.get(c).shapes;for(const path of shapes){for(const m of path.matchAll(/[ML](-?[\d.]+),(-?[\d.]+)/g)){const x=+m[1],y=+m[2];if(x<-.5||x>c.width+.5||y<-.5||y>c.height+.5){clipped.push({id,width,height,time,x,y});break;}}}total++;}
 f.g.rewardPreviewPainter.clear();c.remove();
}
console.log(JSON.stringify({total,clipped:clipped.slice(0,20),clipCount:clipped.length},null,2));f.dom.window.close();if(clipped.length)process.exitCode=1;
