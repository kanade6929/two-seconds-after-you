(function(root){
  'use strict';
  class Community{
    constructor(config={}){this.config=config||{};this.configured=!!this.config.url&&!!this.config.publishableKey;this.session=null;this.authPending=null;this.likePending=null;}
    async request(path,{method='GET',body,token,headers={}}={}){
      if(!this.configured)throw Error('Community is not configured');
      const c=new AbortController(),timer=setTimeout(()=>c.abort(),12000);
      try{const response=await fetch(this.config.url.replace(/\/$/,'')+path,{method,signal:c.signal,headers:{apikey:this.config.publishableKey,'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{}),...headers},...(body?{body:JSON.stringify(body)}:{})});if(!response.ok)throw Error('Community request failed: '+response.status);return response.status===204?null:await response.json();}finally{clearTimeout(timer);}
    }
    async identity(){
      if(this.authPending)return this.authPending;
      this.authPending=(async()=>{
        if(!this.session)try{this.session=JSON.parse(localStorage.getItem('echo.community.session'));}catch{}
        if(this.session?.expires_at>Date.now()/1000+60)return this.session;
        let s;if(this.session?.refresh_token){try{s=await this.request('/auth/v1/token?grant_type=refresh_token',{method:'POST',body:{refresh_token:this.session.refresh_token}});}catch{/* Expired anonymous session may establish a new identity. */}}
        if(!s)s=await this.request('/auth/v1/signup',{method:'POST',body:{data:{}}});
        if(!s.access_token||!s.user?.id)throw Error('Anonymous authentication unavailable');
        this.session={access_token:s.access_token,refresh_token:s.refresh_token,user:s.user,expires_at:s.expires_at||Date.now()/1000+s.expires_in};
        try{localStorage.setItem('echo.community.session',JSON.stringify(this.session));}catch{}return this.session;
      })();try{return await this.authPending;}finally{this.authPending=null;}
    }
    async readComments(cursor=null){
      const s=await this.identity();let q='/rest/v1/comments?select=id,nickname,body,created_at&order=id.desc&limit=21';if(cursor!==null)q+='&id=lt.'+encodeURIComponent(cursor);
      const rows=await this.request(q,{token:s.access_token});return {rows:rows.slice(0,20),next:rows.length>20?rows[19].id:null};
    }
    async submitComment(nickname,body){
      nickname=nickname.trim();body=body.trim();if(!body||[...nickname].length>16||[...body].length>300)throw Error('Invalid comment');
      const s=await this.identity();return this.request('/rest/v1/comments',{method:'POST',token:s.access_token,headers:{Prefer:'return=representation'},body:{user_id:s.user.id,nickname,body}});
    }
    async readLikes(){const s=await this.identity();const r=await this.request('/rest/v1/rpc/community_likes',{method:'POST',token:s.access_token,body:{}});return r;}
    async toggleLike(){if(this.likePending)return this.likePending;this.likePending=(async()=>{const s=await this.identity(),info=await this.readLikes();if(info.liked)await this.request('/rest/v1/likes?user_id=eq.'+encodeURIComponent(s.user.id),{method:'DELETE',token:s.access_token});else await this.request('/rest/v1/likes',{method:'POST',token:s.access_token,headers:{Prefer:'return=representation'},body:{user_id:s.user.id}});return this.readLikes();})();try{return await this.likePending;}finally{this.likePending=null;}}
  }
  if(typeof module!=='undefined'&&module.exports)module.exports=Community;else root.EchoCommunity=Community;
})(typeof globalThis!=='undefined'?globalThis:this);
