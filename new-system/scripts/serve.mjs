import {createServer} from 'node:http';
import {readFileSync,existsSync,statSync} from 'node:fs';
import {resolve,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {postgresAdapter} from './postgres-adapter.mjs';
import {handleYouthHttp} from '../lib/youth-http.mjs';
import {handleTechnolineCall} from '../lib/technoline.mjs';
import {DomainError} from '../lib/domain.mjs';
import * as S from '../lib/staff.mjs';
import {handleAdmin} from '../lib/admin-http.mjs';
const root=fileURLToPath(new URL('../',import.meta.url)),port=Number(process.env.PORT||10000);
const origin=process.env.RENDER_EXTERNAL_URL||process.env.PUBLIC_ORIGIN||'http://localhost:'+port;
if(!process.env.DATABASE_URL)throw new Error('DATABASE_URL required');
const ivrSecret=process.env.TECHNOLINE_PATH_SECRET||'';
const {db,close}=await postgresAdapter(process.env.DATABASE_URL);
if(process.env.ADMIN_BOOTSTRAP_PASSWORD&&!(await db.prepare('SELECT id FROM staff_accounts LIMIT 1').bind().first()))
 await S.createStaff(db,{username:process.env.ADMIN_BOOTSTRAP_USER||'admin',name:'מנהל ראשי',password:process.env.ADMIN_BOOTSTRAP_PASSWORD,role:'admin'},'bootstrap');
const mime={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.js':'text/javascript; charset=utf-8','.svg':'image/svg+xml','.png':'image/png'};
const sec={'X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','X-Frame-Options':'DENY','Strict-Transport-Security':'max-age=31536000'};
const send=(res,status,body,headers={})=>{res.writeHead(status,{...sec,'Cache-Control':'no-store',...headers});res.end(body)};
const json=(res,status,obj,headers={})=>send(res,status,JSON.stringify(obj),{'Content-Type':'application/json; charset=utf-8',...headers});
async function body(req){const chunks=[];let n=0;for await(const c of req){n+=c.length;if(n>1024*1024)throw new DomainError('בקשה גדולה מדי',413);chunks.push(c)}return Buffer.concat(chunks)}
const clientIp=req=>String(req.headers['x-forwarded-for']||req.socket.remoteAddress||'unknown').split(',')[0].trim();
const server=createServer(async(req,res)=>{
 try{
  const url=new URL(req.url,origin),path=url.pathname,secure=origin.startsWith('https');
  if(path==='/health'){await db.prepare('SELECT 1 AS ok').bind().first();return json(res,200,{ok:true})}
  if(ivrSecret&&path==='/ivr/'+ivrSecret){
   const raw=await body(req),params=Object.fromEntries(url.searchParams);
   if(req.method==='POST')for(const [k,v] of new URLSearchParams(raw.toString('utf8')))params[k]=v;
   return json(res,200,await handleTechnolineCall(db,params));
  }
  if(path.startsWith('/api/')){
   const raw=await body(req);
   const request=new Request(url,{method:req.method,headers:{...req.headers,'x-local-client':clientIp(req)},...(['GET','HEAD'].includes(req.method)?{}:{body:raw})});
   if(path.startsWith('/api/youth/')){const out=await handleYouthHttp(db,request,path.slice(5),r=>S.authorizeStaff(db,r));return send(res,out.status,Buffer.from(await out.arrayBuffer()),Object.fromEntries(out.headers))}
   if(path==='/api/staff/login'&&req.method==='POST'){const b=JSON.parse(raw||'{}'),a=await S.staffLogin(db,b.username,b.password);return json(res,200,{staff:a.staff},{'Set-Cookie':S.staffCookie(a.token,secure)})}
   if(path==='/api/staff/logout'){await S.staffLogout(db,request);return json(res,200,{ok:true},{'Set-Cookie':S.staffCookie('',secure,true)})}
   if(path==='/api/staff/me')return json(res,200,{staff:await S.authorizeStaff(db,request)});
   if(path==='/api/admin'&&req.method==='POST'){const staff=await S.authorizeStaff(db,request),b=JSON.parse(raw||'{}');return json(res,200,await handleAdmin(db,staff,String(b.action||''),b))}
   return json(res,404,{error:'לא נמצא'});
  }
  const file=resolve(root,'public',path==='/'||path==='/bifnim'||path==='/bifnim/'?'bifnim/index.html':path==='/admin'||path==='/admin/'?'admin/index.html':'.'+decodeURIComponent(path));
  if(!file.startsWith(resolve(root,'public')+sep)||!existsSync(file)||!statSync(file).isFile())return send(res,404,'Not found');
  send(res,200,readFileSync(file),{'Content-Type':mime[extname(file)]||'application/octet-stream'});
 }catch(e){
  if(e instanceof DomainError)return json(res,e.status||400,{error:e.message});
  if(e instanceof SyntaxError)return json(res,400,{error:'בקשה לא תקינה'});
  console.error(e);json(res,500,{error:'שגיאת שרת'});
 }
});
server.listen(port,'0.0.0.0',()=>console.log('listening on '+port));
process.on('SIGTERM',()=>server.close(()=>close().then(()=>process.exit(0))));
