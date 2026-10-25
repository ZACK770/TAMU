import pg from 'pg';
import {readFileSync} from 'node:fs';
pg.types.setTypeParser(20,v=>Number(v));
pg.types.setTypeParser(1700,v=>Number(v));
const schemaFile=new URL('../db/postgres-schema.sql',import.meta.url);
const columns=new Map();
for(const m of readFileSync(new URL('../db/portable-schema.sql',import.meta.url),'utf8').matchAll(/[(,]\s*([A-Za-z_][A-Za-z0-9_]*)\s+(?:TEXT|INTEGER)/g))columns.set(m[1].toLowerCase(),m[1]);
for(const extra of ['username','total'])columns.set(extra,extra);
const camel=row=>{if(!row)return row;const out={};for(const [k,v] of Object.entries(row))out[columns.get(k)||k]=v;return out};
export function translate(query){
 let n=0,q=query.replace(/\?/g,()=>'$'+(++n));
 if(/^\s*INSERT\s+OR\s+IGNORE\s+INTO/i.test(q))q=q.replace(/INSERT\s+OR\s+IGNORE\s+INTO/i,'INSERT INTO').replace(/;?\s*$/,' ON CONFLICT DO NOTHING');
 return q;
}
function normalizeError(e){
 if(e?.code==='23505')return new Error('UNIQUE constraint failed: '+(e.constraint||''));
 if(e?.code==='23514')return new Error('CHECK constraint failed: '+(e.constraint||''));
 if(e?.message?.includes('ledger_immutable'))return new Error('ledger_immutable');
 return e;
}
export async function postgresAdapter(connectionString,{ssl}={}){
 const pool=new pg.Pool({connectionString,max:10,ssl:ssl??(/render\.com/.test(connectionString)?{rejectUnauthorized:false}:undefined)});
 await pool.query(readFileSync(schemaFile,'utf8'));
 const run=async(client,query,args)=>{try{const r=await client.query(translate(query),args.map(x=>x===undefined?null:typeof x==='boolean'?(x?1:0):x));return {results:r.rows.map(camel),meta:{changes:r.rowCount??0}}}catch(e){throw normalizeError(e)}};
 const db={
  prepare(query){return {bind(...args){return {
   query,args,
   async first(){return (await run(pool,query,args)).results[0]||null},
   async all(){return {results:(await run(pool,query,args)).results}},
   async run(){return run(pool,query,args)}
  }}}},
  async batch(statements){
   const client=await pool.connect();
   try{await client.query('BEGIN');const out=[];for(const s of statements)out.push(await run(client,s.query,s.args));await client.query('COMMIT');return out}
   catch(e){await client.query('ROLLBACK').catch(()=>{});throw e}
   finally{client.release()}
  }
 };
 return {db,pool,close:()=>pool.end()};
}
