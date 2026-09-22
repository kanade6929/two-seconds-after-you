const {open}=require('./browser-driver.cjs'),R=require('../rules.js'),assert=require('node:assert/strict');
(async()=>{for(const [channel,width,height]of [['chrome',1280,720],['chrome',1920,1080],['chrome-mobile',360,800]]){
 const d=await open(channel,true);try{await d.page.setViewportSize({width,height});await d.advance(.6);await d.chapter(3);await d.move(R.spring,2);
 assert.equal(await d.page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 await d.shot('temperance-'+width+'x'+height);await d.close();}catch(e){await d.browser.close();throw e;}
}})().catch(e=>{console.error(e);process.exitCode=1;});
