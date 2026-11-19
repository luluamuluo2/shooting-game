import test from 'node:test';
import assert from 'node:assert/strict';
import * as rules from '../src/rules.js';
import {setupCards} from './helpers/reward-preview-fixture.mjs';
test('actual card canvases mount after reset and reroll, cease on choice, and never replay on next question',()=>{
 const f=setupCards(),{g,document:d}=f;g.reset();g.openQuiz();assert.equal(d.querySelectorAll('.preview-ready').length,3);assert.equal(f.frames.size,1);const old=[...d.querySelectorAll('.reward-preview canvas')];assert.equal(g.rerollSupplies(),true);assert.equal(d.querySelectorAll('.preview-ready').length,3);assert.ok(!d.querySelector('#question-cards').textContent.includes('普通补给'));assert.equal(f.frames.size,1);assert.ok(old.every(c=>!c.isConnected));
 const id=g.offers.find(i=>i>=4);g.selectQuestion(id);assert.equal(f.frames.size,0);assert.equal(d.querySelectorAll('.reward-preview').length,0);g.answer(g.questions[id].answer);f.flush();assert.equal(d.querySelectorAll('.reward-preview').length,0);assert.equal(f.frames.size,0);
 g.reset();g.openQuiz();assert.equal(d.querySelectorAll('.preview-ready').length,3);Object.defineProperty(d,'hidden',{configurable:true,value:true});d.dispatchEvent(new f.dom.window.Event('visibilitychange'));assert.equal(f.frames.size,0);
});
test('every reward has visible real geometry, pure factories and no combat or random side effects',()=>{
 const f=setupCards({reduced:true}),{g,document:d}=f;g.reset();const before=g.captureSave();let calls=0;f.run('Math.random=()=>{throw new Error("preview used combat RNG")}');
 for(let i=0;i<rules.SPELL_REWARD_START+rules.SPELL_REWARDS.length;i++){
  f.setCards([i]);const canvas=d.querySelector('.reward-preview canvas');assert.equal(canvas.dataset.preview,'ready','reward '+i);assert.ok(f.contexts.get(canvas).shapes.length>10);assert.equal(f.frames.size,0);calls++;
 }
 assert.ok(calls>90);const after=g.captureSave();assert.deepEqual(after.state,before.state);assert.equal(g.golems.length,0);assert.equal(g.plantSystem.plants.length,0);assert.equal(g.enemies.length,0);assert.equal(g.spellEffects.length,0);assert.equal(g.activeVoiceCount,0);
 const actual=g.createGolemModel(rules.GOLEMS[0]),preview=g.makeRewardPreviewModel({kind:'golem',type:rules.GOLEMS[0]});actual.remove(actual.userData.bar);assert.equal(actual.children.length,preview.children.length);g.disposeRewardPreviewModel(actual);g.disposeRewardPreviewModel(preview);
});
test('static/reduced/no-context cards remain accessible and selectable',()=>{
 for(const option of [{reduced:true},{noCanvas:true}]){const f=setupCards(option),{g,document:d}=f;g.reset();g.openQuiz();assert.equal(f.frames.size,0);assert.equal(d.querySelectorAll('.preview-ready').length,option.noCanvas?0:3);const button=d.querySelector('[data-reward]');assert.match(button.getAttribute('aria-label'),/连续答对/);button.click();assert.equal(g.state.mode,'quiz');assert.equal(d.querySelectorAll('#answer-options button').length,4);}
});

test('mobile plays previews too; hiding cancels rest and return resumes only unselected cards',()=>{const f=setupCards({staticMode:true}),{g,document:d}=f;g.reset();g.openQuiz();assert.equal(f.frames.size,1);f.step(0);f.step(1100);assert.equal(f.frames.size,0);assert.equal(g.rewardPreviewPainter.resting,true);Object.defineProperty(d,'hidden',{configurable:true,value:true});d.dispatchEvent(new f.dom.window.Event('visibilitychange'));assert.equal(g.rewardPreviewPainter.resting,false);Object.defineProperty(d,'hidden',{configurable:true,value:false});d.dispatchEvent(new f.dom.window.Event('visibilitychange'));assert.equal(f.frames.size,1);d.querySelector('[data-reward]').click();assert.equal(f.frames.size,0);f.dom.window.dispatchEvent(new f.dom.window.Event('focus'));assert.equal(f.frames.size,0);g.reset();f.dom.window.close();});

test('repeated focus preserves the rest window and bfcache resumes without reopening rewards',()=>{const f=setupCards(),{g,document:d}=f;g.reset();g.openQuiz();const cards=[...g.offers];f.step(0);f.step(1100);for(let i=0;i<4;i++)f.dom.window.dispatchEvent(new f.dom.window.Event('focus'));assert.equal(f.frames.size,0);assert.equal(g.rewardPreviewPainter.resting,true);f.dom.window.dispatchEvent(new f.dom.window.Event('pagehide'));assert.equal(g.rewardPreviewPainter.resting,false);f.dom.window.dispatchEvent(new f.dom.window.Event('pageshow'));assert.equal(f.frames.size,1);assert.deepEqual([...g.offers],cards);f.dom.window.dispatchEvent(new f.dom.window.Event('pageshow'));assert.equal(f.frames.size,1);g.reset();f.dom.window.dispatchEvent(new f.dom.window.Event('pageshow'));assert.equal(f.frames.size,0);f.dom.window.close();});
