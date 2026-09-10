import {EXRLoader} from 'three/addons/loaders/EXRLoader.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import * as T from 'three';
import {RectAreaLightUniformsLib} from 'three/addons/lights/RectAreaLightUniformsLib.js';
export async function matchReference(v){
 const original=(await new GLTFLoader().loadAsync('assets/hero-medium.glb')).scene;original.updateMatrixWorld(true);v.world.updateMatrixWorld(true);
 const source={};original.traverse(o=>{if(o.isMesh)source[o.material.userData.kind]=o;});const high={},lod=[];
 v.world.traverse(o=>{if(!o.isMesh)return;const kind=o.material.userData.kind,src=source[kind];if(!src)return;if(!high[kind])high[kind]=src.geometry.clone();lod.push({mesh:o,low:o.geometry,high:high[kind],center:new T.Box3().setFromObject(o).getCenter(new T.Vector3()),active:false});});
 const crafted=v.scene.getObjectByName('Well courtyard craftsmanship');if(crafted)crafted.visible=false;v.world.getObjectByName('Courtyard_Steps').visible=true;
 for(let i=0;i<v.lamps.length;i++){const o=v.world.getObjectByName(i<5?'Lantern_'+i:'Path lantern '+i);if(o){o.visible=true;o.traverse(m=>{if(m.isMesh)m.material.userData.fx.lit=v.lampMaterials[i].userData.fx.lit;});}}
 RectAreaLightUniformsLib.init();const loader=new T.TextureLoader(),textures={};
 for(const kind of ['hero_well','stone_cottage','timber_cottage']){textures[kind]={};for(const type of ['normal','roughness','ao']){const t=await loader.loadAsync(`assets/materials/${kind}-${type}.png`);t.flipY=false;t.colorSpace=T.NoColorSpace;t.anisotropy=8;textures[kind][type]=t;}textures[kind].stages=[];for(let stage=0;stage<4;stage++){const t=await new EXRLoader().loadAsync(`assets/materials/${kind}-stage${stage}.exr`);t.flipY=true;textures[kind].stages.push(t);}textures[kind].light=textures[kind].stages[0];}
 for(const kind of Object.keys(source)){textures[kind]??={};const t=await loader.loadAsync(`assets/materials/${kind}-medium-normal.png`);t.flipY=false;t.colorSpace=T.NoColorSpace;t.anisotropy=8;textures[kind].normal=t;}
 const courts=[];for(let stage=0;stage<4;stage++)courts.push(await new EXRLoader().loadAsync(`assets/materials/court-stage${stage}.exr`));const courtUniform={value:courts[0]};
 const replacements=new Map();v.world.traverse(o=>{if(!o.isMesh)return;const old=o.material,kind=old.userData.kind||'';if(!replacements.has(old)){
  const m=['hero_well','stone_paving'].includes(kind)?new T.MeshPhysicalMaterial():new T.MeshStandardMaterial();T.MeshStandardMaterial.prototype.copy.call(m,old);m.userData={...old.userData};m.onBeforeCompile=old.onBeforeCompile;m.customProgramCacheKey=old.customProgramCacheKey;
  const maps=textures[kind];if(maps){m.normalMap=maps.normal;m.normalScale.set(1,1);m.roughnessMap=maps.roughness||null;m.roughness=maps.roughness?1:.65;m.aoMap=maps.ao||null;m.aoMapIntensity=.65;m.lightMap=maps.light||null;m.lightMapIntensity=Math.PI;}
  else m.roughness=['stone_paving','stone_steps'].includes(kind)?.34:.65;
  m.clearcoat=kind==='stone_paving'?.42:kind==='hero_well'?.22:.07;m.clearcoatRoughness=kind==='stone_paving'?.16:.22;m.envMapIntensity=kind==='stone_paving'?.8:.35;if(kind==='stone_paving')m.envMap=v.scene.environment;
  const prev=m.onBeforeCompile;m.onBeforeCompile=function(s,r){prev.call(this,s,r);if(maps?.stages)s.fragmentShader=s.fragmentShader.replace('#include <lights_fragment_end>','#include <lights_fragment_end>\nreflectedLight.directDiffuse*=.18;');if(kind==='stone_paving'){s.uniforms.uCourtLight=courtUniform;s.fragmentShader='uniform sampler2D uCourtLight;\n'+s.fragmentShader;s.fragmentShader=s.fragmentShader.replace('#include <lights_fragment_maps>',`#include <lights_fragment_maps>
vec2 courtUv=vec2((vWorldPos.x+3.)/6.,(-vWorldPos.z-3.25)/5.75);float inCourt=step(0.,courtUv.x)*step(courtUv.x,1.)*step(0.,courtUv.y)*step(courtUv.y,1.)*step(.4,vWorldPos.y);irradiance+=texture2D(uCourtLight,clamp(courtUv,0.,1.)).rgb*3.14159*inCourt;`);s.fragmentShader=s.fragmentShader.replace('#include <lights_fragment_end>','#include <lights_fragment_end>\nreflectedLight.directDiffuse*=mix(1.,.18,inCourt);');}s.fragmentShader=s.fragmentShader.replace('roughnessFactor=clamp(roughnessFactor+wetNoise*.06,.55,.95);','roughnessFactor=clamp(roughnessFactor+wetNoise*.07,.23,.88);');if(kind==='stone_paving'){
 s.fragmentShader=s.fragmentShader.replace('microH=.00012','microH=.00018');
 s.fragmentShader=s.fragmentShader.replace('roughnessFactor=clamp(roughnessFactor+wetNoise*.07,.23,.88);',`float wetPatch=smoothstep(-.12,.6,sin(vWorldPos.x*1.37+sin(vWorldPos.z*.91))*sin(vWorldPos.z*1.53+sin(vWorldPos.x*.71)));roughnessFactor=mix(.61,.18,wetPatch);`);
 
 }if(kind==='stone_cottage')s.fragmentShader=s.fragmentShader.replace('glowMask*.10','glowMask*.7');};m.customProgramCacheKey=()=>kind+'-reference-material-v1';replacements.set(old,m);
 }o.material=replacements.get(old);});
 v.scene.environmentIntensity=.24;v.scene.fog.color.set('#102630');v.scene.fog.density=.021;
 v.renderer.toneMappingExposure=.50;
 const stageExposure=[.50,.37,.27,.20];let lastLightTime=null;
 const hemi=v.scene.children.find(o=>o.isHemisphereLight);hemi.intensity=.22;
 v.moon.color.set('#7cb8d0');v.moon.intensity=.68;
 function area(name,pos,target,color,intensity,w,h){const l=new T.RectAreaLight(color,intensity,w,h);l.name=name;l.position.set(...pos);l.lookAt(...target);v.scene.add(l);return l;}
 // Cold diffuse lighting is supplied by the baked irradiance.
 const warm=area('Reference well',[-4,5,-1],[0,1.6,-6],0xffb574,2.5,3,3);
 const arch=v.scene.children.find(o=>o.isSpotLight&&!o.castShadow);if(arch)arch.intensity=0;
 const set=v.setLamps;v.setLamps=(active,pending,time,progress)=>{set(active,pending,time,progress);const lightStage=Number.isInteger(progress)?Math.max(0,Math.min(3,progress)):0;const lightDt=lastLightTime===null?0:Math.max(0,Math.min(2,time-lastLightTime));lastLightTime=time;v.renderer.toneMappingExposure=T.MathUtils.lerp(v.renderer.toneMappingExposure,stageExposure[lightStage],1-Math.exp(-lightDt/1.1));for(const l of v.lamps)l.intensity*=1.6;warm.intensity=active.includes(0)?2.5:0;const stage=active.includes(2)?0:active.includes(1)?1:active.includes(3)?2:3;for(const [old,m] of replacements){const maps=textures[old.userData.kind];if(maps?.stages)m.lightMap=maps.stages[stage];}courtUniform.value=courts[stage];};
 // Dense distant woodland restores the backdrop seen in the reference, outside playable paths.
 const forest=(await new GLTFLoader().loadAsync('assets/forest-original.glb')).scene;let forestGeo;forest.traverse(o=>{if(o.isMesh)forestGeo=o.geometry;});const tree=v.world.children.find(o=>o.name.startsWith('Woodland'));
 if(tree){for(const [x,z,scale] of [[-18,-56,1.8],[-10,-57,2.1],[0,-60,2.3],[10,-57,2],[18,-55,1.8],[-24,-42,1.8],[24,-42,1.8]]){const t=tree.clone(true);t.visible=true;t.name='Reference distant canopy';t.position.set(x,0,z);t.scale.multiplyScalar(scale*.6);t.traverse(o=>{if(o.isMesh){o.geometry=forestGeo;o.material=new T.MeshStandardMaterial({map:o.material.map,color:0x1c2b2d,roughness:1,side:T.DoubleSide});o.castShadow=false;}});v.world.add(t);}}
 // Restore local glints without an expensive scene reflection pass.
 const draw=v.draw;v.draw=time=>{let changed=false;for(const l of lod){const near=l.center.distanceTo(v.camera.position)<(l.active?20:18);if(near!==l.active){l.active=near;l.mesh.geometry=near?l.high:l.low;changed=true;}}if(changed)v.invalidateShadows();draw(time);};
 v.invalidateShadows();v.referenceMatch={bakedKinds:Object.keys(textures),bakedTextures:13,areaLights:1,geometry:'medium-normal-baked'};
}
