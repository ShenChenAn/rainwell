import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';

// Outdoor dressing is shared geometry; solid structures contribute real collision bounds.
export async function upgradeVillage(v,props){
 const {scene,world}=v,loader=new GLTFLoader(),catalog={},placements=[];
 const names=['stone_house','timber_house','carriage_shed','market_canopy','stone_wall','shrine_ruin','woodpile','memorial_stones','bare_oak','old_stump'];
 await Promise.all(names.map(async name=>{const g=(await loader.loadAsync('assets/'+name+'.glb')).scene;g.updateMatrixWorld(true);const bounds=new T.Box3().setFromObject(g),size=bounds.getSize(new T.Vector3()),c=bounds.getCenter(new T.Vector3());g.position.sub(new T.Vector3(c.x,bounds.min.y,c.z));const root=new T.Group();root.add(g);root.traverse(o=>{if(!o.isMesh)return;o.castShadow=o.receiveShadow=true;const mats=Array.isArray(o.material)?o.material:[o.material];for(const m of mats){m.roughness=Math.max(.8,m.roughness);m.metalness=Math.min(.15,m.metalness);m.envMapIntensity=.12;for(const key of ['map','normalMap','roughnessMap'])if(m[key])m[key].anisotropy=Math.min(16,v.renderer.capabilities.getMaxAnisotropy());}});catalog[name]={root,size};props.detailed[name]={loaded:true,instances:0};}));
 function addRect(name,minX,maxX,minZ,maxZ){props.rects.push({name,minX,maxX,minZ,maxZ});}
 function place(name,x,z,width,rotation=0,solid=true){const a=catalog[name],g=a.root.clone(true);g.name='Upgrade '+name;g.scale.setScalar(width/Math.max(a.size.x,a.size.z));g.rotation.y=rotation;g.position.set(x,0,z);scene.add(g);g.updateMatrixWorld(true);const b=new T.Box3().setFromObject(g);if(solid)addRect(g.name,b.min.x-.18,b.max.x+.18,b.min.z-.18,b.max.z+.18);props.detailed[name].instances++;placements.push({asset:name,x,z,width,rotation,bounds:[b.min.toArray(),b.max.toArray()]});return {g,b};}
 function replace(label,name,x,z,width,rotation){const old=world.getObjectByName(label);if(old)old.visible=false;props.rects=props.rects.filter(r=>r.name!==label);return place(name,x,z,width,rotation);}
 replace('West cottage','stone_house',-20,-10,6.8,0);
 replace('West rear cottage','timber_house',-30,0,6.6,Math.PI/2);
 replace('North left cottage','stone_house',-6.2,-35,5.5,Math.PI/2);
 replace('North right cottage','timber_house',6.2,-35,5.5,-Math.PI/2);
 // Remove the old low-detail leaf meshes from all player-facing streets.
 for(const o of world.children)if(o.name.startsWith('Woodland')||o.name.startsWith('Forest edge')||o.name==='Foreground_Bare_Tree'||o.name==='West lonely tree')o.visible=false;
 props.rects=props.rects.filter(r=>!['tree trunk','west tree trunk'].includes(r.name));
 function tree(x,z,height,rotation,solid=false){const a=catalog.bare_oak,result=place('bare_oak',x,z,height*Math.max(a.size.x,a.size.z)/a.size.y,rotation,false);if(solid)addRect('oak trunk',x-.38,x+.38,z-.38,z+.38);return result;}
 tree(-9.5,1,7.8,.7,true);tree(-30.7,-4.2,7.2,1.6,true);
 for(const [x,z,h,r] of [[-37,-4,11,1],[-37,-14,9,2],[-32,-23,10,3],[-27,-31,9,1],[-17,-32,11,2],[-12,-43,10,4],[12,-48,11,2],[-9,-55,12,1],[2,-56,11,3],[10,-56,9,4],[18,-31,11,2],[20,-22,10,1],[-18,13,11,4],[17,13,10,3]])tree(x,z,h,r);
 for(const [x,z,w,r] of [[-24.4,-4.7,1.2,.4],[-29,-14,1.1,2],[7.6,-44,1.3,1],[-7.8,-30,1.1,3]])place('old_stump',x,z,w,r);
 // Background buildings close every view without adding inaccessible interiors.
 for(const [n,x,z,w,r] of [['stone_house',16,-6,7,-Math.PI/2],['timber_house',16,-18,6.5,-Math.PI/2],['stone_house',-17,8,7,Math.PI],['timber_house',8,11,7,Math.PI],['timber_house',-22,-31,7,0],['stone_house',-13,-36,6.5,Math.PI/2],['stone_house',14,-43,7,-Math.PI/2]])place(n,x,z,w,r,false);
 // New carriage shelter encloses the existing cart. Its entrance remains open.
 const shed=place('carriage_shed',-28,-8.6,5.2,0,false),b=shed.b;
 addRect('shed left',b.min.x-.1,b.min.x+.28,b.min.z,b.max.z);
 addRect('shed right',b.max.x-.28,b.max.x+.1,b.min.z,b.max.z);
 addRect('shed rear',b.min.x,b.max.x,b.min.z-.1,b.min.z+.3);
 const canopy=place('market_canopy',9,2,4.2,Math.PI,false),cb=canopy.b;
 for(const x of [cb.min.x+.2,cb.max.x-.2])for(const z of [cb.min.z+.2,cb.max.z-.2])addRect('market canopy post',x-.22,x+.22,z-.22,z+.22);
 place('shrine_ruin',0,-49.8,6.3,0,true);
 for(const [x,z,r] of [[-4.9,-46,.3],[4.7,-46,-.3],[5.4,-42.7,-.2]])place('memorial_stones',x,z,2.2,r);
 for(const [x,z,r] of [[-23.9,-10.5,Math.PI/2],[-25.1,-1.8,0],[11.6,-9,Math.PI/2],[-8.2,-28.8,0],[8.1,-31,Math.PI/2]])place('woodpile',x,z,2.1,r);
 function wall(x,z,r=0,width=3.8){place('stone_wall',x,z,width,r,true);}
 addRect('canopy counter',cb.min.x+.15,cb.max.x-.15,cb.min.z,cb.min.z+.5);
 // Boundaries follow the walkable map; leave the main entrance and connecting lanes open.
 for(const z of [3,-1,-5,-9,-13,-17,-21])wall(13.9,z,Math.PI/2);
 for(const x of [-11,-7,7,11])wall(x,7.1);
 for(const z of [-2,-6,-10])wall(-33,z,Math.PI/2);
 for(const x of [-15,-19,-23])wall(x,3.05);
 for(const z of [-29.1,-39.7,-44,-48]){wall(-9,z,Math.PI/2);wall(9,z,Math.PI/2);}
 for(const x of [-27.5,-23.5,-19.5,-15.5,-11.5])wall(x,-27.3);
 for(const x of [-5.8,5.8])wall(x,-49.8,0,4.6);
 // A paved return lane makes west -> north a loop, rather than two dead ends.
 const tile=world.getObjectByName('Paving_2_1');
 if(tile)for(const x of [-27,-21,-15,-9])for(const z of [-18,-24]){const g=tile.clone(true);g.position.x=x;g.position.z=z;g.name='Return lane paving';world.add(g);}
 // Reproducible ground texture and small instanced details break up large flat areas.
 let seed=961;const rand=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
 const canvas=document.createElement('canvas');canvas.width=canvas.height=1024;const ctx=canvas.getContext('2d');ctx.fillStyle='#293029';ctx.fillRect(0,0,1024,1024);
 for(let i=0;i<45000;i++){const c=25+Math.floor(rand()*35);ctx.fillStyle=`rgba(${c},${c+4},${c-5},.4)`;ctx.fillRect(rand()*1024,rand()*1024,1+rand()*5,1+rand()*5);}
 const tex=new T.CanvasTexture(canvas);tex.colorSpace=T.SRGBColorSpace;tex.wrapS=tex.wrapT=T.RepeatWrapping;tex.repeat.set(32,32);tex.anisotropy=16;
 const ground=scene.children.find(o=>o.isMesh&&o.geometry.type==='PlaneGeometry'&&o.geometry.parameters.width===180);if(ground){ground.material.map=tex;ground.material.color.set(0x727b70);ground.material.needsUpdate=true;}
 // Damp enclosed garden breaks the broad paved connector into a readable lane.
 const bedMaterial=new T.MeshStandardMaterial({map:tex,color:0x87957b,roughness:.98});const bed=new T.Mesh(new T.PlaneGeometry(7,5),bedMaterial);bed.rotation.x=-Math.PI/2;bed.position.set(-18,.07,-17);bed.receiveShadow=true;scene.add(bed);
 const curbMaterial=new T.MeshStandardMaterial({color:0x40484a,roughness:.8});
 for(const [x,z,w,d]of[[-18,-19.5,7,.18],[-18,-14.5,7,.18],[-21.5,-17,.18,5],[-14.5,-17,.18,5]]){const curb=new T.Mesh(new T.BoxGeometry(w,.18,d),curbMaterial);curb.position.set(x,.13,z);curb.receiveShadow=curb.castShadow=true;scene.add(curb);}
 const object=new T.Object3D(),stoneMat=new T.MeshStandardMaterial({color:0x535652,roughness:.85});
 const rubble=new T.InstancedMesh(new T.DodecahedronGeometry(1,0),stoneMat,420);rubble.castShadow=true;rubble.receiveShadow=true;scene.add(rubble);
 const edgePoints=[];
 for(let i=0;i<420;i++){let x,z;if(i<160){x=(i%2?1:-1)*(8+rand()*.5);z=-26-rand()*23;}else if(i<290){x=-31+rand()*19;z=-25.7+rand()*.7;}else{x=12.4+rand()*.7;z=5-rand()*27;}edgePoints.push([x,z]);object.position.set(x,.025,z);object.rotation.set(rand()*3,rand()*6,rand()*3);object.scale.set(.05+rand()*.14,.035+rand()*.09,.07+rand()*.2);object.updateMatrix();rubble.setMatrixAt(i,object.matrix);}rubble.instanceMatrix.needsUpdate=true;
 const grassGeo=new T.BufferGeometry(),verts=[];for(let j=0;j<3;j++){const a=j*Math.PI/3,dx=Math.cos(a)*.025,dz=Math.sin(a)*.025;verts.push(-dx,0,-dz,dx,0,dz,dx*1.8,.27,dz*1.8);};grassGeo.setAttribute('position',new T.Float32BufferAttribute(verts,3));grassGeo.computeVertexNormals();
 const grass=new T.InstancedMesh(grassGeo,new T.MeshStandardMaterial({color:0x25352a,roughness:.92,side:T.DoubleSide}),1400);grass.receiveShadow=true;scene.add(grass);
 for(let i=0;i<1400;i++){const p=edgePoints[i%edgePoints.length];object.position.set(p[0]+(rand()-.5)*.9,.015,p[1]+(rand()-.5)*.8);object.rotation.set(0,rand()*6.28,0);object.scale.setScalar(.4+rand()*.9);object.updateMatrix();grass.setMatrixAt(i,object.matrix);}grass.instanceMatrix.needsUpdate=true;
 // Shallow broken puddles catch the sky locally; normal ripples retain rain detail.
 const wet=new T.MeshPhysicalMaterial({color:0x172b32,metalness:0,roughness:.48,clearcoat:.12,clearcoatRoughness:.4,envMapIntensity:.18,transparent:true,opacity:.3,depthWrite:false});
 wet.onBeforeCompile=s=>{s.uniforms.uRainTime={value:0};wet.userData.shader=s;s.vertexShader='varying vec3 vRainPos; varying vec2 vPuddleUv;\n'+s.vertexShader;s.vertexShader=s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvRainPos=(modelMatrix*vec4(position,1.)).xyz;vPuddleUv=position.xy;');s.fragmentShader='varying vec3 vRainPos;varying vec2 vPuddleUv;uniform float uRainTime;\n'+s.fragmentShader;s.fragmentShader=s.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\ndiffuseColor.a*=1.-smoothstep(.72,1.12,length(vPuddleUv));');s.fragmentShader=s.fragmentShader.replace('#include <normal_fragment_maps>','#include <normal_fragment_maps>\nnormal=normalize(normal+vec3(sin(vRainPos.x*54.+uRainTime*2.1),cos(vRainPos.z*51.-uRainTime*1.7),0.)*.023);');};
 for(const [x,z,sx,sz] of [[-1,1,1.8,.5],[1.8,-1,1,.35],[-12,-4,1.4,.35],[-18,-3,1.7,.45],[-25,-5,1.2,.55],[-26,-19,1.4,.5],[-16,-23,1.7,.6],[0,-25,1.2,.6],[1,-31,1.1,.35],[0,-40,1.5,.45],[2.8,-44,1,.5],[9,4,1.4,.6]]){const shape=new T.Shape();for(let i=0;i<64;i++){const a=i/64*Math.PI*2,r=1+Math.sin(i*.3)*.06+Math.sin(i*.7)*.04;const px=Math.cos(a)*r,py=Math.sin(a)*r;if(i===0)shape.moveTo(px,py);else shape.lineTo(px,py);}shape.closePath();const puddle=new T.Mesh(new T.ShapeGeometry(shape),wet);puddle.scale.set(sx,sz,1);puddle.rotation.x=-Math.PI/2;puddle.position.set(x,.036,z);puddle.receiveShadow=true;scene.add(puddle);}
 // The dark cloud canopy replaces an empty clear sky, with slow procedural drift.
 const sky=new T.Mesh(new T.SphereGeometry(90,40,24),new T.ShaderMaterial({side:T.BackSide,depthWrite:false,uniforms:{uTime:{value:0}},vertexShader:'varying vec3 vP;void main(){vP=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'varying vec3 vP;uniform float uTime;float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}void main(){vec3 d=normalize(vP);vec2 p=d.xz/max(.15,d.y+.3)*2.;float n=noise(p+uTime*.003)*.6+noise(p*2.3)*.3+noise(p*5.)*.1;vec3 c=mix(vec3(.008,.018,.027),vec3(.027,.046,.065),n);c*=.22*(.7+.3*max(0.,d.y));gl_FragColor=vec4(c,1.);}'}));sky.position.set(-8,0,-20);scene.add(sky);
 v.invalidateShadows();props.environment={placements};const previous=props.update;props.update=(game,time,hover)=>{previous(game,time,hover);if(wet.userData.shader)wet.userData.shader.uniforms.uRainTime.value=time;sky.material.uniforms.uTime.value=time;};
 return {catalog,placements};
}
