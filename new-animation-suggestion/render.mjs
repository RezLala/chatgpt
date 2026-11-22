import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { setTimeout as sleep } from 'node:timers/promises';

const here = path.dirname(fileURLToPath(import.meta.url));
const index = pathToFileURL(path.join(here, 'index.html')).href;
const outputs = path.resolve(here,'renders');
mkdirSync(outputs,{recursive:true});
const poster = process.argv.includes('--poster');
const profile = path.join(here,'chrome-render-'+process.pid);
const chromePath = ['C:/Program Files/Google/Chrome/Application/chrome.exe','/usr/bin/google-chrome','/usr/bin/chromium'].find(existsSync);
if(!chromePath)throw Error('Install Chrome or Chromium to render.');
const browser=spawn(chromePath,[
  '--headless=new','--no-sandbox','--disable-dev-shm-usage','--disable-background-networking',
  '--disable-extensions','--allow-file-access-from-files','--enable-unsafe-swiftshader',
  '--use-angle=swiftshader','--remote-debugging-pipe','--user-data-dir='+profile,'about:blank'
],{stdio:['ignore','ignore','ignore','pipe','pipe'],windowsHide:true});
try{
  let id=0;
  let sessionId;
  let pending='';
  const requests=new Map();
  browser.stdio[4].setEncoding('utf8');
  browser.stdio[4].on('data',chunk=>{
    pending+=chunk;
    let boundary;
    while((boundary=pending.indexOf('\0'))>=0){
      const message=JSON.parse(pending.slice(0,boundary));
      pending=pending.slice(boundary+1);
      if(message.id)requests.get(message.id)?.resolve(message);
    }
  });
  browser.on('exit',code=>{for(const p of requests.values())p.reject(Error('Chrome exited '+code));});
  async function call(method,params){
    const key=++id;
    const result=await new Promise((resolve,reject)=>{
      requests.set(key,{resolve,reject});
      browser.stdio[3].write(JSON.stringify({id:key,method,params,sessionId})+'\0',error=>{if(error)reject(error);});
    });
    requests.delete(key);
    if(result.error)throw Error(JSON.stringify(result.error));
    return result.result;
  }
  const {targetId}=await call('Target.createTarget',{url:'about:blank'});
  ({sessionId}=await call('Target.attachToTarget',{targetId,flatten:true}));
  await call('Page.navigate',{url:index});
  async function evaluate(expression){
    const result=await call('Runtime.evaluate',{expression,returnByValue:true});
    if(result.exceptionDetails)throw Error(result.exceptionDetails.exception?.description??result.exceptionDetails.text);
    return result.result.value;
  }
  for(let n=0;n<60&&!(await evaluate('typeof window.renderPercy==="function"'));n++)await sleep(500);
  const variants={wood:'Smooth-Wood-15s.mp4',clay:'Soft-Clay-15s.mp4'};
  const names=process.argv.slice(2).filter(x=>x in variants);
  for(const style of names.length?names:Object.keys(variants)){
    if(poster){
      for(const t of [0.65,2.1,4.9,6.18,8.65,10.9,13.1]) {
        const bytes=await evaluate('window.renderPercy('+JSON.stringify(style)+','+t+')');
        writeFileSync(path.join(here,style+'-'+t+'.jpg'),Buffer.from(bytes,'base64'));
      }
      continue;
    }
    const voice=path.join(here,'assets/percy-dialogue.m4a');
    const audioArgs=existsSync(voice)?['-i',voice]:['-f','lavfi','-i','anullsrc=r=48000:cl=stereo'];
    const video=spawn('ffmpeg',[
      '-hide_banner','-loglevel','error','-y','-f','image2pipe','-framerate','24','-vcodec','mjpeg','-i','pipe:0',
      ...audioArgs,'-map','0:v:0','-map','1:a:0','-c:v','libx264','-preset','fast','-crf','18',
      '-pix_fmt','yuv420p','-c:a',existsSync(voice)?'copy':'aac','-movflags','+faststart','-t','15',path.join(outputs,variants[style])
    ],{stdio:['pipe','ignore','inherit'],windowsHide:true});
    const done=once(video,'close');
    for(let f=0;f<360;f++){
      const bytes=await evaluate('window.renderPercy('+JSON.stringify(style)+','+f+'/24)');
      if(!video.stdin.write(Buffer.from(bytes,'base64')))await once(video.stdin,'drain');
      if(f%60===0) console.log(style,f,'/ 360');
    }
    video.stdin.end();
    const [code]=await done;
    if(code)throw Error('Encoding '+style+' exited '+code);
    console.log('Finished',variants[style]);
  }
} finally {
  browser.kill();
}
