// Actual browser screenshots, grouped for the bounded visual review.
const{createCanvas,loadImage}=require(process.env.ECHO_CANVAS_MODULE||'@napi-rs/canvas'),fs=require('node:fs'),path=require('node:path');
const dir=path.join(__dirname,'../artifacts/browser'),states=['realtime-door','realtime-magic','realtime-lovers','realtime-temperance','realtime-star','moon-hidden','realtime-sun','realtime-world'];
(async()=>{for(const channel of['chrome','msedge','chrome-mobile','chrome-mobile-landscape']){
 const portrait=channel==='chrome-mobile',w=portrait?390:720,h=portrait?844:channel.includes('landscape')?333:450,cols=portrait?4:2,c=createCanvas(w*cols,(h+28)*Math.ceil(8/cols)),ctx=c.getContext('2d');ctx.fillStyle='#090f19';ctx.fillRect(0,0,c.width,c.height);ctx.font='18px sans-serif';ctx.fillStyle='#b8eee8';
 for(let i=0;i<8;i++){const im=await loadImage(path.join(dir,channel+'-'+states[i]+'.png')),x=i%cols*w,y=Math.floor(i/cols)*(h+28);ctx.fillText(channel+' / '+i,x+10,y+21);ctx.drawImage(im,x,y+28,w,h);}fs.writeFileSync(path.join(dir,channel+'-realtime-sheet.png'),c.toBuffer('image/png'));
}})().catch(e=>{console.error(e);process.exitCode=1;});
