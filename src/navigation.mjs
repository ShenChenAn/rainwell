import {collides} from './core.mjs';
// Breadth-first grid route is requested only while the temporary guide is open.
export function routeTo(start,target,rects,targetObstacle=null){
 const step=.6,key=(x,z)=>x+','+z,queue=[{x:start.x,z:start.z,parent:-1}],seen=new Set(['0,0']);let found=-1;
 for(let head=0;head<queue.length&&head<16000;head++){
  const p=queue[head];if(Math.hypot(p.x-target.x,p.z-target.z)<1.8&&Array.from({length:30},(_,i)=>{const t=(i+1)/30,x=p.x+(target.x-p.x)*t,z=p.z+(target.z-p.z)*t;return !rects.some(r=>r.name!==targetObstacle&&x>r.minX&&x<r.maxX&&z>r.minZ&&z<r.maxZ);}).every(Boolean)){found=head;break;}
  for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){const ix=Math.round((p.x-start.x)/step)+dx,iz=Math.round((p.z-start.z)/step)+dz,k=key(ix,iz);if(seen.has(k))continue;seen.add(k);const q={x:start.x+ix*step,z:start.z+iz*step,parent:head};let blocked=false;for(let j=1;j<=5;j++)if(collides({x:p.x+(q.x-p.x)*j/5,z:p.z+(q.z-p.z)*j/5},rects)){blocked=true;break;}if(!blocked)queue.push(q);}
 }
 if(found<0)return [];const path=[];while(found>=0){path.push({x:queue[found].x,z:queue[found].z});found=queue[found].parent;}return path.reverse();
}
export function guideBearing(player,waypoint,yaw){return Math.atan2(waypoint.x-player.x,-(waypoint.z-player.z))+yaw;}
