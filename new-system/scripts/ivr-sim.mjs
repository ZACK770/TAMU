// Usage: IVR_URL=https://host/ivr/<secret> node scripts/ivr-sim.mjs 0 123456782 654321 654321 '#' 2 9
// Each argument is one caller step ('#' = empty skip, 'REC' = fake recording, 'HANGUP' = disconnect).
const url=process.env.IVR_URL;if(!url)throw new Error('IVR_URL required');
const callId='sim-cli-'+Date.now();let last=null;
async function hit(extra={}){const u=new URL(url);for(const [k,v] of Object.entries({PBXcallId:callId,PBXphone:'0000000000',...extra}))u.searchParams.set(k,v);const r=await fetch(u);last=await r.json();console.log('<-',last.type,(last.files||[]).map(f=>f.text).join(' '),last.min!==undefined?`[${last.min}-${last.max}]`:'');return last}
await hit();
for(const a of process.argv.slice(2)){
 if(a==='HANGUP'){console.log('-> HANGUP');await hit({PBXcallStatus:'HANGUP'});break}
 if(last.type==='simpleMessage'){await hit({tv_done:'1'});break}
 const v=a==='#'?(last.skipValue||''):a;console.log('->',a);
 await hit(a==='REC'?{[last.name]:'sim.wav',['FILEID_'+last.name]:'SIM-'+Date.now()}:{[last.name]:v});
}
