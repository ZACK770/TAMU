import {test} from 'node:test';
import assert from 'node:assert/strict';
import {validateAdminData} from '../public/admin/admin-data.mjs';
import {parseTextQuestions} from '../public/admin/exam-questions.mjs';
test('missing entity collections fail explicitly instead of crashing with undefined.map',()=>{
 for(const action of ['participants','templates','exams','booklets','benefits','orders','messages','institutions','staff','audit']){
  assert.throws(()=>validateAdminData(action,{}),/תשובה חסרה/);
 }
});
test('valid and empty collections remain valid; booklet relations must all be present',()=>{
 assert.deepEqual(validateAdminData('templates',{templates:[]}),{templates:[]});
 assert.deepEqual(validateAdminData('exams',{exams:[{id:'e'}]}).exams,[{id:'e'}]);
 assert.throws(()=>validateAdminData('booklets',{booklets:[]}),/תשובה חסרה/);
 assert.ok(validateAdminData('booklets',{booklets:[],files:[],exams:[]}));
});
test('multiline import accepts Windows line endings, spaced blank lines and invisible text marks',()=>{
 const text='Question 1\r\n*Yes\r\nNo\r\n\u200f \u00a0\r\nQuestion 2\r\nA\r\n*B';
 const qs=parseTextQuestions(text);assert.equal(qs.length,2);assert.equal(qs[0].correct,0);assert.equal(qs[1].correct,1);
});
