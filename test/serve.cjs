const http=require('http'),fs=require('fs'),path=require('path');
http.createServer((req,res)=>{
  let p=req.url.split('?')[0]; if(p==='/')p='/index.html';
  const f=path.join(__dirname,'..',p);
  fs.readFile(f,(e,d)=>{ if(e){res.writeHead(404);res.end('nope');return;}
    res.writeHead(200,{'Content-Type':p.endsWith('.html')?'text/html':'text/plain'}); res.end(d); });
}).listen(8123,()=>console.log('up'));
