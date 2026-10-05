// Each stage increases cadence while retaining irregular gaps between storms.
export const STORM_GAPS=[[18,30],[10,16],[5,8],[2,3]];
export function stormGap(stage,random=Math.random()){
 const [min,max]=STORM_GAPS[Math.max(0,Math.min(3,stage))];
 return min+(max-min)*random;
}
export function lampFlicker(stage,time,index,warningLeft=null){
 if(index===0)return 1;
 const s=Math.max(0,Math.min(3,stage)),phase=index*1.73;
 if(warningLeft!==null){
  const hz=[1.1,1.4,1.8,2.1][s]+(warningLeft<3?.7:0);
  return .35+.65*(.5+.5*Math.sin(time*hz*Math.PI*2+phase));
 }
 const hz=[.3,.48,.72,1.05][s],depth=[.10,.14,.19,.24][s];
 return 1-depth*(.5+.5*Math.sin(time*hz*Math.PI*2+phase+Math.sin(time*.37+phase)*.65));
}

// Weather advances in active wall time, independently of the movement step cap.
export class StormTimeline{
 constructor(random=Math.random){this.random=random;this.reset(0);}
 reset(stage,{opening=false}={}){this.opening=opening;this.time=0;this.stage=stage;this.next=opening?1:Math.min(7,stormGap(stage,this.random())*.65);this.pending=null;this.flashAt=-Infinity;this.flashes=0;this.thunders=0;}
 update(dt,stage){
  this.time+=Math.max(0,dt);
  if(stage!==this.stage){this.stage=stage;this.next=Math.min(this.next,this.time+stormGap(stage,this.random()));}
  const events=[];
  if(this.pending&&this.time>=this.pending.at){events.push({type:'thunder',near:this.pending.near});this.thunders++;this.pending=null;}
  if(this.time>=this.next){
   const near=this.opening||this.random()<[.25,.35,.5,.65][stage];this.opening=false;
   this.flashAt=this.time;this.flashes++;events.push({type:'flash',near});
   this.pending={at:this.time+(near?.22:.7+this.random()*1.2),near};
   this.next=this.time+stormGap(stage,this.random());
  }
  return events;
 }
 get flash(){const age=this.time-this.flashAt;return age<.75?Math.exp(-Math.max(0,age-.12)*5):0;}
}
