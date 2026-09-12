// Run: node --test tests/scenarios.test.cjs. No browser storage or media access.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const src = fs.readFileSync(require('node:path').join(__dirname, '../app.js'), 'utf8');
function fn(name) {
  const start = src.indexOf(`function ${name}(`);
  assert.ok(start >= 0, name);
  const next = src.indexOf('\n}', start);
  // One-line helpers end before the following newline.
  const firstLine = src.slice(start, src.indexOf('\n', start));
  return firstLine.endsWith('}') ? firstLine : src.slice(start, next + 2);
}
function setup() {
  const c = vm.createContext({});
  const motion = src.slice(src.indexOf('const easeOutCubic'), src.indexOf('const BG_PRESETS'));
  vm.runInContext(`
    const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)), lerp=(a,b,t)=>a+(b-a)*t;
    ${src.slice(src.indexOf('const S = {'), src.indexOf("const canvas ="))}
    S.media=[{id:'m1',src:'original-blob',t0:0,dur:42,inPoint:3}];
    S.clips=[{id:'z1',t0:2,dur:3}];
    S.exp.dur=42;
    let clock=0, seq=0;
    const setPlaying=()=>{}, fitZoom=()=>{}, syncPoseUI=()=>{};
    const $=()=>({}), syncDirectionUI=()=>{}, renderTimeline=()=>{}, save=()=>{}, toast=()=>{},
      newSceneId=()=> 's'+(++seq), seekTo=t=>clock=t;
    const hist={undo:[],redo:[]};
    const updateHistButtons=()=>{};
    const mediaDur=()=>Math.max(0,...S.media.map(m=>m.t0+m.dur)), clipEnd=c=>c.t0+c.dur;
    const smoother=t=>t*t*t*(t*(t*6-15)+10);
    ${motion}
    ${src.slice(src.indexOf('const POSE_FIELDS'),src.indexOf('function sceneEnd('))}
    ${['scenarioById','sceneEnd','sortedScenes','sceneS0','sceneS1','sceneAt','customPose','sceneFade','composedPose','snap','pushHist','applySnap','applyReel','sceneDuration','migrateReelDuration','addCustomScene','sceneUnderPlayhead','splitSceneAt','trimSceneToPlayhead','getScene'].map(fn).join('\n')}
    globalThis.api={S,SCENARIOS,REELS,KEYF,evalScenario,composedPose,sceneFade,applyReel,snap,applySnap,hist,sceneDuration,migrateReelDuration,addCustomScene,editablePose,beginPoseEdit,validCustomScene,setClock:t=>clock=t,sceneAt,sceneUnderPlayhead,splitSceneAt,trimSceneToPlayhead,getScene,sceneS0,sceneS1,sortedScenes};
  `, c);
  return c.api;
}
test('all campaigns have their advertised duration, valid shots and finite camera paths', () => {
  const a=setup();
  for(const r of a.REELS){
    assert.equal(r.seq.reduce((s,x)=>s+x[1],0),r.duration,r.id);
    a.applyReel(r);
    for(let t=0;t<=r.duration;t+=1/60){
      for(const v of Object.values(a.composedPose(t))) assert.ok(Number.isFinite(v),`${r.id}@${t}`);
    }
  }
});
test('campaign application and undo preserve original media, trims and zoom clips',()=>{
  const a=setup(), original=a.snap(), media=a.S.media, clips=a.S.clips;
  for(const r of a.REELS){
    a.applyReel(r);
    assert.equal(a.S.media,media); assert.equal(a.S.clips,clips);
    assert.equal(a.S.exp.dur,0);
    assert.equal(a.sceneDuration(),42);
  }
  a.applySnap(original);
  assert.equal(a.snap(),original);
});
test('keeping custom art direction leaves camera, background and glare intact',()=>{
  const a=setup(); a.S.scene.artDirection=false;
  const before=JSON.stringify([a.S.pose,a.S.bg,a.S.glare]);
  a.applyReel(a.REELS[0]);
  assert.equal(JSON.stringify([a.S.pose,a.S.bg,a.S.glare]),before);
});
test('straight cuts never introduce black frames; premiere dip is symmetric and bounded',()=>{
  const a=setup(); a.applyReel(a.REELS[0]);
  for(let t=0;t<=15;t+=.01) assert.equal(a.sceneFade(t),0);
  a.applyReel(a.REELS.find(r=>r.id==='cinema25'));
  assert.equal(a.sceneFade(20),1);
  assert.ok(Math.abs(a.sceneFade(19.94)-a.sceneFade(20.06))<1e-9);
  assert.equal(a.sceneFade(19.8),0); assert.equal(a.sceneFade(20.2),0);
});
test('loop matches all pose and light channels even with idle enabled; final hold stays still',()=>{
  const a=setup(); a.applyReel(a.REELS.find(r=>r.id==='loop8')); a.S.scene.idle=1;
  assert.deepEqual(a.composedPose(0),a.composedPose(8));
  a.applyReel(a.REELS[0]);
  assert.deepEqual(a.composedPose(15),a.composedPose(30));
});
test('every authored camera segment starts and stops gently',()=>{
  const a=setup(), dt=1e-4;
  for(const sc of a.SCENARIOS.filter(s=>s.dur)){
    for(let i=1;i<sc.keys.length;i++){
      const from=sc.keys[i-1], to=sc.keys[i];
      const nearStart=a.evalScenario(from.t+dt,sc), nearEnd=a.evalScenario(to.t-dt,sc);
      for(const field of a.KEYF){
        const startVelocity=Math.abs(((nearStart[field]||0)-(from[field]||0))/dt);
        const endVelocity=Math.abs(((to[field]||0)-(nearEnd[field]||0))/dt);
        assert.ok(startVelocity<.02,`${sc.id} ${field} abrupt start ${startVelocity}`);
        assert.ok(endVelocity<.02,`${sc.id} ${field} abrupt stop ${endVelocity}`);
      }
    }
  }
});
test('camera holds after campaign while export continues; manual longer duration works',()=>{
  const a=setup(); a.applyReel(a.REELS[0]);
  assert.equal(a.sceneDuration(),42);
  assert.deepEqual(a.composedPose(15),a.composedPose(41));
  a.S.exp.dur=60;
  assert.equal(a.sceneDuration(),60);
  assert.deepEqual(a.composedPose(15),a.composedPose(59));
});
test('old campaign duration cap is migrated without changing media or explicit new limits',()=>{
  const a=setup(); a.applyReel(a.REELS[0]);
  const media=JSON.stringify(a.S.media);
  a.S.exp.dur=15;
  a.migrateReelDuration({exp:{dur:15}});
  assert.equal(a.sceneDuration(),42);
  assert.equal(JSON.stringify(a.S.media),media);
  a.S.exp.dur=15;
  a.migrateReelDuration({exp:{dur:15,autoDurationVersion:1}});
  assert.equal(a.sceneDuration(),15);
  a.S.exp.dur=19;
  a.migrateReelDuration({exp:{dur:19}});
  assert.equal(a.sceneDuration(),19);
});

test('custom continuation preserves preset camera and media, then smoothly reaches the new pose',()=>{
  const a=setup(); a.applyReel(a.REELS.find(r=>r.id==='impact8'));
  const before=JSON.stringify(a.composedPose(4)), media=JSON.stringify(a.S.media);
  const end=a.composedPose(8), custom=a.addCustomScene(3);
  assert.equal(custom.t0,8); assert.equal(custom.dur,3);
  assert.deepEqual(custom.from,end);
  const target=a.beginPoseEdit(); target.x=.25; target.ry=25; target.scale=.8;
  assert.equal(JSON.stringify(a.composedPose(4)),before);
  assert.equal(JSON.stringify(a.S.media),media);
  assert.ok(Math.abs(a.composedPose(11).x-.25)<1e-10);
  assert.deepEqual(a.composedPose(11),a.composedPose(30));
  assert.ok(a.validCustomScene(custom));
  a.S.media=[]; assert.equal(a.sceneDuration(),11);
});
test('chained custom shots stay joined when an earlier endpoint is edited',()=>{
  const a=setup(); a.applyReel(a.REELS[0]);
  const first=a.addCustomScene(3); a.editablePose().x=.2;
  const second=a.addCustomScene(4); a.editablePose().x=-.2;
  a.S.selScene=first.id; a.setClock(18);
  assert.equal(a.editablePose(),first.to);
  a.beginPoseEdit().x=.35;
  assert.ok(Math.abs(a.composedPose(18).x-.35)<1e-10);
  assert.ok(Math.abs(a.composedPose(22).x+.2)<1e-10);
  assert.equal(second.from.x,.2); // Original fallback is retained for a later gap.
});
test('custom scenes survive project serialization and undo; explicit export grows with continuation',()=>{
  const a=setup(); a.applyReel(a.REELS[0]);
  a.S.exp.dur=15;
  const original=a.snap();
  const custom=a.addCustomScene(5); a.editablePose().ry=30;
  assert.equal(a.sceneDuration(),20);
  const saved=a.snap();
  a.applySnap(original); assert.equal(a.S.scenes.some(b=>b.sc==='custom'),false);
  a.applySnap(saved);
  assert.ok(a.validCustomScene(a.S.scenes.at(-1)));
  assert.ok(Math.abs(a.composedPose(20).ry-30)<1e-10);
  assert.equal(a.validCustomScene({sc:'custom',from:custom.from,to:{}}),false);
});

test('sceneAt slices the scenario by s0/s1 fractions and holds at the cut point',()=>{
  const a=setup();
  const sc=a.SCENARIOS.find(s=>s.id==='revealLow');
  a.S.scenes=[{id:'s1',sc:'revealLow',t0:2,dur:10,s0:.2,s1:.6}];
  // до первого блока — стартовая поза СРЕЗА (s0), а не начало всего сценария
  assert.ok(Math.abs(a.sceneAt(0).local-.2*sc.dur)<1e-9);
  // внутри блока — доля времени линейно ложится на долю [s0,s1] сценария
  assert.ok(Math.abs(a.sceneAt(7).local-(.2+.5*(.6-.2))*sc.dur)<1e-9);
  assert.ok(Math.abs(a.sceneAt(12).local-.6*sc.dur)<1e-9); // ровно конец блока = s1
  // после конца блока (и сколь угодно дальше) — держит позу s1, а не едет к концу sc.dur
  assert.equal(a.sceneAt(20).local,a.sceneAt(12).local);
  assert.ok(Math.abs(a.sceneAt(100).local-.6*sc.dur)<1e-9);
});

test('splitSceneAt preserves the t→local mapping; deleting one half leaves the other untouched',()=>{
  const a=setup();
  const sc=a.SCENARIOS.find(s=>s.id==='revealLow');
  a.S.scenes=[{id:'sOrig',sc:'revealLow',t0:0,dur:10}];
  a.S.selScene='sOrig';
  const ts=[]; for(let t=-2;t<=14;t+=.5) ts.push(t);
  const before=ts.map(t=>a.sceneAt(t).local);

  a.splitSceneAt(4);
  assert.equal(a.S.scenes.length,2);
  const [left,right]=a.sortedScenes();
  assert.equal(left.t0,0); assert.equal(left.dur,4);
  assert.ok(Math.abs(left.s0-0)<1e-9); assert.ok(Math.abs(left.s1-.4)<1e-9);
  assert.equal(right.t0,4); assert.equal(right.dur,6);
  assert.ok(Math.abs(right.s0-.4)<1e-9); assert.ok(Math.abs(right.s1-1)<1e-9);
  assert.equal(a.S.selScene,right.id);

  // Разрез — это то же самое отображение t→local, распавшееся на два блока:
  // ни до, ни внутри, ни после (в held-хвосте) ничего не меняется.
  ts.forEach((t,i)=>assert.ok(Math.abs(a.sceneAt(t).local-before[i])<1e-9,`t=${t}`));

  // Удаляем правую половину — левая играет только [0,.4] сценария и дальше
  // держит срез, а не «доигрывает» вырезанный кусок до конца.
  a.S.scenes=a.S.scenes.filter(b=>b.id!==right.id);
  ts.forEach((t,i)=>{ if (t<=4) assert.ok(Math.abs(a.sceneAt(t).local-before[i])<1e-9,`kept t=${t}`); });
  assert.ok(Math.abs(a.sceneAt(9).local-left.s1*sc.dur)<1e-9);
});

test('a split custom shot stays chained to the previous shot when its endpoint is edited',()=>{
  const a=setup(); a.applyReel(a.REELS[0]);
  const first=a.addCustomScene(3); a.editablePose().x=.2;
  const second=a.addCustomScene(4); a.editablePose().x=-.2;
  // Cut the second shot in the middle, then move the first shot's endpoint.
  a.S.selScene=second.id; a.setClock(20); a.splitSceneAt();
  a.S.selScene=first.id; a.setClock(18); a.beginPoseEdit().x=.35;
  assert.ok(Math.abs(a.composedPose(18).x-.35)<1e-10);
  assert.ok(Math.abs(a.composedPose(22).x+.2)<1e-10);
  // No jump at the cut: both halves interpolate the same arc from the new start.
  assert.ok(Math.abs(a.composedPose(19.99).x-a.composedPose(20.01).x)<0.01);
  const left=a.getScene(second.id), right=a.sortedScenes().find(b=>b.t0===20);
  assert.equal(a.sceneS1(left),a.sceneS0(right));
});
