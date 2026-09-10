import {ITEMS} from './core.mjs';
import {routeTo,guideBearing} from './navigation.mjs';
export function createFeedback(){
 const hud=document.getElementById('hud'),quest=hud.querySelector('.quest');
 const heading=document.createElement('h2');heading.id='quest-title';quest.insertBefore(heading,document.getElementById('objective'));
 const guide=document.createElement('div');guide.id='direction-guide';guide.hidden=true;guide.innerHTML='<span class="guide-arrow">↑</span><div class="guide-label"></div><small>沿可通行的小路 · Tab 再次辨认</small>';hud.appendChild(guide);
 let stage=-1,age=99,guideLeft=0,repath=0,path=[],lastStage=-1;
 function announce(n){stage=n;age=0;guideLeft=0;quest.classList.add('announcing');heading.textContent=n<3?'寻找 '+ITEMS[n].name:'回到井口';}
 function request(){guideLeft=5;repath=0;}
 function update(dt,game,player,yaw){
  if(game.phase!=='playing'){guide.hidden=true;quest.classList.remove('announcing');return;}
  age+=dt;quest.classList.toggle('announcing',age<3);if(stage!==game.stage)announce(game.stage);
  guideLeft=Math.max(0,guideLeft-dt);guide.hidden=guideLeft<=0;if(guide.hidden)return;
  const target=game.stage<3?ITEMS[game.stage]:{x:0,z:-6};const dist=Math.hypot(target.x-player.x,target.z-player.z);
  repath-=dt;if(repath<=0||lastStage!==game.stage){path=routeTo(player,target,feedback.rects||[],['crank crate','cart','altar','Hero_Well'][game.stage]);repath=1;lastStage=game.stage;}
  const nearby=dist<4;const waypoint=path[Math.min(3,path.length-1)];const arrow=guide.querySelector('.guide-arrow');arrow.style.visibility=nearby||!waypoint?'hidden':'visible';if(waypoint)arrow.style.transform=`rotate(${guideBearing(player,waypoint,yaw)}rad)`;
  guide.querySelector('.guide-label').textContent=nearby?(game.stage<3?'物品就在附近 · 寻找金色微光':'井口就在眼前 · 按住 E 跃入'):!waypoint?'先绕开眼前障碍，再按 Tab 辨认方向':(['东侧集市','西侧木车','村尾石坛','水井'][game.stage])+' · '+(path.length*.6>15?'较远':'正在接近');
 }
 const feedback={announce,request,update,rects:[],get state(){return {stage,age,guideLeft,path}}};return feedback;
}
