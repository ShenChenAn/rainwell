import {lampFlicker} from './weather.mjs';
import { SMAAPass } from 'three/addons/postprocessing/SMAAPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import * as T from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { Reflector } from 'three/addons/objects/Reflector.js';


export async function createVillage(container,onProgress=()=>{}){

const scene=new T.Scene();scene.background=new T.Color('#07131d');scene.fog=new T.FogExp2('#071017',.035);
const renderer=new T.WebGLRenderer({antialias:false,powerPreference:'high-performance'});renderer.setPixelRatio(1);renderer.setSize(innerWidth,innerHeight);renderer.toneMapping=T.AgXToneMapping;renderer.toneMappingExposure=.88;renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFShadowMap;renderer.info.autoReset=false;container.appendChild(renderer.domElement);
const camera=new T.PerspectiveCamera(65,innerWidth/innerHeight,.08,130);camera.position.set(1,2,2.5);camera.lookAt(0,2,-6);
const composer=new EffectComposer(renderer);composer.addPass(new RenderPass(scene,camera));const bloom=new UnrealBloomPass(new T.Vector2(innerWidth,innerHeight),.055,.28,1.8);composer.addPass(bloom);const antialias=new SMAAPass();composer.addPass(antialias);composer.addPass(new OutputPass());
const threat=new ShaderPass({uniforms:{tDiffuse:{value:null},uThreat:{value:0},uLightning:{value:0}},vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',fragmentShader:'uniform sampler2D tDiffuse;uniform float uThreat;uniform float uLightning;varying vec2 vUv;void main(){vec4 c=texture2D(tDiffuse,vUv);vec2 p=(vUv-.5)*2.;float r=length(p);float inner=mix(.95,.43,uThreat);float outer=inner+.33;float edge=smoothstep(inner,outer,r);float opacity=.86*(1.-exp(-3.2*uThreat));c.rgb=mix(c.rgb*(1.+uLightning*.60),vec3(.62,.75,.86),uLightning*.18);c.rgb*=1.-edge*opacity;gl_FragColor=c;}'});composer.addPass(threat);
// Dim blue environment, with broad soft sources for wet-surface highlights.
const envScene=new T.Scene();envScene.background=new T.Color('#223744');const envMat=new T.MeshBasicMaterial({color:0x92bcd0,side:T.DoubleSide});for(const [x,y,z,sx,sy] of [[-8,10,4,8,8],[4,5,-12,4,7]]){const p=new T.Mesh(new T.PlaneGeometry(sx,sy),envMat);p.position.set(x,y,z);p.lookAt(0,0,0);envScene.add(p)}const pmrem=new T.PMREMGenerator(renderer);scene.environment=pmrem.fromScene(envScene,.02).texture;scene.environmentIntensity=.18;
scene.add(new T.HemisphereLight(0x506873,0x090807,.12));
const moon=new T.DirectionalLight(0x7396a3,.34);moon.position.set(-25,35,0);moon.target.position.set(-9,0,-23);scene.add(moon,moon.target);moon.castShadow=true;Object.assign(moon.shadow.camera,{left:-39,right:39,top:39,bottom:-39,near:.5,far:105});moon.shadow.mapSize.set(4096,4096);moon.shadow.bias=-.00015;moon.shadow.normalBias=.035;
const archLight=new T.SpotLight(0x507e8a,7,16,.8,.85,2);archLight.position.set(0,4.5,-19);archLight.target.position.set(0,1,-13);scene.add(archLight,archLight.target);
const lanternPositions=[[-2.45,2.55,-4.75],[2.45,2.55,-7.85],[2.85,1.95,.55],[-4.95,1.95,-11.25],[4.25,1.95,-12.95]];const lamps=[],lampMaterials=[];
lanternPositions.forEach((p,i)=>{const l=new T.PointLight(0xffaa62,4.5,7,2);l.position.set(...p);lamps.push(l)});
const lightPool=Array.from({length:3},()=>{const l=new T.PointLight(0xffaa62,0,7,2);scene.add(l);return l;});
// One warm shadow source gives contact and readable structure without five cubemap shadows.
const key=new T.SpotLight(0xffb377,7,12,.86,.85,2);key.position.set(-3.4,4,-1);key.target.position.set(0,1,-6);key.castShadow=true;key.shadow.mapSize.set(1024,1024);key.shadow.bias=-.0001;key.shadow.normalBias=.025;scene.add(key,key.target);
const lightning=new T.DirectionalLight(0xb9dfff,0);lightning.position.set(5,15,-10);scene.add(lightning);
function patchMaterial(m,kind){
 const mat=new T.MeshStandardMaterial();T.MeshStandardMaterial.prototype.copy.call(mat,m);mat.name=m.name;mat.userData={...m.userData};mat.roughness=kind==='stone_paving'||kind==='stone_steps'?.82:.78;mat.metalness=kind==='lantern_post'?.18:0;mat.envMapIntensity=.16;
 if(mat.map)mat.map.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
 mat.userData.fx={time:{value:0},lit:{value:1}};
 mat.onBeforeCompile=s=>{s.uniforms.uWetTime=mat.userData.fx.time;s.uniforms.uLit=mat.userData.fx.lit;s.vertexShader='varying vec3 vLocalPos; varying vec3 vWorldPos;\n'+s.vertexShader;s.vertexShader=s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvLocalPos=position; vWorldPos=(modelMatrix*vec4(position,1.0)).xyz;');s.fragmentShader='varying vec3 vLocalPos; varying vec3 vWorldPos; uniform float uWetTime; uniform float uLit;\n'+s.fragmentShader;
 s.fragmentShader=s.fragmentShader.replace('#include <normal_fragment_maps>', '#include <normal_fragment_maps>\nfloat microH=.00012*sin(vWorldPos.x*130.)*sin(vWorldPos.y*117.+vWorldPos.z*123.);vec3 qx=dFdx(-vViewPosition),qy=dFdy(-vViewPosition);vec3 rx=cross(qy,normal),ry=cross(normal,qx);float det=dot(qx,rx);normal=normalize(abs(det)*normal-sign(det)*(dFdx(microH)*rx+dFdy(microH)*ry));');
 s.fragmentShader=s.fragmentShader.replace('#include <roughnessmap_fragment>','#include <roughnessmap_fragment>\nfloat wetNoise=sin(vWorldPos.x*5.7+sin(vWorldPos.z*3.2))*sin(vWorldPos.z*6.1); roughnessFactor=clamp(roughnessFactor+wetNoise*.06,.55,.95);');
 if(kind==='stone_cottage'||kind==='lantern_post'){
 s.fragmentShader=s.fragmentShader.replace('#include <emissivemap_fragment>',`#include <emissivemap_fragment>\nfloat glowMask=smoothstep(.18,.32,diffuseColor.r-diffuseColor.b)*smoothstep(.3,.55,diffuseColor.r); ${kind==='lantern_post'?'glowMask*=smoothstep(1.1,1.6,vWorldPos.y);':''} totalEmissiveRadiance+=vec3(1.,.36,.075)*glowMask*${kind==='lantern_post'?'1.35*uLit':'.10'};`);
 }
 };
 mat.customProgramCacheKey=()=>kind;return mat;
}
// A single planar reflection, masked to irregular shallow puddles.
const shader={uniforms:{...T.UniformsUtils.clone(Reflector.ReflectorShader.uniforms),uTime:{value:0}},vertexShader:Reflector.ReflectorShader.vertexShader.replace('varying vec4 vUv;','varying vec4 vUv; varying vec3 vWorld;').replace('vUv = textureMatrix','vWorld=(modelMatrix*vec4(position,1.0)).xyz; vUv = textureMatrix'),fragmentShader:`uniform sampler2D tDiffuse;uniform float uTime;varying vec4 vUv;varying vec3 vWorld;
 float ellipse(vec2 p,vec2 c,vec2 r){return 1.-smoothstep(.65,1.,length((p-c)/r));}
 void main(){vec2 p=vWorld.xz;float mask=0.;mask+=ellipse(p,vec2(-1.,1.),vec2(1.5,.48));mask+=ellipse(p,vec2(1.5,-1.2),vec2(.95,.6));mask+=ellipse(p,vec2(-3.1,-1.3),vec2(.65,.4));mask+=ellipse(p,vec2(3.9,-3.4),vec2(1.2,.4));mask+=ellipse(p,vec2(-2.6,-10.),vec2(1.,.6));mask*=.8+.2*sin(p.x*27.+sin(p.y*22.));if(mask<.025)discard;vec2 uv=vUv.xy/vUv.w;uv+=vec2(sin(p.y*42.+uTime*2.),cos(p.x*37.-uTime*2.))*.0007;vec3 c=texture2D(tDiffuse,uv).rgb*.4;c+=texture2D(tDiffuse,uv+vec2(.0018,0.)).rgb*.15;c+=texture2D(tDiffuse,uv-vec2(.0018,0.)).rgb*.15;c+=texture2D(tDiffuse,uv+vec2(0.,.0018)).rgb*.15;c+=texture2D(tDiffuse,uv-vec2(0.,.0018)).rgb*.15;gl_FragColor=vec4(c*.7,clamp(mask*.68,0.,.7));}`};
const reflector=new Reflector(new T.PlaneGeometry(32,46),{textureWidth:512,textureHeight:288,clipBias:.003,multisample:0,shader});reflector.rotation.x=-Math.PI/2;reflector.position.set(0,.025,-10);reflector.material.transparent=true;reflector.material.depthWrite=false;scene.add(reflector);
// Rain is geometry in world space: each streak falls and wraps as one segment.
const count=2200,pos=new Float32Array(count*6),seed=[];let randomSeed=731;function rnd(){randomSeed=(randomSeed*1664525+1013904223)>>>0;return randomSeed/4294967296}
for(let i=0;i<count;i++)seed.push([rnd()*30-15,rnd()*12,rnd()*39-30,.08+rnd()*.16]);const rg=new T.BufferGeometry();rg.setAttribute('position',new T.BufferAttribute(pos,3));const rain=new T.LineSegments(rg,new T.LineBasicMaterial({color:0x8aaebb,transparent:true,opacity:.19,depthWrite:false}));rain.frustumCulled=false;scene.add(rain);
function updateRain(t){for(let i=0;i<count;i++){const s=seed[i],y=((s[1]-t*8)%12+12)%12,k=i*6;const x=((s[0]-camera.position.x+15)%30+30)%30+camera.position.x-15,z=((s[2]-camera.position.z+19.5)%39+39)%39+camera.position.z-19.5;const covered=(x>-30.6&&x< -25.4&&z>-10.8&&z< -6.3&&y<4.1)||(x>7.3&&x<10.7&&z>-.1&&z<4.1&&y<3.3),rainY=covered?-50:y;pos[k]=x;pos[k+1]=rainY;pos[k+2]=z;pos[k+3]=x+.026;pos[k+4]=rainY-s[3];pos[k+5]=z+.01}rg.attributes.position.needsUpdate=true;}
const world=await new Promise((resolve,reject)=>new GLTFLoader().load('assets/village.glb',g=>resolve(g.scene),e=>onProgress(e.total?e.loaded/e.total:0),reject));
scene.add(world);world.updateMatrixWorld(true);
const sourceTile=world.getObjectByName('Paving_2_1');let sourceMesh;sourceTile.traverse(o=>{if(o.isMesh&&!sourceMesh)sourceMesh=o;});
const baked=(await new GLTFLoader().loadAsync('assets/floor-baked.glb')).scene;baked.updateMatrixWorld(true);let bakedMesh;baked.traverse(o=>{if(o.isMesh&&!bakedMesh)bakedMesh=o;});
const bakedGeometry=bakedMesh.geometry.clone().applyMatrix4(new T.Matrix4().copy(sourceMesh.matrixWorld).invert().multiply(bakedMesh.matrixWorld));
const originalGeometry=sourceMesh.geometry;let replacedFloors=0;world.traverse(o=>{if(o.isMesh&&o.geometry===originalGeometry){o.geometry=bakedGeometry;o.material=bakedMesh.material;o.material.userData.kind='stone_paving';replacedFloors++;}});
const mats=new Map();
world.traverse(o=>{if(!o.isMesh)return;const base=o.material,kind=base.userData.kind||'';if(!mats.has(base))mats.set(base,patchMaterial(base,kind));o.material=mats.get(base);if(kind==='foliage')o.material.color.setScalar(.4);o.castShadow=kind!=='stone_paving';o.receiveShadow=true;});
for(let i=0;i<5;i++)world.getObjectByName('Lantern_'+i)?.traverse(o=>{if(o.isMesh){o.material=patchMaterial(o.material.clone(),'lantern_post');lampMaterials[i]=o.material;}});
moon.shadow.autoUpdate=false;key.shadow.autoUpdate=false;moon.shadow.needsUpdate=true;key.shadow.needsUpdate=true;
let quality='balanced',reflectionWanted=false,adaptiveScale=1,frameAverage=16.7,slowFrames=0,fastFrames=0;
function resize(){camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();const cap=quality==='high'?2560:1920;const scale=Math.min(quality==='high'?(devicePixelRatio||1):1,cap/innerWidth,(quality==='high'?1440:1080)/innerHeight)*adaptiveScale;renderer.setPixelRatio(scale);renderer.setSize(innerWidth,innerHeight);composer.setPixelRatio(scale);composer.setSize(innerWidth,innerHeight);bloom.setSize(Math.max(1,innerWidth*scale*.5),Math.max(1,innerHeight*scale*.5));bloom.enabled=quality==='high';reflector.visible=reflectionWanted&&quality==='high';}
function setQuality(q,reflect=false){quality=q;reflectionWanted=reflect;adaptiveScale=1;slowFrames=fastFrames=0;resize();}
function setLamps(active,pending,time,stage=0){for(let i=0;i<lamps.length;i++){const warning=pending.find(p=>p.id===i);const enabled=active.includes(i);const flash=lampFlicker(stage,time,i,warning?warning.left:null);lamps[i].intensity=enabled?4.5*flash:0;if(lampMaterials[i])lampMaterials[i].userData.fx.lit.value=enabled?flash:0;}const on=active.includes(0);key.intensity=on?7:0;}
function adaptFrame(ms){if(quality==='high'||document.hidden||ms<4||ms>120)return;frameAverage=frameAverage*.95+ms*.05;if(frameAverage>24){slowFrames++;fastFrames=0;}else if(frameAverage<18){fastFrames++;slowFrames=0;}else{slowFrames=fastFrames=0;}if(slowFrames>=90&&adaptiveScale>.75){adaptiveScale=Math.max(.75,adaptiveScale-.05);slowFrames=0;resize();}else if(fastFrames>=600&&adaptiveScale<1){adaptiveScale=Math.min(1,adaptiveScale+.05);fastFrames=0;resize();}}
function draw(time){const closest=lamps.filter(l=>l.intensity>0).sort((a,b)=>a.position.distanceToSquared(camera.position)-b.position.distanceToSquared(camera.position));for(let i=0;i<lightPool.length;i++){const src=closest[i],dst=lightPool[i];dst.intensity=src?src.intensity:0;if(src)dst.position.copy(src.position);}updateRain(time);reflector.material.uniforms.uTime.value=time;renderer.info.reset();composer.render();}
addEventListener('resize',resize);setQuality('balanced');
function invalidateShadows(){moon.shadow.needsUpdate=true;key.shadow.needsUpdate=true;}
return {floorOptimization:{replacedFloors,trianglesPerTile:bakedGeometry.index.count/3},adaptFrame,get renderScale(){return adaptiveScale},invalidateShadows,scene,camera,renderer,composer,threat,world,lamps,lampMaterials,moon,lightning,reflector,setQuality,setLamps,draw,resize,patchMaterial};
}
