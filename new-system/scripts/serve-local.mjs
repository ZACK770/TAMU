import {createServer} from 'node:http';
import {readFileSync,existsSync,mkdirSync,statSync} from 'node:fs';
import {resolve,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {sqliteAdapter} from './sqlite-adapter.mjs';
import {handleYouthHttp} from '../lib/youth-http.mjs';
import {seedYouthDemo} from './seed-youth-demo.mjs';
import {DomainError} from '../lib/domain.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
const demo=process.argv.includes('--demo'),port=Number(process.env.PORT||4173);
mkdirSync(resolve(root,'work'),{recursive:true});
const filename=resolve(root,'work',demo?'youth-demo.sqlite':'local.sqlite'),fresh=!existsSync(filename),{db,sql}=sqliteAdapter(filename);
if(fresh)sql.exec(readFileSync(resolve(root,'db/portable-schema.sql'),'utf8'));
if(demo)await seedYouthDemo(db);
const mime={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.js':'text/javascript; charset=utf-8','.svg':'image/svg+xml','.png':'image/png'};
const server=createServer(async(req,res)=>{
 try{
 const host=req.headers.host||'';
 if(!['127.0.0.1:'+port,'localhost:'+port].includes(host)){res.writeHead(403);res.end('Invalid host');return;}
 const url=new URL(req.url,'http://'+host);
 if(url.pathname.startsWith('/api/youth/')){
  const chunks=[];let n=0;for await(const chunk of req){n+=chunk.length;if(n>1024*1024){res.writeHead(413);res.end();return;}chunks.push(chunk)}
  const request=new Request(url,{method:req.method,headers:{...req.headers,'x-local-client':req.socket.remoteAddress||'local'},...(req.method==='POST'?{body:Buffer.concat(chunks)}:{})});
  const out=await handleYouthHttp(db,request,url.pathname.slice(5),async()=>{throw new DomainError('ניהול הצוות מחייב חיבור הרשאות. סביבת בדיקה זו מיועדת לחוויית המשתתף.',403)});
  res.writeHead(out.status,Object.fromEntries(out.headers));res.end(Buffer.from(await out.arrayBuffer()));return;
 }
 if(url.pathname==='/health'){res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify({ok:true,demo,localOnly:true}));return}
 let file=resolve(root,'public',url.pathname==='/'||url.pathname==='/bifnim'||url.pathname==='/bifnim/'?'bifnim/index.html':'.'+decodeURIComponent(url.pathname));
 const publicRoot=resolve(root,'public')+sep;
 if(!file.startsWith(publicRoot)||!existsSync(file)||!statSync(file).isFile()){res.writeHead(404);res.end('Not found');return}
 let bytes=readFileSync(file);
 if(extname(file)==='.html'&&demo)bytes=Buffer.from(bytes.toString('utf8').replace('<body>','<body><div class="preview-ribbon">סביבת בדיקה מקומית · תוכן והטבות לדוגמה בלבד · אין מימוש בחנויות אמיתיות</div>'));
 res.writeHead(200,{'Content-Type':mime[extname(file)]||'application/octet-stream','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'});res.end(bytes);
 }catch(e){console.error(e.message);res.writeHead(500,{'Content-Type':'application/json'});res.end(JSON.stringify({error:'Local preview error'}))}
});
server.listen(port,'127.0.0.1',()=>console.log('Local: http://127.0.0.1:'+port+'/bifnim/'));
process.on('SIGINT',()=>server.close(()=>{sql.close();process.exit(0)}));
