import test from 'node:test';
import assert from 'node:assert/strict';
import {loadScoutModule} from './helpers/scout-loader.mjs';
const {createIntroductionVisit,introductionDelayMs}=loadScoutModule('src/lib/assistant-introduction.ts');
test('an intentional handling suppresses reopening only during that page visit',()=>{const visit=createIntroductionVisit();assert.equal(visit.isConsumed(),false);assert.equal(visit.consume(),true);assert.equal(visit.isConsumed(),true);assert.equal(visit.consume(),false);});
test('a homepage refresh or new visit is eligible without a tab storage dependency',()=>{const first=createIntroductionVisit();first.consume();assert.equal(createIntroductionVisit().isConsumed(),false);});
test('the existing entrance/pause timing is retained',()=>{assert.equal(introductionDelayMs,1700);});
