import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import * as T from 'three';
import {ITEMS,LAMPS} from './core.mjs';
export async function buildProps(v){
 const {scene,world}=v,iron=new T.MeshStandardMaterial({color:0x372f29,roughness:.64,metalness:.65}),wood=new T.MeshStandardMaterial({color:0x49301c,roughness:.83}),stone=new T.MeshStandardMaterial({color:0x495052,roughness:.8}),gold=new T.MeshStandardMaterial({color:0x8a7042,metalness:.45,roughness:.55});
 function mesh(g,m,p,parent=scene){const o=new T.Mesh(g,m);o.position.set(...p);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o}
 const box=(size,pos,mat=wood,parent=scene)=>mesh(new T.BoxGeometry(...size),mat,pos,parent);
 const cyl=(r,h,p,mat=iron,parent=scene)=>mesh(new T.CylinderGeometry(r,r,h,12),mat,p,parent);
 const earth=mesh(new T.PlaneGeometry(180,180),new T.MeshStandardMaterial({color:0x17221d,roughness:1}),[-6,-.18,-21]);earth.rotation.x=-Math.PI/2;earth.castShadow=false;
 const rects=[];const collider=(name,b,pad=.2)=>rects.push({name,minX:b.min.x-pad,maxX:b.max.x+pad,minZ:b.min.z-pad,maxZ:b.max.z+pad});
 for(const n of ['Hero_Well','Stone_Cottage_Left','Stone_Cottage_Rear_Left','Timber_Cottage_Right','Timber_Cottage_Rear_Right','Market_Stall','Market_Barrels','Rear_Barrels',...Array.from({length:5},(_,i)=>'Boundary_Wall_'+i)]){const o=world.getObjectByName(n);if(o)collider(n,new T.Box3().setFromObject(o),n==='Hero_Well'?.12:.18);}
 // The arch is passable in the middle, unlike a single enclosing box.
 for(const x of [-1.7,1.7])rects.push({name:'arch pillar',minX:x-.6,maxX:x+.6,minZ:-15.8,maxZ:-14.2});
 rects.push({name:'tree trunk',minX:-9.85,maxX:-9.15,minZ:.65,maxZ:1.35});
 
 // Extend the playable streets with shared existing meshes, not repeated downloads.
 function cloneAt(name,x,z,label,scale=1){const original=world.getObjectByName(name);if(!original)return null;const copy=original.clone(true);copy.name=label;copy.position.x=x;copy.position.z=z;copy.scale.multiplyScalar(scale);world.add(copy);copy.updateMatrixWorld(true);return copy;}
 for(const x of [-18,-24,-30])for(const z of [0,-6,-12])cloneAt('Paving_2_1',x,z,'West paving '+x+' '+z);
 for(const x of [-6,0,6])for(const z of [-36,-42,-48])cloneAt('Paving_2_1',x,z,'North paving '+x+' '+z);
 for(const [n,x,z,label] of [['Stone_Cottage_Left',-20,-10,'West cottage'],['Timber_Cottage_Right',-30,0,'West rear cottage'],['Stone_Cottage_Left',-6,-35,'North left cottage'],['Timber_Cottage_Right',6,-35,'North right cottage']]){const c=cloneAt(n,x,z,label);if(c)collider(label,new T.Box3().setFromObject(c),.18);}
 cloneAt('Stone_Arch',0,-42,'Second stone arch');for(const x of [-1.7,1.7])rects.push({name:'second arch pillar',minX:x-.6,maxX:x+.6,minZ:-42.8,maxZ:-41.2});
 cloneAt('Foreground_Bare_Tree',-27,-4,'West lonely tree');rects.push({name:'west tree trunk',minX:-27.35,maxX:-26.65,minZ:-4.35,maxZ:-3.65});
 // Clear the centre of the old forest row so the north path does not pass through trunks.
 for(const o of [...world.children])if(o.name.startsWith('Woodland')&&Math.abs(o.position.x)<9)o.position.x=o.position.x<0?-12:12;
 for(const [x,z] of [[-33,0],[-33,-6],[-33,-12],[-25,-15],[-18,-15],[-11,-31],[11,-31],[-11,-40],[11,-40],[-8,-51],[0,-52],[8,-51]])cloneAt('Woodland_0',x,z,'Forest edge '+x+' '+z,.8);
 for(let i=5;i<LAMPS.length;i++){const l=LAMPS[i],copy=cloneAt('Lantern_2',l.x-.25,l.z+.05,'Path lantern '+i);copy?.traverse(o=>{if(o.isMesh){o.material=v.patchMaterial(o.material.clone(),'lantern_post');v.lampMaterials[i]=o.material;}});const point=new T.PointLight(0xff973f,4.5,11,2);point.position.set(l.x,1.95,l.z);v.lamps.push(point);}
 
 // A small outdoor handcart reuses the village's simple wood/iron vocabulary.
 const cart=new T.Group();cart.position.set(-28,.45,-8);cart.rotation.z=-.16;cart.rotation.y=.18;scene.add(cart);
 for(let x=-.65;x<=.66;x+=.22)box([.18,.09,1.5],[x,0,0],wood,cart);
 for(const x of [-.8,.8]){box([.08,.4,1.6],[x,.18,0],wood,cart);const wheel=mesh(new T.TorusGeometry(.44,.07,8,20),iron,[x,-.17,.2],cart);wheel.rotation.y=Math.PI/2;for(let i=0;i<6;i++){const spoke=box([.07,.82,.06],[x,-.17,.2],wood,cart);spoke.rotation.x=i*Math.PI/3;}}
 for(const x of [-.5,.5])box([.08,.08,1.8],[x,.04,1.1],wood,cart);
 rects.push({name:'cart',minX:-28.9,maxX:-27.1,minZ:-8.85,maxZ:-7.05});
 // Crank rests beside, rather than inside, the existing barrel group.
 box([.65,.72,.62],[4.85,.36,-1.75]);for(const y of [.1,.58])box([.69,.06,.65],[4.85,y,-1.75],iron);
 rects.push({name:'crank crate',minX:4.38,maxX:5.32,minZ:-2.22,maxZ:-1.28});
 const altar=new T.Group();altar.position.set(0,0,-46);scene.add(altar);cyl(.83,.18,[0,.09,0],stone,altar);box([1.05,.66,.8],[0,.5,0],stone,altar);box([1.3,.17,1.03],[0,.91,0],stone,altar);
 for(let i=0;i<9;i++){const r=1.1+(i%2)*.35;const rock=mesh(new T.DodecahedronGeometry(.17+(i%3)*.03),stone,[Math.cos(i*2.4)*r,.12,Math.sin(i*2.4)*r],altar);rock.rotation.set(i,i*.4,i*.7)}
 rects.push({name:'altar',minX:-.83,maxX:.83,minZ:-46.65,maxZ:-45.35});
 const itemSupports=[{height:.72,normal:new T.Vector3(0,1,0)},{height:.5,normal:new T.Vector3(Math.sin(.16),Math.cos(.16),0)},{height:.995,normal:new T.Vector3(0,1,0)}];
 const items=[];
 for(let i=0;i<3;i++){const g=new T.Group(),it=ITEMS[i];g.position.set(it.x,it.y,it.z);scene.add(g);
 if(i===0){const bar=cyl(.035,.43,[0,0,0],iron,g);bar.rotation.z=Math.PI/2;const leg=cyl(.035,.22,[.2,-.08,0],iron,g);const grip=cyl(.065,.2,[.2,-.19,.07],wood,g);grip.rotation.x=Math.PI/2;}
 if(i===1){const ring=mesh(new T.TorusGeometry(.105,.025,8,20),gold,[-.11,0,0],g);ring.rotation.x=Math.PI/2;const shaft=cyl(.021,.29,[.07,0,0],gold,g);shaft.rotation.z=Math.PI/2;box([.06,.025,.085],[.2,0,.025],gold,g);box([.045,.025,.065],[.12,0,.015],gold,g);}
 if(i===2){const disc=cyl(.18,.045,[0,0,0],stone,g);const ring=mesh(new T.TorusGeometry(.135,.012,6,28),gold,[0,.028,0],g);ring.rotation.x=Math.PI/2;for(let j=0;j<3;j++){const line=box([.16,.01,.014],[0,.03,0],gold,g);line.rotation.y=j*Math.PI/3;}}
 g.traverse(o=>{if(o.isMesh){o.userData.itemIndex=i;o.material=o.material.clone();}});const source=[];g.traverse(o=>{if(o.isMesh)source.push(o);});for(const o of source){const outline=new T.Mesh(o.geometry,new T.MeshBasicMaterial({color:0xdab86e,side:T.BackSide,depthWrite:false,transparent:true,opacity:.65}));outline.scale.setScalar(1.14);outline.userData.outline=true;o.add(outline);}items.push(g);
 }
 // The seal at the well disappears on completion; there are no item animations.
 const seal=new T.Group();seal.position.set(0,1.63,-6);scene.add(seal);for(const angle of [.7,-.7]){const beam=box([1.3,.065,.085],[0,0,0],iron,seal);beam.rotation.y=angle;}mesh(new T.BoxGeometry(.18,.22,.12),iron,[0,-.05,0],seal);
 const shaft=mesh(new T.CylinderGeometry(.63,.65,10,32,1,true),new T.MeshBasicMaterial({color:0x05090b,side:T.BackSide}),[0,-3.5,-6]);
 function sign(text,pos,rot=0){const c=document.createElement('canvas');c.width=512;c.height=160;const ctx=c.getContext('2d');ctx.fillStyle='#302920';ctx.fillRect(0,0,512,160);ctx.strokeStyle='#77664b';ctx.lineWidth=8;ctx.strokeRect(8,8,496,144);ctx.fillStyle='#d0b78a';ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='42px serif';ctx.fillText(text,256,82);const tex=new T.CanvasTexture(c);tex.colorSpace=T.SRGBColorSpace;const panel=mesh(new T.PlaneGeometry(1.35,.42),new T.MeshStandardMaterial({map:tex,roughness:.95,side:T.DoubleSide}),[pos[0],1.28,pos[1]]);panel.rotation.y=rot;box([.07,1.3,.07],[pos[0],.65,pos[1]],wood);return panel;}
 sign('← 枯树     集市 ↗',[.2,1.2]);sign('旧石门 ↑',[2.8,-10.3]);sign('西路 · 枯树 ←',[-14,1],Math.PI/2);sign('祭坛 ↑',[1.5,-39.2]);
 const canvas=document.createElement('canvas');canvas.width=canvas.height=128;const ctx=canvas.getContext('2d'),grad=ctx.createRadialGradient(64,64,0,64,64,64);grad.addColorStop(0,'rgba(255,173,69,.4)');grad.addColorStop(.7,'rgba(255,144,40,.12)');grad.addColorStop(1,'rgba(255,130,30,0)');ctx.fillStyle=grad;ctx.fillRect(0,0,128,128);const poolTexture=new T.CanvasTexture(canvas);const pools=LAMPS.map((l,i)=>{const o=mesh(new T.PlaneGeometry(l.r*2,l.r*2),new T.MeshBasicMaterial({map:poolTexture,transparent:true,depthWrite:false,opacity:.2,blending:T.AdditiveBlending}),[l.x,i<2?.64:.04,l.z]);o.rotation.x=-Math.PI/2;o.castShadow=false;return o;});
 function update(game,time,hover){items.forEach((g,i)=>{g.visible=i===game.stage;g.traverse(o=>{if(o.isMesh&&!o.userData.outline){for(const m of [o.material].flat()){if(m.emissive){m.emissive.setHex(0xd9a341);m.emissiveIntensity=i===hover?1.4:(.38+.18*Math.sin(time*2.4));}}}});});seal.visible=game.stage<3;pools.forEach((p,i)=>{p.visible=game.activeLamps().includes(i);});}
 
 const detailed={};
 async function detailedProp(file,pos,targetSize,axis,fallback,itemIndex){try{const gltf=await new GLTFLoader().loadAsync('assets/'+file+'.glb');const g=gltf.scene,b=new T.Box3().setFromObject(g),size=b.getSize(new T.Vector3()),center=b.getCenter(new T.Vector3()),factor=targetSize/(axis==='height'?size.y:Math.max(size.x,size.z));g.scale.multiplyScalar(factor);g.position.set(-center.x*factor,-b.min.y*factor,-center.z*factor);const pivot=new T.Group();pivot.position.set(pos[0],0,pos[1]);pivot.add(g);scene.add(pivot);g.traverse(o=>{if(o.isMesh){o.castShadow=o.receiveShadow=true;o.material.roughness=.72;if(o.material.map)o.material.map.anisotropy=4;}});pivot.updateMatrixWorld(true);const ray=new T.Raycaster(new T.Vector3(pos[0],4,pos[1]),new T.Vector3(0,-1,0));const hit=ray.intersectObject(pivot,true)[0];if(hit){const normal=hit.face.normal.clone().transformDirection(hit.object.matrixWorld);if(normal.y<.6)normal.set(0,1,0);itemSupports[itemIndex]={height:hit.point.y,normal};items[itemIndex].position.y=hit.point.y+.04;ITEMS[itemIndex].y=hit.point.y+.04;}fallback.visible=false;detailed[file]={loaded:true,dimensions:new T.Box3().setFromObject(pivot).getSize(new T.Vector3()).toArray(),pickupY:ITEMS[itemIndex].y};}catch(e){console.warn('Detailed prop unavailable: '+file);detailed[file]={loaded:false};}}
 await Promise.all([detailedProp('handcart',[-28,-8],2.8,'width',cart,1),detailedProp('stone_altar',[0,-46],1.02,'height',altar,2)]);
 return {items,itemSupports,seal,shaft,rects,update,cart,altar,detailed};
}
