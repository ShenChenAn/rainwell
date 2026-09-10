import * as T from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

// Clean, small hero meshes replace fused generated details at arm's length.
export function refineHero(v){
 const root=new T.Group();root.name='Well courtyard craftsmanship';v.scene.add(root);
 let seed=417;const rnd=()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296;};
 const c=document.createElement('canvas');c.width=c.height=512;const ctx=c.getContext('2d');ctx.fillStyle='#b1ada2';ctx.fillRect(0,0,512,512);
 for(let i=0;i<27000;i++){const g=80+Math.floor(rnd()*100);ctx.fillStyle=`rgba(${g},${g},${g},.16)`;ctx.fillRect(rnd()*512,rnd()*512,1+rnd()*3,1+rnd()*2);}
 for(let i=0;i<110;i++){ctx.strokeStyle='rgba(35,31,26,.10)';ctx.beginPath();const x=rnd()*512,y=rnd()*512;ctx.moveTo(x,y);ctx.lineTo(x+rnd()*35,y+rnd()*5);ctx.stroke();}
 const tex=new T.CanvasTexture(c);tex.colorSpace=T.SRGBColorSpace;tex.wrapS=tex.wrapT=T.RepeatWrapping;tex.anisotropy=8;
 const bump=tex.clone();bump.colorSpace=T.NoColorSpace;bump.needsUpdate=true;
 const stone=new T.MeshStandardMaterial({map:tex,bumpMap:bump,bumpScale:.018,color:0xe2ded3,roughness:.86,vertexColors:true});
 // Reuse scanned paving texture detail so new blocks belong to the existing village.
 let paving;v.world.traverse(o=>{if(o.isMesh&&o.material.userData.kind==='stone_paving'&&!paving)paving=o.material;});
 if(paving?.map){stone.map=paving.map.clone();stone.map.wrapS=stone.map.wrapT=T.RepeatWrapping;stone.map.repeat.set(.07,.07);stone.map.offset.set(.20,.20);stone.map.needsUpdate=true;stone.color.setHex(0xc9c6bd);}
 const iron=new T.MeshStandardMaterial({color:0x292b28,metalness:.65,roughness:.54});
 const bronze=new T.MeshStandardMaterial({color:0x635039,metalness:.65,roughness:.58});
 function transformed(g,x,y,z,rot=0,color){g.rotateY(rot);g.translate(x,y,z);if(color){const a=new Float32Array(g.attributes.position.count*3);for(let i=0;i<a.length;i+=3){a[i]=color.r;a[i+1]=color.g;a[i+2]=color.b;}g.setAttribute('color',new T.BufferAttribute(a,3));}if(g.index)g=g.toNonIndexed();g.deleteAttribute('uv1');return g;}
 function batch(gs,mat,parent=root){const o=new T.Mesh(mergeGeometries(gs),mat);o.castShadow=o.receiveShadow=true;parent.add(o);return o;}
 const steps=[];v.world.getObjectByName('Courtyard_Steps').visible=false;
 for(let row=0;row<6;row++)for(let col=0;col<7;col++){
  const h=(row+1)*.1;const shade=.9+rnd()*.1;
  steps.push(transformed(new RoundedBoxGeometry(.84-.008-rnd()*.01,h,.322,2,.018),-2.52+col*.84,h/2,-1.51-row*.3167,0,new T.Color(shade,shade*.98,shade*.94)));
 }
 batch(steps,stone);
 // Each lantern has an actual frame, cap, glass chamber and candle, without glowing metal.
 for(let i=0;i<v.lamps.length;i++){
  const old=v.world.getObjectByName(i<5?'Lantern_'+i:'Path lantern '+i);if(old)old.visible=false;
  const p=v.lamps[i].position,base=i<2?.6:0,g=new T.Group();g.name='Crafted lantern '+i;g.position.set(p.x,base,p.z);root.add(g);
  const top=p.y-base,metal=[],trim=[];
  const box=(w,h,d,x,y,z,arr=metal)=>arr.push(transformed(new RoundedBoxGeometry(w,h,d,1,.008),x,y,z));
  metal.push(transformed(new T.CylinderGeometry(.034,.054,top-.38,10),0,(top-.38)/2,0));
  for(const y of [.06,.14,top-.34])trim.push(transformed(new T.CylinderGeometry(y<.2?.12:.07,y<.2?.14:.07,.055,12),0,y,0));
  box(.36,.055,.36,0,top-.28,0);box(.38,.04,.38,0,top+.24,0);
  for(const x of [-.15,.15])for(const z of [-.15,.15])box(.027,.52,.027,x,top-.02,z);
  metal.push(transformed(new T.CylinderGeometry(.025,.29,.21,4),0,top+.36,0,Math.PI/4));
  trim.push(transformed(new T.SphereGeometry(.045,8,6),0,top+.49,0));
  const ring=new T.TorusGeometry(.09,.012,6,16);ring.translate(0,top+.58,0);trim.push(ring.toNonIndexed());
  batch(metal,iron,g);batch(trim,bronze,g);
  const glass=new T.MeshStandardMaterial({color:0x392b17,roughness:.38,metalness:0,emissive:0xff922c,emissiveIntensity:.06,transparent:true,opacity:.2,depthWrite:false});
  glass.userData.fx={lit:{value:1}};
  glass.onBeforeCompile=s=>{s.uniforms.uLit=glass.userData.fx.lit;s.fragmentShader='uniform float uLit;\n'+s.fragmentShader;s.fragmentShader=s.fragmentShader.replace('#include <emissivemap_fragment>','#include <emissivemap_fragment>\ntotalEmissiveRadiance*=uLit;');};
  const chamber=new T.Mesh(new T.BoxGeometry(.27,.44,.27),glass);chamber.position.y=top-.02;g.add(chamber);v.lampMaterials[i]=glass;
  // A narrow warm core gives the light a focal point without a full-screen bloom pass.
  const coreMat=new T.MeshBasicMaterial({color:0xffcb83});coreMat.onBeforeCompile=s=>{s.uniforms.uLit=glass.userData.fx.lit;s.fragmentShader='uniform float uLit;\n'+s.fragmentShader;s.fragmentShader=s.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\ndiffuseColor.rgb*=uLit;');};
  const wax=new T.Mesh(new T.CylinderGeometry(.038,.045,.22,10),new T.MeshStandardMaterial({color:0xbc9b63,roughness:.9}));wax.position.y=top-.15;g.add(wax);
  const flame=new T.Mesh(new T.SphereGeometry(1,10,8),coreMat);flame.scale.set(.026,.073,.026);flame.position.y=top+.005;g.add(flame);

 }
 // Small debris sits outside the walkable stair width; no new route obstruction.
 const chips=[];
 for(let i=0;i<42;i++){const side=i%2?1:-1;const x=side*(3.13+rnd()*.48),z=-1.5-rnd()*7.2,r=.035+rnd()*.07;chips.push(transformed(new T.DodecahedronGeometry(r,0),x,.035,z,rnd()*6,new T.Color(.65+rnd()*.2,.68,.61)));}
 batch(chips,stone);
 // Maintain readable cool depth behind the warm well, without increasing the light count.
 const arch=v.scene.children.find(o=>o.isSpotLight&&!o.castShadow);if(arch){arch.intensity=11;arch.position.set(0,4.5,-16);arch.target.position.set(0,1,-12);}
 root.updateMatrixWorld(true);
 for(const material of [iron,bronze]){const meshes=[];root.traverse(o=>{if(o.isMesh&&o.material===material)meshes.push(o);});const gs=meshes.map(o=>o.geometry.clone().applyMatrix4(o.matrixWorld));for(const o of meshes)o.removeFromParent();batch(gs,material);}
 v.invalidateShadows();v.heroRefinement={lanterns:v.lamps.length,stairBlocks:42,extraLights:0};
}
