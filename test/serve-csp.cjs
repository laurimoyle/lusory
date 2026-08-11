const http=require('http'),fs=require('fs'),path=require('path');
const csp=JSON.parse(fs.readFileSync(require('path').join(__dirname,'..','vercel.json'),'utf8')).headers[0].headers;
http.createServer((req,res)=>{
  let p=req.url.split('?')[0]; if(p==='/')p='/index.html';
  fs.readFile(path.join(__dirname,'..',p),(e,d)=>{ if(e){res.writeHead(404);res.end();return;}
    const h={'Content-Type':'text/html'}; csp.forEach(x=>h[x.key]=x.value);
    res.writeHead(200,h); res.end(d); });
}).listen(8124);
