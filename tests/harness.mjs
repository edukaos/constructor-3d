import {chromium} from 'playwright';
import fs from 'fs';
const L=process.env.C3D_LIBS||new URL('./node_modules/',import.meta.url).pathname;
const map=[
 [/\/npm\/three@0\.160\.0\/(.*)$/, p=>L+'three/'+p],
 [/\/npm\/three-mesh-bvh@0\.7\.3\/(.*)$/, p=>L+'three-mesh-bvh/'+p],
 [/\/npm\/three-bvh-csg@0\.0\.16\/(.*)$/, p=>L+'three-bvh-csg/'+p],
 [/\/npm\/manifold-3d@3\.5\.4\/(.*)$/, p=>L+'manifold-3d/'+p],
];
export async function open(file=new URL('../index.html',import.meta.url).pathname,{w=1280,h=800}={}){
  const browser=await chromium.launch({args:['--use-gl=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
  const ctx=await browser.newContext({viewport:{width:w,height:h},acceptDownloads:true});
  const page=await ctx.newPage();
  const errs=[]; page.on('pageerror',e=>errs.push('PAGEERROR: '+e.message)); page.on('console',m=>{if(m.type()==='error')errs.push('CONSOLE: '+m.text());});
  await page.route(/cdn\.jsdelivr\.net/,route=>{
    const u=new URL(route.request().url());
    for(const [re,f] of map){const m=u.pathname.match(re); if(m){const fp=f(m[1]); if(fs.existsSync(fp))return route.fulfill({body:fs.readFileSync(fp),contentType:fp.endsWith('.wasm')?'application/wasm':fp.endsWith('.json')?'application/json':'text/javascript'}); }}
    route.abort();
  });
  await page.goto('file://'+file);
  await page.waitForTimeout(1500);
  return {browser,page,errs};
}
