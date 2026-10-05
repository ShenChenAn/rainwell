import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {RELICS} from './relics.mjs';
import {ITEMS} from './core.mjs';

// Loaded assets are shared as geometry/textures; every presentation owns its materials.
function copyObject(source) {
  const object=source.clone(true);
  object.traverse(o=>{if(o.isMesh){
    const prepare=m=>{const c=m.clone();c.emissive?.setHex(0);c.emissiveIntensity=0;return c;};
    o.material=Array.isArray(o.material)?o.material.map(prepare):prepare(o.material);
  }});
  return object;
}
function disposeCopy(object){object?.traverse(o=>{if(o.isMesh)for(const m of [o.material].flat())m.dispose();});}
function normalize(source,size){
  const g=copyObject(source),box=new T.Box3().setFromObject(g),center=box.getCenter(new T.Vector3()),extent=box.getSize(new T.Vector3());
  const scale=size/Math.max(extent.x,extent.y,extent.z,.001),offset=new T.Group();
  offset.scale.setScalar(scale);offset.position.copy(center).multiplyScalar(-scale);offset.add(g);
  const root=new T.Group();root.add(offset);return root;
}
export function createRelicLibrary(props){
  const loader=new GLTFLoader(),entries=RELICS.map(()=>({state:'idle',scene:null,promise:null}));
  async function load(index){
    const entry=entries[index];if(entry.scene)return entry.scene;if(entry.promise)return entry.promise;
    entry.state='loading';
    entry.promise=loader.loadAsync(`assets/relics/${RELICS[index].id}.glb`).then(gltf=>{
      entry.scene=gltf.scene;entry.state='ready';
      entry.scene.traverse(o=>{if(o.isMesh)for(const m of [o.material].flat()){
        m.envMapIntensity=.65;
        for(const name of ['map','normalMap','roughnessMap','metalnessMap'])if(m[name])m[name].anisotropy=4;
      }});
      const world=normalize(entry.scene,RELICS[index].size),target=props.items[index];
      // Pickup markers used to float above props. Rest physical meshes on the support instead.
      const support=props.itemSupports?.[index]||{height:target.position.y,normal:new T.Vector3(0,1,0)};
      target.position.y=support.height;
      world.rotation.x=-Math.PI/2;
      world.quaternion.premultiply(new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),support.normal));
      world.updateMatrixWorld(true);
      // Find real vertex contact with the support plane, including the tilted handcart.
      let lowest=Infinity;const point=new T.Vector3();
      world.traverse(mesh=>{const positions=mesh.geometry?.attributes.position;if(!positions)return;
        for(let j=0;j<positions.count;j++){point.fromBufferAttribute(positions,j).applyMatrix4(mesh.matrixWorld);lowest=Math.min(lowest,point.dot(support.normal));}
      });
      world.position.y=(.001-lowest)/support.normal.y;
      target.userData.supportHeight=support.height;target.userData.contactGap=.001;
      for(const child of [...target.children]){target.remove(child);disposeCopy(child);}
      world.traverse(o=>{if(o.isMesh){o.userData.itemIndex=index;o.castShadow=o.receiveShadow=true;}});
      target.add(world);target.updateMatrixWorld(true);
      ITEMS[index].y=new T.Box3().setFromObject(target).getCenter(new T.Vector3()).y;
      return entry.scene;
    }).catch(error=>{entry.state='error';throw error;}).finally(()=>{entry.promise=null;});
    return entry.promise;
  }
  return {load,preload:()=>Promise.allSettled(RELICS.map((_,i)=>load(i))),get status(){return entries.map((e,i)=>({id:RELICS[i].id,state:e.state}));}};
}

export function createInspection(library,onClose){
  const root=document.getElementById('relic-inspection'),viewport=document.getElementById('relic-viewport'),close=document.getElementById('relic-close'),retry=document.getElementById('relic-retry'),status=document.getElementById('relic-status');
  let renderer,scene,camera,rig,object,active=false,index=-1,request=0,drag=null,age=0,fitRadius=1.5;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  function setup(){
    if(renderer)return;
    renderer=new T.WebGLRenderer({alpha:true,antialias:true,powerPreference:'low-power'});
    renderer.setClearColor(0,0);renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));
    renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.1;
    renderer.domElement.setAttribute('aria-hidden','true');viewport.prepend(renderer.domElement);
    scene=new T.Scene();camera=new T.PerspectiveCamera(34,1,.05,30);camera.position.set(0,0,5.2);
    const room=new RoomEnvironment(),pmrem=new T.PMREMGenerator(renderer);
    scene.environment=pmrem.fromScene(room,.04).texture;scene.environmentIntensity=.72;room.dispose();pmrem.dispose();
    scene.add(new T.HemisphereLight(0xaac2d1,0x241b14,.7));
    const warm=new T.DirectionalLight(0xffd6a6,3.1);warm.position.set(-3,4,5);scene.add(warm);
    const rim=new T.DirectionalLight(0xbed3e0,2.1);rim.position.set(3,2,-2);scene.add(rim);
    const fill=new T.DirectionalLight(0xe6dacb,.65);fill.position.set(0,-2,3);scene.add(fill);
    rig=new T.Group();scene.add(rig);resize();
  }
  function resize(){
    if(!active||!renderer)return;const {width,height}=viewport.getBoundingClientRect();
    if(width<1||height<1)return;renderer.setSize(width,height,false);camera.aspect=width/height;
    // Fit a bounding sphere at every aspect ratio, even after arbitrary rotation.
    const fov=T.MathUtils.degToRad(camera.fov),half=Math.min(fov/2,Math.atan(Math.tan(fov/2)*camera.aspect));
    camera.position.z=fitRadius/Math.sin(half)*1.045;camera.updateProjectionMatrix();
  }
  function stopDrag(){if(drag){try{viewport.releasePointerCapture(drag.id)}catch{}drag=null;}viewport.classList.remove('rotating');}
  function rotate(dx,dy){
    if(!object)return;
    const q=new T.Quaternion().setFromEuler(new T.Euler(dy*.008,dx*.008,0,'YXZ'));
    rig.quaternion.premultiply(q).normalize();
  }
  async function showModel(){
    const ticket=++request;status.hidden=false;status.textContent='正在辨认遗物……';retry.hidden=true;
    try{
      setup();const source=await library.load(index);if(!active||ticket!==request)return;
      if(object){rig.remove(object);disposeCopy(object);}object=normalize(source,2.35);rig.position.set(0,0,0);rig.quaternion.identity();rig.add(object);rig.updateMatrixWorld(true);
      // Fit the actual vertices instead of a loose fixed sphere, retaining room to rotate.
      object.updateMatrixWorld(true);let radiusSq=0;const vertex=new T.Vector3();
      object.traverse(mesh=>{const positions=mesh.geometry?.attributes.position;if(!positions)return;
        for(let i=0;i<positions.count;i++){vertex.fromBufferAttribute(positions,i).applyMatrix4(mesh.matrixWorld);radiusSq=Math.max(radiusSq,vertex.lengthSq());}
      });
      fitRadius=Math.sqrt(radiusSq)+.025;
      rig.rotation.set(...RELICS[index].pose);status.hidden=true;resize();render(0);
    }catch(error){if(!active||ticket!==request)return;status.textContent='遗物细节未能载入。可以重试，或先收下继续寻找。';retry.hidden=false;console.warn('Relic inspection unavailable',error?.name);}
  }
  function open(i){
    index=i;active=true;age=0;root.hidden=false;
    document.getElementById('relic-number').textContent=RELICS[i].mark;
    document.getElementById('relic-title').textContent=RELICS[i].name;
    const text=document.getElementById('relic-lore');text.replaceChildren(...RELICS[i].paragraphs.map(line=>{const p=document.createElement('p');p.textContent=line;return p;}));
    close.focus({preventScroll:true});void showModel();
  }
  function dismiss(){
    if(!active)return;active=false;request++;stopDrag();root.hidden=true;
    if(object){rig.remove(object);disposeCopy(object);object=null;}
    onClose();
  }
  function render(dt){if(!active||!renderer)return;age+=dt;if(object)rig.position.y=reduced.matches?0:Math.sin(age*.85)*.022;renderer.render(scene,camera);}
  viewport.addEventListener('pointerdown',e=>{if(!active||e.button!==0)return;e.preventDefault();viewport.focus({preventScroll:true});drag={id:e.pointerId,x:e.clientX,y:e.clientY};viewport.setPointerCapture(e.pointerId);viewport.classList.add('rotating');});
  viewport.addEventListener('pointermove',e=>{if(!drag||drag.id!==e.pointerId)return;rotate(e.clientX-drag.x,e.clientY-drag.y);drag.x=e.clientX;drag.y=e.clientY;});
  viewport.addEventListener('pointerup',stopDrag);viewport.addEventListener('pointercancel',stopDrag);viewport.addEventListener('lostpointercapture',()=>{drag=null;viewport.classList.remove('rotating');});
  viewport.addEventListener('contextmenu',e=>e.preventDefault());addEventListener('blur',stopDrag);
  root.addEventListener('keydown',e=>{
    if(!active)return;
    if(['KeyE','Escape'].includes(e.code)){e.preventDefault();e.stopPropagation();if(!e.repeat)dismiss();}
    else if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.code)){e.preventDefault();e.stopPropagation();rotate((e.code==='ArrowRight'?1:e.code==='ArrowLeft'?-1:0)*12,(e.code==='ArrowDown'?1:e.code==='ArrowUp'?-1:0)*12);}
    else if(e.code==='Tab'){
      const focusable=[viewport,...(!retry.hidden?[retry]:[]),close],i=focusable.indexOf(document.activeElement);
      e.preventDefault();focusable[(i+(e.shiftKey?-1:1)+focusable.length)%focusable.length].focus();
    }
  });
  close.addEventListener('click',dismiss);retry.addEventListener('click',()=>void showModel());
  new ResizeObserver(resize).observe(viewport);
  return {open,close:dismiss,render,get active(){return active;},get state(){return {active,index,loaded:!!object,rotation:rig?.quaternion.toArray(),drawCalls:renderer?.info.render.calls};}};
}
