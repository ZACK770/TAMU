import test from 'node:test';import assert from 'node:assert/strict';
import {matchInstitution,norm} from '../lib/transcribe.mjs';
test('institution matching by name or learned alias, punctuation-insensitive',()=>{
 const list=[{id:'a',name:'בית מתתיהו',aliases:JSON.stringify(['בית מתס','בית ממתיהו'])},{id:'b',name:'תות"ל',aliases:'[]'}];
 assert.equal(norm(' בית  "מתס". '),'בית מתס');
 assert.equal(matchInstitution('בית מתס',list).id,'a');assert.equal(matchInstitution('בית-ממתיהו',list).id,'a');
 assert.equal(matchInstitution('תות״ל',list).id,'b');assert.equal(matchInstitution('תותל',list).id,'b');assert.equal(matchInstitution('פוניבז',list),null);assert.equal(matchInstitution('',list),null);
});
