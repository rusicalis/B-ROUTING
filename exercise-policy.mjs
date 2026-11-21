// Curated application selection heuristics, not medical ratings or effect guarantees.
// Lower priority numbers rank earlier. The caller supplies earned per-routine level;
// this module never reads dates, account age, attendance totals or calendar days.
const profiles=new Map();
function define(ids,difficulty,pattern,role,priority,minLevel=0,automatic=true){
 for(const id of ids.split(' '))profiles.set(id,{difficulty,pattern,role,priority,minLevel,automatic});
}

define('pushup',2,'horizontal-push','compound',10);
define('knee-pushup',1,'horizontal-push','compound',14);
define('kb-floor-press',2,'horizontal-push','compound',18);
define('wide-pushup close-pushup',2,'horizontal-push','compound',32);
define('close-knee',1,'horizontal-push','compound',30);
define('kb-shoulder-press',2,'vertical-push','compound',15);
define('pike-pushup',2,'vertical-push','compound',20);
define('chair-dip',2,'vertical-push','compound',34);
define('floor-triceps-dip',2,'vertical-push','compound',75);
define('kb-row',2,'horizontal-pull','compound',10);
define('squat',1,'squat','compound',10);
define('kb-goblet',2,'squat','compound',18);
define('reverse-lunge',2,'lunge','compound',20);
define('split-squat',2,'lunge','compound',22);
define('forward-lunge',2,'lunge','compound',44);
define('curtsey-lunge',2,'lunge','compound',95);
define('kb-deadlift',2,'hinge','compound',10);
define('kb-sumo',2,'hinge','compound',22);
define('good-morning',1,'hinge','compound',28);
define('bridge',1,'hip-extension','compound',22);
define('bridge-hold',1,'hip-extension','stability',28);
define('reverse-plank',2,'posterior-support','stability',35);
define('kb-curl',2,'elbow-flexion','assistance',40);
define('kb-concentration-curl',2,'elbow-flexion','assistance',44);
define('band-curl',1,'elbow-flexion','assistance',48);
define('kb-curl-hold',2,'elbow-flexion','stability',65);
define('side-lying-biceps-curl',2,'elbow-flexion','assistance',130);
define('bodyweight-triceps',2,'elbow-extension','assistance',44);
define('band-triceps',1,'elbow-extension','assistance',48);
define('kb-lying-triceps',2,'elbow-extension','assistance',55);
define('scapular-pushup',1,'scapular-control','assistance',38);
define('prone-w prone-y band-w',1,'scapular-control','assistance',46);
define('reverse-snow',1,'scapular-control','assistance',65);
define('band-lateral-raise',1,'shoulder-abduction','assistance',50);
define('dead-bug',1,'anti-extension','stability',24);
define('plank',1,'anti-extension','stability',25);
define('bird-dog',1,'anti-rotation','stability',28);
define('shoulder-tap',2,'anti-rotation','stability',50);
define('kb-suitcase',2,'lateral-core','stability',38);
define('abs-crunch',1,'trunk-flexion','assistance',38);
define('reverse-crunch',2,'trunk-flexion','assistance',58);
define('heel-touch',1,'lateral-core','assistance',62);
define('cross-body-crunch bicycle-crunch',2,'trunk-flexion','assistance',70);
define('russian-twist',2,'rotation','assistance',88);
define('back-extension',1,'spinal-extension','assistance',42);
define('back-hold',1,'spinal-extension','stability',45);
define('prone-swimmer',2,'posterior-control','stability',76);
define('mountain-climber',2,'anti-extension','stability',65);
define('calf-raise',1,'calf','assistance',44);
define('single-calf-raise',2,'calf','assistance',70);
define('side-lying-leg-raise',1,'hip-abduction','assistance',72);
define('side-lying-adduction',1,'hip-adduction','assistance',78);

// Controlled challenges enter only after earned comfortable completions. The
// advanced catalog flag does not disqualify these explicitly reviewed options.
define('plank-triceps-extension',3,'elbow-extension','compound',55,4);
define('single-bridge',3,'hip-extension','compound',65,4);
define('side-plank',3,'lateral-core','stability',70,4);
define('pushup-rotation',3,'horizontal-push','compound',78,8);
define('kb-floor-seated-press',3,'vertical-push','compound',82,8);
define('forearm-plank-rotation',3,'rotation','stability',90,8);
define('hindu-pushup',3,'horizontal-push','compound',96,8);
define('archer-pushup',4,'horizontal-push','compound',105,10);

// Technical/ballistic kettlebell movements remain manual catalog choices.
define('kb-swing',4,'ballistic-hinge','compound',200,Infinity,false);
define('kb-hang-clean',4,'technical-clean','compound',200,Infinity,false);
define('kb-windmill',4,'technical-overhead','stability',200,Infinity,false);
define('kb-push-press',4,'ballistic-press','compound',200,Infinity,false);
define('kb-figure-eight kb-lunge-pass',4,'technical-transfer','compound',200,Infinity,false);
define('quiet-march step-jack shadow-punch side-step standing-knee',1,'locomotion','assistance',200,Infinity,false);

/** Fresh profile; automatic means eligible for earned-level gating, not ready now. */
export function exerciseProfile(exercise){
 const profile=profiles.get(exercise?.id)||{difficulty:2,pattern:'general',role:'assistance',priority:999,automatic:false};
 const {difficulty,pattern,role,priority,automatic}=profile;
 return {difficulty,pattern,role,priority,automatic};
}

function groupsOf(groups){
 return new Set((Array.isArray(groups)?groups:[]).flatMap(group=>group==='glutes'?['legs']:group==='arms'?['biceps','triceps']:[group]));
}
function earnedLevel(level){
 if(typeof level!=='number'&&typeof level!=='string')return 0;
 const value=Number(level);return Number.isFinite(value)?Math.max(0,Math.min(12,Math.floor(value))):0;
}

/**
 * Rank automatic supplements for target fit and common movement patterns.
 * Return original objects in a new array; deduplicate IDs. Core/user selections
 * belong to the caller and must not be removed by applying this supplement policy.
 * Difficulty3–4 challenge caps: none before4, one at4–7, two at8–12.
 * Eligible challenges follow two basics, then another basic, so time budgeting can
 * include a small earned challenge without replacing the protected core routine.
 */
export function rankExercises(candidates,targets,level=0){
 const readiness=earnedLevel(level),wanted=groupsOf(targets),all=!wanted.size||wanted.has('full'),seen=new Set();
 const rows=[];
 for(const [index,exercise]of (Array.isArray(candidates)?candidates:[]).entries()){
  if(!exercise||typeof exercise.id!=='string'||seen.has(exercise.id))continue;
  seen.add(exercise.id);
  const profile=profiles.get(exercise.id);
  if(!profile?.automatic||profile.minLevel>readiness||exercise.kind==='cardio')continue;
  const groups=groupsOf(exercise.groups),overlap=all?0:[...wanted].filter(group=>groups.has(group)).length;
  if(!all&&!overlap)continue;
  const roleCost=profile.role==='compound'?0:profile.role==='stability'?18:25;
  rows.push({exercise,profile,index,score:profile.priority+roleCost-overlap*3});
 }
 rows.sort((a,b)=>a.score-b.score||a.index-b.index);
 const basic=rows.filter(row=>row.profile.difficulty<3),firstPatterns=[],repeats=[],patterns=new Set();
 // Cover useful patterns before repeating many pushup/curl variants. Common
 // compounds lead via the curated score; new assistance patterns then precede
 // redundant variants, without any bonus for catalog novelty.
 for(const row of basic){
  if(!patterns.has(row.profile.pattern)){firstPatterns.push(row);patterns.add(row.profile.pattern)}
  else repeats.push(row);
 }
 const ordered=[...firstPatterns,...repeats].map(row=>row.exercise);
 const cap=readiness>=8?2:readiness>=4?1:0;
 const challenge=rows.filter(row=>row.profile.difficulty>=3).slice(0,cap).map(row=>row.exercise);
 for(let i=0;i<challenge.length;i++)ordered.splice(Math.min(2+i*2,ordered.length),0,challenge[i]);
 return ordered;
}
