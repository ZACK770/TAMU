import {DatabaseSync} from 'node:sqlite';
export function sqliteAdapter(filename=':memory:'){
 const sql=new DatabaseSync(filename);
 sql.exec('PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;');
 const db={
  prepare(query){
   return {bind(...args){
    const a=args.map(x=>x===undefined?null:x);
    return {
     exec(){const s=sql.prepare(query);const result=/^\s*(SELECT|PRAGMA|WITH)\b/i.test(query)||/\bRETURNING\b/i.test(query)?{results:s.all(...a),meta:{changes:0}}:{results:[],meta:s.run(...a)};return result;},
     async first(){return sql.prepare(query).get(...a)||null},
     async all(){return {results:sql.prepare(query).all(...a)}},
     async run(){return this.exec()}
    };
   }};
  },
  async batch(statements){
   sql.exec('BEGIN IMMEDIATE');
   try{const out=statements.map(s=>s.exec());sql.exec('COMMIT');return out}
   catch(e){sql.exec('ROLLBACK');throw e}
  }
 };
 return {sql,db,close:()=>sql.close()};
}
