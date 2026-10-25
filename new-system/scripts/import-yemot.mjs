import {readFileSync,readdirSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import {join} from 'node:path';
import {buildPlan,applyPlan} from '../lib/legacy-import.mjs';

const args=process.argv.slice(2),flag=n=>args.includes(n),opt=n=>{const i=args.indexOf(n);return i>=0?args[i+1]:null};
const dir=opt('--dir')||'./yemot-data',out=opt('--out')||join(dir,'report');
const api='https://www.call2all.co.il/ym/api/';

async function download(){
 const token=process.env.YEMOT_TOKEN;if(!token)throw new Error('YEMOT_TOKEN is required for --download');
 mkdirSync(dir,{recursive:true});
 const get=async(path,file)=>{const r=await fetch(api+'DownloadFile?'+new URLSearchParams({token,path}));const t=await r.text();if(!r.ok||t.startsWith('Requested file'))throw new Error('download failed: '+path);writeFileSync(join(dir,file),t,{mode:0o600})};
 const list=await (await fetch(api+'GetIVR2Dir?'+new URLSearchParams({token,path:'ivr2:/Points'}))).json();
 const logs=(list.files||[]).map(f=>f.name).filter(n=>/^points_log\..*\.ymgr$/.test(n));
 await get('ivr2:/EnterID/ListAllInformation.ini','ListAllInformation.ini');
 for(const f of ['points_total.ini','add_to_points_total.ini',...logs])await get('ivr2:/Points/'+f,f);
}

if(flag('--download'))await download();
const read=f=>existsSync(join(dir,f))?readFileSync(join(dir,f),'utf8'):'';
const logs=Object.fromEntries(readdirSync(dir).filter(f=>/^points_log\..*\.ymgr$/.test(f)).map(f=>[f,read(f)]));
const plan=buildPlan({list:read('ListAllInformation.ini'),points:read('points_total.ini'),adds:read('add_to_points_total.ini'),logs});
mkdirSync(out,{recursive:true});
writeFileSync(join(out,'summary.json'),JSON.stringify(plan.summary,null,1));
const cols=['nationalId','issue','name','earned','adjust','balance','lastLogTotal','names','passwords','source','line','total','delta'];
const cell=v=>v===undefined?'':/[",\n]/.test(String(v))?'"'+String(v).replace(/"/g,'""')+'"':String(v);
writeFileSync(join(out,'review.csv'),'\uFEFF'+[cols.join(','),...plan.review.map(r=>cols.map(c=>cell(r[c])).join(','))].join('\n'));
console.log(plan.summary);
if(flag('--apply')){
 const {postgresAdapter}=await import('./postgres-adapter.mjs');
 if(!process.env.DATABASE_URL)throw new Error('DATABASE_URL is required for --apply');
 const {db,close}=await postgresAdapter(process.env.DATABASE_URL,{ssl:flag('--ssl')?{rejectUnauthorized:false}:undefined});
 try{console.log('applied',await applyPlan(db,plan,{progress:(k,n)=>process.stdout.write(`\r${k} ${n}   `)}))}finally{await close()}
}else console.log('dry run only; add --apply to write');
