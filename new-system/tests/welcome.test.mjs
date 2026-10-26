import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PDFDocument} from 'pdf-lib';
import {sqliteAdapter} from '../scripts/sqlite-adapter.mjs';
import * as Y from '../lib/youth.mjs';
import * as B from '../lib/booklets.mjs';
function fixture(){const {db,sql}=sqliteAdapter();sql.exec(readFileSync(new URL('../db/portable-schema.sql',import.meta.url),'utf8'));return {db}}
test('booklet welcome screen: public view, save for later, then challenge',async()=>{
 const {db}=fixture(),reg=async u=>{await Y.registerYouth(db,{name:'נער '+u,username:u,password:'password123'});return (await Y.loginYouth(db,u,'password123')).participant.id};
 const a=await reg('welcomea'),b=await reg('welcomeb');
 await Y.saveYouthExam(db,{title:'W exam',materialKey:'w-m1',week:'w-w1',track:'easy',kind:'sicha',opensAt:new Date(Date.now()-10000).toISOString(),closesAt:new Date(Date.now()+86400000).toISOString(),questionCount:1,questions:[{id:'q1',text:'Q1',options:['A','B'],correct:0,points:10}],published:true});
 const exam=(await B.listBooklets(db)).exams[0];
 await assert.rejects(B.saveBooklet(db,{title:'x',videoUrl:'http://x'}),/https/);
 const {id}=await B.saveBooklet(db,{title:'חוברת',examId:exam.id,welcomeText:'נפגשנו בדוכן',videoUrl:'https://v.test/1'});
 await B.generateCodes(db,id,2);const [c1]=(await B.bookletCodes(db,id)).codes;
 let w=await Y.bookletWelcome(db,c1.code,null);assert.equal(w.mode,'content');assert.equal(w.status,'free');assert.equal(w.welcome,'נפגשנו בדוכן');assert.equal(w.exam.id,exam.id);assert.equal(w.hasPdf,false);
 await assert.rejects(B.readingPdf(db,c1.code),/אין קובץ/);
 const doc=await PDFDocument.create();doc.addPage();await B.addFile(db,id,'part','a.pdf',Buffer.from(await doc.save()));
 assert.equal((await PDFDocument.load(await B.readingPdf(db,c1.code))).getPageCount(),1);
 await Y.claimBookletCode(db,a,c1.code);
 w=await Y.bookletWelcome(db,c1.code,a);assert.equal(w.status,'mine');assert.equal(w.attempt,null);
 assert.equal((await Y.bookletWelcome(db,c1.code,b)).status,'taken');
 await assert.rejects(Y.claimBookletCode(db,b,c1.code),/נוצל/);
 assert.equal((await Y.youthState(db,a)).booklets[0].title,'חוברת');
 const r=await Y.redeemBookletCode(db,a,c1.code);assert.equal(r.examId,exam.id);
 assert.ok((await Y.bookletWelcome(db,c1.code,a)).attempt);
});
