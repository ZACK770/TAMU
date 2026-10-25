import {PDFDocument,rgb,StandardFonts} from 'pdf-lib';
import QRCode from 'qrcode';
import JSZip from 'jszip';
import * as D from './domain.mjs';
import {readFileSync} from 'node:fs';
const DEFAULT_BACK=readFileSync(new URL('../assets/booklet-back.pdf',import.meta.url));
const q=(db,s,...a)=>db.prepare(s).bind(...a);
const rows=async(db,s,...a)=>(await q(db,s,...a).all()).results;
const first=(db,s,...a)=>q(db,s,...a).first();
const fail=(m,s=400)=>{throw new D.DomainError(m,s)};
const ABC='23456789ABCDEFGHJKMNPQRSTUVWXYZ';
const newCode=()=>[...crypto.getRandomValues(new Uint8Array(8))].map(b=>ABC[b%ABC.length]).join('');
export const fmtCode=c=>c.slice(0,4)+'-'+c.slice(4);
export async function listBooklets(db){
 return {booklets:await rows(db,'SELECT b.*,(SELECT COUNT(*) FROM b_booklet_codes c WHERE c.bookletId=b.id AND c.voided=0) AS codes,(SELECT COUNT(*) FROM b_booklet_codes c WHERE c.bookletId=b.id AND c.participantId IS NOT NULL) AS used FROM b_booklets b ORDER BY b.createdAt DESC'),
  files:await rows(db,'SELECT id,bookletId,kind,name,ord FROM b_booklet_files ORDER BY ord'),
  exams:await rows(db,'SELECT id,title FROM b_exams ORDER BY createdAt DESC LIMIT 300')};
}
export async function saveBooklet(db,b){
 const title=String(b.title||'').trim().slice(0,120);if(!title)fail('חסר שם לחוברת');const examId=b.examId||null;
 if(b.id){await q(db,'UPDATE b_booklets SET title=?,examId=? WHERE id=?',title,examId,b.id).run();return {id:b.id}}
 const id=crypto.randomUUID();await q(db,'INSERT INTO b_booklets(id,title,examId,createdAt) VALUES(?,?,?,?)',id,title,examId,D.now()).run();return {id};
}
export async function addFile(db,bookletId,kind,name,buf){
 if(!['part','back'].includes(kind))fail('סוג קובץ לא תקין');if(!await first(db,'SELECT id FROM b_booklets WHERE id=?',bookletId))fail('החוברת לא נמצאה',404);
 if(buf.subarray(0,4).toString()!=='%PDF')fail('אפשר להעלות רק קובצי PDF');
 try{await PDFDocument.load(buf,{ignoreEncryption:true})}catch{fail('קובץ ה-PDF פגום')}
 if(kind==='back')await q(db,"DELETE FROM b_booklet_files WHERE bookletId=? AND kind='back'",bookletId).run();
 const m=await first(db,'SELECT MAX(ord) AS m FROM b_booklet_files WHERE bookletId=?',bookletId);
 const id=crypto.randomUUID();await q(db,'INSERT INTO b_booklet_files(id,bookletId,kind,name,ord,data,createdAt) VALUES(?,?,?,?,?,?,?)',id,bookletId,kind,String(name||'file.pdf').slice(0,120),Number(m?.m||0)+1,buf.toString('base64'),D.now()).run();return {id};
}
export async function moveFile(db,id,dir){
 const f=await first(db,'SELECT id,bookletId,ord FROM b_booklet_files WHERE id=?',id);if(!f)fail('הקובץ לא נמצא',404);
 const list=await rows(db,"SELECT id,ord FROM b_booklet_files WHERE bookletId=? AND kind='part' ORDER BY ord",f.bookletId),i=list.findIndex(x=>x.id===id),j=i+(dir<0?-1:1);
 if(j<0||j>=list.length)return {ok:true};[list[i],list[j]]=[list[j],list[i]];
 for(const [k,x] of list.entries())await q(db,'UPDATE b_booklet_files SET ord=? WHERE id=?',k+1,x.id).run();return {ok:true};
}
export const deleteFile=async(db,id)=>(await q(db,'DELETE FROM b_booklet_files WHERE id=?',id).run(),{ok:true});
export async function generateCodes(db,bookletId,count){
 count=Math.floor(Number(count));if(!(count>=1&&count<=2000))fail('אפשר ליצור בין 1 ל-2000 קודים בכל פעם');
 if(!await first(db,'SELECT id FROM b_booklets WHERE id=?',bookletId))fail('החוברת לא נמצאה',404);
 let serial=Number((await first(db,'SELECT MAX(serial) AS m FROM b_booklet_codes WHERE bookletId=?',bookletId))?.m||0);
 for(let n=0;n<count;){try{await q(db,'INSERT INTO b_booklet_codes(code,bookletId,serial,voided,createdAt) VALUES(?,?,?,0,?)',newCode(),bookletId,serial+1,D.now()).run();serial++;n++}catch(e){if(!/unique|duplicate/i.test(e.message))throw e}}
 return {ok:true,last:serial};
}
export const bookletCodes=async(db,id)=>({codes:await rows(db,'SELECT c.*,p.name FROM b_booklet_codes c LEFT JOIN b_participants p ON p.id=c.participantId WHERE c.bookletId=? ORDER BY c.serial',id)});
export const voidCode=async(db,code)=>(await q(db,'UPDATE b_booklet_codes SET voided=1 WHERE code=? AND participantId IS NULL',code).run(),{ok:true});
async function stampBack(doc,tpl,code,serial,url,font){
 let page;if(tpl){[page]=await doc.copyPages(tpl,[0]);doc.addPage(page)}else page=doc.addPage([420,595]);
 const {width}=page.getSize(),png=await doc.embedPng(await QRCode.toBuffer(url,{margin:1,width:360,errorCorrectionLevel:'M'})),s=110,x=(width-s)/2,y=46;
 page.drawRectangle({x:x-8,y:y-30,width:s+16,height:s+40,color:rgb(1,1,1)});
 page.drawImage(png,{x,y,width:s,height:s});
 const t=fmtCode(code),w=font.widthOfTextAtSize(t,13);page.drawText(t,{x:(width-w)/2,y:y-18,size:13,font,color:rgb(0,0,0)});
 page.drawText('#'+String(serial).padStart(4,'0'),{x:x+s-28,y:y-27,size:6,font,color:rgb(.4,.4,.4)});
}
export async function exportBooklet(db,id,mode,origin,from=1,to=1e9){
 const b=await first(db,'SELECT * FROM b_booklets WHERE id=?',id);if(!b)fail('החוברת לא נמצאה',404);
 const files=await rows(db,'SELECT * FROM b_booklet_files WHERE bookletId=? ORDER BY ord',id),parts=files.filter(f=>f.kind==='part'),backF=files.find(f=>f.kind==='back');
 const codes=await rows(db,'SELECT code,serial FROM b_booklet_codes WHERE bookletId=? AND voided=0 AND serial>=? AND serial<=? ORDER BY serial',id,Number(from)||1,Number(to)||1e9);
 if(mode!=='zip'&&!codes.length)fail('אין קודים בטווח שנבחר. יוצרים קודים קודם.');
 const tpl=await PDFDocument.load(backF?Buffer.from(backF.data,'base64'):DEFAULT_BACK,{ignoreEncryption:true}),url=c=>origin+'/bifnim/?code='+c;
 const merged=async(extra)=>{const doc=await PDFDocument.create();for(const f of parts){const src=await PDFDocument.load(Buffer.from(f.data,'base64'),{ignoreEncryption:true});(await doc.copyPages(src,src.getPageIndices())).forEach(p=>doc.addPage(p))}if(extra)await extra(doc);return doc};
 const backs=async()=>{const doc=await PDFDocument.create(),font=await doc.embedFont(StandardFonts.HelveticaBold);for(const c of codes)await stampBack(doc,tpl,c.code,c.serial,url(c.code),font);return doc.save()};
 if(mode==='backs')return {type:'application/pdf',name:'backs.pdf',data:Buffer.from(await backs())};
 const zip=new JSZip();
 if(mode==='copies'){if(codes.length>100)fail('עותק מלא לכל קוד מוגבל ל-100 עותקים בכל ייצוא. בוחרים טווח קטן יותר.');
  for(const c of codes){const doc=await merged(async d=>stampBack(d,tpl,c.code,c.serial,url(c.code),await d.embedFont(StandardFonts.HelveticaBold)));zip.file(String(c.serial).padStart(4,'0')+'.pdf',await doc.save())}}
 else{parts.forEach((f,i)=>zip.file('parts/'+String(i+1).padStart(2,'0')+'-'+f.name.replace(/[\\/:*?"<>|]/g,'_'),Buffer.from(f.data,'base64')));
  if(parts.length)zip.file('booklet.pdf',await (await merged()).save());if(codes.length)zip.file('backs.pdf',await backs());}
 return {type:'application/zip',name:mode==='copies'?'copies.zip':'booklet.zip',data:await zip.generateAsync({type:'nodebuffer'})};
}
