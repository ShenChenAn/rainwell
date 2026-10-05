export const LAMPS=[{x:-2.45,z:-4.75,r:2.7},{x:2.45,z:-7.85,r:2.7},{x:2.85,z:.55,r:2.7},{x:-4.95,z:-11.25,r:2.7},{x:4.25,z:-12.95,r:2.7},{x:-17.8,z:-3.2,r:2.8},{x:-26.1,z:-8.2,r:2.8},{x:-2.5,z:-27.5,r:2.8},{x:2.8,z:-39,r:2.8}];
export const ITEMS=[
 {id:'crank',name:'绞盘摇柄',x:4.85,z:-1.75,y:1.02,hint:'去集市布棚，寻找木桶旁的绞盘摇柄。',near:'木桶旁的箱子上，露出了一截铁柄。',extra:'从井口向右前方走，在布棚前的三只木桶旁找木箱。'},
 {id:'key',name:'锈蚀钥匙',x:-28,z:-8,y:.78,hint:'沿西侧小路走到尽头，在孤立的枯树后寻找木车。',near:'倒下的木车里，有一把铁钥匙。',extra:'绕过左侧石屋，沿西路的灯一直走到底。木车在最远的枯树后。'},
 {id:'seal',name:'井口符牌',x:0,z:-46,y:1.05,hint:'穿过村尾的两道石门，寻找旧石坛上的符牌。',near:'石坛上，那枚符牌还没有被雨淋湿。',extra:'从水井两侧向北走，穿过第一道石门后沿灯继续走，第二道石门后就是石坛。'}
];
export const ACTIVE=[[0,1,2,3,4,5,6,7,8],[0,1,3,4,5,6,7,8],[0,3,7],[0]];
export const CHECKPOINT={x:-2.15,z:-2.75};
export function validateSave(v){if(!v||v.version!==1||!Number.isInteger(v.stage)||v.stage<0||v.stage>3||!Number.isFinite(v.elapsed)||v.elapsed<0||!Number.isInteger(v.deaths)||v.deaths<0)return null;return {version:1,stage:v.stage,elapsed:Math.min(v.elapsed,360000),deaths:v.deaths};}
export class Expedition{
 constructor(saved=null){const s=validateSave(saved);this.stage=s?.stage??0;this.elapsed=s?.elapsed??0;this.deaths=s?.deaths??0;this.phase='menu';this.danger=0;this.grace=7;this.pending=[];this.stageTime=0;this.safe=true;this.events=[];this.tier=0;this.complete=false;}
 start(){this.phase='playing';this.grace=7;this.danger=0;}
 activeLamps(){const a=new Set(ACTIVE[this.stage]);for(const p of this.pending)a.add(p.id);return [...a];}
 safeAt(p){return this.activeLamps().some(i=>Math.hypot(p.x-LAMPS[i].x,p.z-LAMPS[i].z)<=LAMPS[i].r);}
 update(dt,p,sprint=false){if(this.phase!=='playing')return;dt=Math.max(0,Math.min(dt,.1));this.elapsed+=dt;this.stageTime+=dt;this.grace=Math.max(0,this.grace-dt);for(const q of this.pending)q.left-=dt;const expired=this.pending.filter(q=>q.left<=0);this.pending=this.pending.filter(q=>q.left>0);if(expired.length)this.events.push({type:'lightsOut',ids:expired.map(q=>q.id)});this.safe=this.safeAt(p);if(this.safe)this.danger=Math.max(0,this.danger-dt*12);else if(this.grace===0)this.danger=Math.min(100,this.danger+dt*(2.65+this.stage*.53)*(sprint?1.42:1));const tier=this.danger>=85?3:this.danger>=60?2:this.danger>=25?1:0;if(tier>this.tier)this.events.push({type:'threat',tier});this.tier=tier;if(this.danger>=100){this.phase='failed';this.deaths++;this.events.push({type:'failed'});}}
 collect(p){if(this.phase!=='playing'||this.stage>=3)return false;const it=ITEMS[this.stage];if(Math.hypot(p.x-it.x,p.z-it.z)>2.15)return false;const previous=ACTIVE[this.stage];this.stage++;this.pending=previous.filter(i=>!ACTIVE[this.stage].includes(i)).map(id=>({id,left:8}));this.stageTime=0;this.danger=Math.max(0,this.danger-18);this.grace=Math.max(this.grace,3);this.events.push({type:'collected',name:it.name,stage:this.stage});return true;}
 retry(){if(this.phase!=='failed')return false;this.phase='playing';this.pending=[];this.grace=7;this.danger=0;this.tier=0;this.safe=true;this.events=[];return true;}
 beginInspection(index){if(this.phase!=='playing'||!Number.isInteger(index)||index!==this.stage-1||index<0||index>=ITEMS.length)return false;this.phase='inspecting';return true;}
 endInspection(){if(this.phase!=='inspecting')return false;this.phase='playing';return true;}
 pause(){if(this.phase==='playing')this.phase='paused';}
 resume(){if(this.phase==='paused')this.phase='playing';}
 beginFall(p){if(this.phase!=='playing'||this.stage!==3||Math.hypot(p.x,p.z+6)>2.65)return false;this.phase='falling';return true;}
 finish(){if(this.phase!=='falling')return false;this.phase='complete';this.complete=true;return true;}
 snapshot(){return {version:1,stage:this.stage,elapsed:this.elapsed,deaths:this.deaths};}
 drain(){const e=this.events;this.events=[];return e;}
}
export function inWorld(p){return (p.x>=-13.6&&p.x<=13.6&&p.z<=6.8&&p.z>=-23.8)||(p.x>=-32.6&&p.x<=-12.5&&p.z<=2.7&&p.z>=-14.5)||(p.x>=-8.7&&p.x<=8.7&&p.z<=-22&&p.z>=-49.5)||(p.x>=-30&&p.x<=-8&&p.z<=-12&&p.z>=-27);}
export function collides(p,rects){if(!inWorld(p))return true;return rects.some(b=>p.x>b.minX&&p.x<b.maxX&&p.z>b.minZ&&p.z<b.maxZ);}
export function movePlayer(p,dx,dz,rects){const n=Math.max(1,Math.ceil(Math.hypot(dx,dz)/.12));for(let i=0;i<n;i++){if(!collides({x:p.x+dx/n,z:p.z},rects))p.x+=dx/n;if(!collides({x:p.x,z:p.z+dz/n},rects))p.z+=dz/n;}return p;}
export function groundHeight(x,z){if(Math.abs(x)>=2.95)return 0;if(z<=-3.25&&z>=-9)return .6;if(z< -1.35&&z> -3.25)return(-z-1.35)/1.9*.6;return 0;}
