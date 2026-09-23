import http from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
const root = process.cwd();
const port = Number(process.env.PORT || 5174);
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.json':'application/json','.png':'image/png','.ico':'image/x-icon'};
http.createServer(async(req,res)=>{
  try {
    const pathname = decodeURIComponent(new URL(req.url,'http://localhost').pathname);
    const target=path.resolve(root,'.'+(pathname.endsWith('/')?pathname+'index.html':pathname));
    if(!target.startsWith(root+path.sep)) {res.writeHead(403).end();return;}
    const content=await readFile(target);
    res.writeHead(200,{'Content-Type':types[path.extname(target)]||'application/octet-stream','Cache-Control':'no-store'}).end(content);
  }catch{res.writeHead(404).end('Not found');}
}).listen(port,'0.0.0.0',()=>console.log(`NBA Shenanigans is running at http://localhost:${port}`));
