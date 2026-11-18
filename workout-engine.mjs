import {EXTRA_EXERCISES} from './extra-exercises.mjs';
import {hasExercisePreview} from './exercise-media-data.mjs';
// Pure catalogue and progression rules. No network, DOM or storage dependencies.
export const REGIONS=[{id:'full',name:'전신',en:'FULL BODY'},{id:'chest',name:'가슴',en:'CHEST'},{id:'shoulders',name:'어깨',en:'SHOULDERS'},{id:'biceps',name:'이두',en:'BICEPS'},{id:'triceps',name:'삼두',en:'TRICEPS'},{id:'back',name:'등',en:'BACK'},{id:'lowerback',name:'허리',en:'LOWER BACK'},{id:'legs',name:'다리',en:'LEGS'}];
const ex=(id,name,groups,equipment,animation,cues,extra={})=>({id,name,groups:groups.split(','),equipment,animation,cues,cue:cues[1],sets:2,reps:8,rest:60,...(equipment==='kettlebell'?{weight:12,count:1}:{}),...extra});
export const EXERCISES=[
  ex('knee-pushup','무릎 푸시업','chest,arms','bodyweight','knee-pushup',['손을 어깨보다 조금 넓게 두고 무릎을 바닥에 댑니다.','머리부터 무릎까지 일직선을 유지하며 가슴을 내립니다.','숨을 내쉬며 바닥을 밀고 팔꿈치를 과하게 벌리지 않습니다.']),
  ex('pushup','푸시업','chest,arms','bodyweight','pushup',['손은 어깨 옆, 발은 골반 너비로 준비합니다.','복부에 힘을 주고 가슴과 골반을 함께 내립니다.','몸을 곧게 유지하며 바닥을 밀어 올라옵니다.']),
  ex('wide-pushup','와이드 푸시업','chest','bodyweight','wide-pushup',['손을 어깨너비보다 약간 넓게 둡니다.','팔꿈치를 몸통에서 약 45도로 두고 천천히 내립니다.','허리가 꺾이지 않게 바닥을 밀어 올라옵니다.']),
  ex('kb-floor-press','케틀벨 원암 플로어 프레스','chest,arms','kettlebell','floor-press',['누워 무릎을 세우고 양손으로 케틀벨을 안전하게 받습니다.','한 손으로 잡고 위팔이 바닥에 닿을 때까지 천천히 내립니다.','손목을 곧게 유지하며 위로 밀고, 반대 손으로 도와 내려놓습니다.'],{eachSide:true,reps:6}),
  ex('kb-row','케틀벨 원암 로우','back,arms','kettlebell','row',['다리를 앞뒤로 두고 빈손은 앞쪽 허벅지에 짚습니다.','등을 중립으로 유지하고 팔꿈치를 골반 쪽으로 당깁니다.','어깨를 으쓱하거나 몸통을 비틀지 않고 천천히 내립니다.'],{eachSide:true}),
  ex('prone-w','프론 W 레이즈','back,shoulders','bodyweight','prone-w',['엎드려 팔꿈치를 굽혀 W 모양을 만듭니다.','목을 길게 유지하고 날개뼈를 모으며 팔을 살짝 듭니다.','허리를 젖히지 않고 팔을 천천히 내려놓습니다.']),
  ex('prone-y','프론 Y 레이즈','back,shoulders','bodyweight','prone-y',['엎드린 상태에서 팔을 대각선 위로 뻗습니다.','엄지가 위를 향하도록 하고 팔을 조금 들어 올립니다.','어깨를 귀에서 멀리 두고 천천히 돌아옵니다.']),
  ex('reverse-snow','리버스 스노 엔젤','back,shoulders','bodyweight','snow-angel',['엎드려 이마를 바닥 가까이 두고 팔을 옆으로 뻗습니다.','팔을 살짝 든 채 엉덩이 옆에서 머리 위까지 부드럽게 이동합니다.','허리를 과하게 젖히지 않고 원위치로 돌아옵니다.']),
  ex('squat','맨몸 스쿼트','legs,glutes','bodyweight','squat',['발은 어깨너비, 발끝은 편안하게 조금 벌립니다.','발바닥 전체로 지지하며 무릎과 엉덩이를 함께 굽힙니다.','무릎이 발끝 방향을 따르게 하며 일어섭니다.']),
  ex('kb-goblet','케틀벨 고블릿 스쿼트','legs,glutes','kettlebell','goblet-squat',['케틀벨 손잡이를 양손으로 잡아 가슴 앞에 둡니다.','가슴을 세우고 편안한 깊이까지 앉습니다.','발바닥 전체로 바닥을 밀며 일어섭니다.']),
  ex('reverse-lunge','리버스 런지','legs,glutes','bodyweight','lunge',['골반너비로 서고 한 발을 뒤로 보냅니다.','앞발을 바닥에 고정하고 양 무릎을 굽힙니다.','앞다리로 바닥을 밀어 제자리로 돌아옵니다.'],{eachSide:true,reps:6}),
  ex('split-squat','스플릿 스쿼트','legs,glutes','bodyweight','split-squat',['두 발을 앞뒤로 벌리고 뒤꿈치를 듭니다.','몸통을 안정시킨 채 수직으로 내려갑니다.','앞다리로 밀어 올라오며 양발 위치를 유지합니다.'],{eachSide:true,reps:6}),
  ex('calf-raise','스탠딩 카프 레이즈','legs','bodyweight','calf',['두 발을 골반너비로 두고 중심을 잡습니다.','엄지발가락 쪽까지 균등하게 눌러 뒤꿈치를 듭니다.','발목이 바깥으로 꺾이지 않게 천천히 내립니다.'],{reps:12}),
  ex('kb-sumo','케틀벨 스모 데드리프트','legs,glutes,back','kettlebell','sumo',['발을 넓게 벌리고 케틀벨을 두 발 사이에 둡니다.','엉덩이를 뒤로 보내고 양손으로 손잡이를 잡습니다.','등을 중립으로 유지하며 바닥을 밀고 일어섭니다.']),
  ex('bridge','글루트 브리지','glutes','bodyweight','bridge',['누워 무릎을 세우고 발을 골반너비로 둡니다.','복부와 엉덩이에 힘을 주며 골반을 들어 올립니다.','허리를 꺾지 말고 어깨부터 무릎을 일직선으로 만듭니다.']),
  ex('single-bridge','싱글 레그 브리지','glutes,core','bodyweight','single-bridge',['누워 한 발을 바닥에 두고 다른 다리를 뻗습니다.','골반의 양쪽 높이를 맞추며 엉덩이를 들어 올립니다.','골반이 기울지 않게 천천히 내립니다.'],{eachSide:true,reps:6}),
  ex('kb-deadlift','케틀벨 데드리프트','glutes,back,legs','kettlebell','hinge',['케틀벨을 두 발 사이에 놓고 양손으로 잡습니다.','무릎은 부드럽게 굽히고 엉덩이를 뒤로 보냅니다.','등을 중립으로 유지하고 엉덩이 힘으로 일어섭니다.']),
  ex('good-morning','맨몸 굿모닝','glutes,back','bodyweight','good-morning',['발은 골반너비, 손은 가슴 앞에 모읍니다.','허리를 곧게 유지하며 엉덩이를 뒤로 보냅니다.','햄스트링의 긴장을 느낀 뒤 엉덩이 힘으로 일어섭니다.']),
  ex('pike-pushup','파이크 푸시업','shoulders,arms','bodyweight','pike',['손과 발로 바닥을 짚고 엉덩이를 높이 올립니다.','팔꿈치를 굽혀 정수리를 바닥 가까이 이동합니다.','목에 체중을 싣지 말고 바닥을 밀어 올라옵니다.'],{reps:6}),
  ex('scapular-pushup','스캐풀라 푸시업','shoulders,chest','bodyweight','scapular',['팔을 편 플랭크 자세로 준비합니다.','팔꿈치를 굽히지 않고 날개뼈 사이를 조금 모읍니다.','바닥을 밀어 날개뼈를 벌리고 몸통을 올립니다.']),
  ex('shoulder-tap','플랭크 숄더 탭','shoulders,core','bodyweight','shoulder-tap',['손은 어깨 아래, 발은 조금 넓게 두고 플랭크를 만듭니다.','한 손으로 반대쪽 어깨를 가볍게 터치합니다.','골반이 흔들리지 않게 돌아온 뒤 반대 손으로 반복합니다.'],{eachSide:true,reps:6}),
  ex('close-knee','클로즈 무릎 푸시업','arms,chest','bodyweight','close-knee',['무릎을 바닥에 대고 손을 어깨너비로 좁게 둡니다.','팔꿈치를 몸통 가까이 유지하며 가슴을 내립니다.','복부를 고정하고 팔 뒤쪽 힘으로 밀어 올라옵니다.'],{reps:6}),
  ex('close-pushup','클로즈 푸시업','arms,chest','bodyweight','close-pushup',['손을 어깨 아래에 두고 몸통을 곧게 만듭니다.','팔꿈치를 몸통 가까이 보내며 내려갑니다.','손목이 불편하지 않은 범위에서 밀어 올라옵니다.'],{reps:6}),
  ex('kb-curl','케틀벨 투핸드 컬','arms','kettlebell','curl',['손잡이 양옆을 두 손으로 단단하게 잡습니다.','팔꿈치를 몸통 옆에 고정하고 가슴 쪽으로 들어 올립니다.','허리를 반동으로 쓰지 말고 천천히 내립니다.'],{reps:6}),
  ex('dead-bug','데드 버그','core','bodyweight','deadbug',['누워 팔을 위로, 무릎을 90도로 듭니다.','허리가 뜨지 않는 범위에서 반대쪽 팔과 다리를 뻗습니다.','천천히 돌아온 뒤 반대쪽을 반복합니다.'],{eachSide:true,reps:6}),
  ex('bird-dog','버드 독','core,back,glutes','bodyweight','birddog',['손은 어깨 아래, 무릎은 골반 아래에 둡니다.','반대쪽 팔과 다리를 몸통 높이까지 뻗습니다.','골반을 수평으로 유지하며 천천히 돌아옵니다.'],{eachSide:true,reps:6}),
  ex('plank','포어암 플랭크','core','bodyweight','plank',['팔꿈치를 어깨 아래에 두고 다리를 뻗습니다.','머리부터 발뒤꿈치까지 곧게 유지합니다.','배에 힘을 주고 호흡을 이어 갑니다.'],{holdSeconds:20}),
  ex('side-plank','사이드 플랭크','core,shoulders','bodyweight','sideplank',['옆으로 누워 팔꿈치를 어깨 바로 아래에 둡니다.','발을 앞뒤로 두고 골반을 들어 몸을 일직선으로 만듭니다.','어깨가 무너지지 않게 지지하며 양쪽을 진행합니다.'],{eachSide:true,holdSeconds:15}),
  ex('mountain-climber','슬로 마운틴 클라이머','core,legs','bodyweight','climber',['팔을 편 플랭크 자세로 시작합니다.','한쪽 무릎을 가슴 쪽으로 천천히 당깁니다.','골반 높이를 유지하고 발을 되돌린 뒤 반대쪽을 반복합니다.'],{eachSide:true,reps:8}),
  ex('kb-suitcase','케틀벨 수트케이스 홀드','core,arms','kettlebell','suitcase',['한 손으로 케틀벨을 들고 양발로 균등하게 섭니다.','케틀벨 쪽으로 몸이 기울지 않게 복부에 힘을 줍니다.','어깨를 내리고 호흡하며 유지한 뒤 손을 바꿉니다.'],{eachSide:true,holdSeconds:20}),
];

EXERCISES.push(
 ex('band-w','짧은 밴드 W 외회전','back,shoulders','band','band-w',['일자형 밴드 중앙을 양손 사이 약 20cm 간격으로 잡습니다.','팔꿈치를 몸통에 붙이고 손 사이를 약 35cm까지 천천히 벌립니다.','몸통을 비틀지 말고 밴드가 얼굴 쪽으로 튀지 않게 천천히 돌아옵니다.'],{bandType:'straight',bandLength:60,requiresAnchor:false}),
 ex('band-curl','자가 저항 밴드 컬','biceps','band','band-curl',['밴드 중앙을 약 20~25cm 간격으로 짧게 잡고 한 손은 배 앞에 고정합니다.','팔꿈치를 옆구리에 고정한 채 손 사이 간격을 약 25~45cm 안에서 늘립니다.','고정한 손으로 저항을 조절하며 천천히 내리고 양쪽을 진행합니다.'],{bandType:'straight',bandLength:60,requiresAnchor:false,eachSide:true}),
 ex('band-triceps','자가 고정 밴드 삼두 익스텐션','triceps','band','band-triceps',['밴드 중앙을 약 25~30cm 간격으로 짧게 잡고 한 손은 가슴 앞에 고정합니다.','작업 팔의 팔꿈치를 옆구리에 고정하고 손을 아래로 펴 삼두를 수축합니다.','손 사이 간격을 약 30~55cm 이내로 조절하고 천천히 되돌립니다.'],{bandType:'straight',bandLength:60,requiresAnchor:false,eachSide:true}),
 ex('back-extension','프론 백 익스텐션','lowerback','bodyweight','back-extension',['엎드려 팔은 몸 옆에 두고 배에 가볍게 힘을 줍니다.','목을 몸통과 나란히 둔 채 가슴을 바닥에서 조금만 듭니다.','반동이나 과도한 허리 젖힘 없이 천천히 내려옵니다.']),
 ex('back-hold','프론 백 익스텐션 홀드','lowerback','bodyweight','back-extension',['엎드려 다리를 바닥에 편안히 둡니다.','배를 고정하고 가슴을 조금만 든 자세를 유지합니다.','고개를 뒤로 젖히거나 허리를 과하게 꺾지 않고 호흡합니다.'],{holdSeconds:25,holdPhase:.5})
);
for(const [id,name,animation]of [['quiet-march','조용한 제자리 걷기','march'],['step-jack','스텝 잭 · 점프 없음','step-jack'],['shadow-punch','제자리 섀도 복싱','punch'],['side-step','좌우 사이드 스텝','side-step'],['standing-knee','스탠딩 니 리프트','knee-lift']])EXERCISES.push(ex(id,name,['punch'].includes(animation)?'shoulders,core':'legs,core','bodyweight',animation,['양발을 바닥에 두고 편안하게 준비합니다.','한 발 이상은 바닥에 둔 채 작고 부드럽게 움직입니다.','발을 세게 구르지 말고 호흡을 유지하며 반복합니다.'],{kind:'cardio',workSeconds:50,alternating:true,jumping:false}));
EXERCISES.push(
 ex('kb-lying-triceps','케틀벨 라잉 삼두 익스텐션','triceps','kettlebell','lying-triceps',['바닥에 누워 무릎을 세우고 케틀벨 손잡이를 양손으로 단단히 잡습니다.','위팔은 위를 향하게 유지하고 팔꿈치만 접어 머리 옆으로 천천히 내립니다.','손목을 곧게 유지하며 팔을 펴고, 12kg을 제어하기 어렵다면 세트를 중단합니다.'],{reps:6}),
 ex('chair-dip','의자 삼두 딥스','triceps,shoulders','chair','chair-dip',['바퀴 없는 의자를 벽에 고정하고 양손으로 좌판 앞부분을 잡습니다.','무릎을 굽히고 엉덩이를 의자 가까이 둔 채 팔꿈치를 뒤로 접습니다.','어깨가 불편하지 않은 얕은 범위에서 내려갔다가 팔로 밀어 올라옵니다.'],{reps:6,requiresStableChair:true}),
 ex('kb-shoulder-press','케틀벨 원암 숄더 프레스','shoulders,triceps','kettlebell','shoulder-press',['케틀벨을 한쪽 어깨 앞에 두고 반대 손으로 받쳐 준비합니다.','복부에 힘을 주고 허리를 젖히지 않으며 팔을 위로 밀어 올립니다.','손목을 곧게 유지하며 어깨 앞으로 천천히 내린 뒤 손을 바꿉니다.'],{eachSide:true,reps:5}),
 ex('band-lateral-raise','자가 고정 밴드 사이드 레이즈','shoulders','band','lateral-raise',['60cm 일자 밴드를 양손으로 잡고 한 손을 반대쪽 골반 옆에 고정합니다.','작업 팔의 팔꿈치를 조금 굽혀 옆으로 들어 올리되 어깨 높이를 넘기지 않습니다.','짧은 밴드를 과도하게 늘리지 말고 고정 손으로 저항을 조절한 뒤 손을 바꿉니다.'],{eachSide:true,reps:8,bandType:'straight',bandLength:60,requiresAnchor:false}),
 ex('abs-crunch','복근 크런치','core','bodyweight','crunch',['누워 무릎을 세우고 손을 가슴 앞에 둡니다.','목을 당기지 말고 갈비뼈를 골반 쪽으로 모으며 어깨만 조금 듭니다.','숨을 들이쉬며 천천히 내려오고 반동 없이 반복합니다.'],{workSeconds:30,cycleSeconds:4}),
 ex('bridge-hold','글루트 브리지 홀드','legs,glutes,lowerback','bodyweight','bridge',['누워 무릎을 세우고 발을 골반너비로 둡니다.','엉덩이를 들어 어깨부터 무릎을 일직선으로 유지합니다.','허리를 과하게 젖히지 말고 호흡하며 유지합니다.'],{holdSeconds:30}),
 ex('reverse-plank','리버스 플랭크','back,lowerback,legs,core','bodyweight','reverse-plank',['앉아 다리를 뻗고 손은 어깨 뒤 바닥을 짚습니다.','가슴을 열고 골반을 들어 어깨부터 발뒤꿈치까지 곧게 만듭니다.','목을 뒤로 꺾지 말고 엉덩이가 처지지 않는 범위에서 호흡하며 유지합니다.'],{holdSeconds:30})
);
EXERCISES.push(
 ex('bodyweight-triceps','맨몸 무릎 삼두 익스텐션','triceps','bodyweight','triceps',['무릎을 바닥에 대고 손은 어깨 앞에 둡니다.','팔꿈치를 몸통 가까이 접어 팔꿈치와 아래팔을 바닥 쪽으로 내립니다.','복부를 고정하고 손바닥으로 밀어 팔꿈치를 폅니다.'],{reps:6}),
 ex('kb-concentration-curl','케틀벨 원암 컨센트레이션 컬','biceps','kettlebell','curl',['흔들리지 않는 좌판에 앉아 다리를 벌리고 한 손으로 케틀벨을 잡습니다.','작업 팔의 위팔을 같은 쪽 허벅지 안쪽에 대고 팔꿈치를 접어 올립니다.','몸통을 흔들지 않고 천천히 내린 뒤 양쪽을 진행합니다.'],{eachSide:true,reps:6,requiresStableChair:true}),
 ex('kb-curl-hold','케틀벨 컨센트레이션 컬 홀드','biceps','kettlebell','curl',['안정된 좌판에 앉아 한쪽 위팔을 허벅지 안쪽에 댑니다.','케틀벨을 잡고 팔꿈치를 접은 자세를 유지합니다.','손목을 꺾거나 몸통을 흔들지 말고 양쪽을 진행합니다.'],{eachSide:true,reps:0,holdSeconds:15,requiresStableChair:true})
);
EXERCISES.push(...EXTRA_EXERCISES);
const details={biceps:['kb-row','kb-curl'],triceps:['knee-pushup','pushup','kb-floor-press','close-knee','close-pushup','pike-pushup'],lowerback:['kb-deadlift','good-morning','bird-dog'],legs:['bridge','single-bridge']};
for(const e of EXERCISES){e.groups=e.groups.filter(g=>g!=='arms');e.jumping=false;for(const [group,ids]of Object.entries(details))if(ids.includes(e.id)&&!e.groups.includes(group))e.groups.push(group)}
const clamp=(v,min,max)=>Math.max(min,Math.min(max,Number.isFinite(Number(v))?Number(v):min));
export function normalizeRegions(regions){regions=(Array.isArray(regions)?regions:['full']).flatMap(r=>r==='arms'?['biceps','triceps']:r==='glutes'?['legs']:r==='core'?['lowerback']:[r]);const a=[...new Set(regions.filter(r=>REGIONS.some(x=>x.id===r)))];return !a.length||a.includes('full')?['full']:a.sort()}
export function newTrack(){return {level:0,completed:0,lastCreditDate:null,lastCompletedDate:null,sessionIds:[]}}
export function trackKey(config={}){if(config.mode==='weekly')return 'weekly:day-'+clamp(config.planDay||1,1,7);if(config.mode==='cardio')return 'cardio:quiet';return config.mode==='custom'&&config.customIds?.length?'custom:'+config.customIds.join('|'):normalizeRegions(config.regions).join('+')+':routine-'+clamp(config.variant||1,1,3)}
export function createPlan(config={}){
  const available=EXERCISES.filter(e=>hasExercisePreview(e.id));
  const regions=normalizeRegions(config.regions),variant=clamp(config.variant||1,1,3),level=Math.floor(clamp(config.level,0,12));
  let selected=[];
  if(config.mode==='custom')selected=(config.customIds||[]).map(id=>available.find(e=>e.id===id)).filter(Boolean).filter((e,i,a)=>a.findIndex(x=>x.id===e.id)===i).slice(0,10);
  if(!selected.length){
    const targets=regions.includes('full')?['legs','chest','back','shoulders','biceps','lowerback']:regions;
    // One exercise per region first, then fill with relevant movements.
    for(const r of targets){const pool=available.filter(e=>e.kind!=='cardio'&&e.groups.includes(r));const order=[...pool.slice(variant-1),...pool.slice(0,variant-1)];const e=order.find(e=>!selected.includes(e));if(e)selected.push(e)}
    const pool=available.filter(e=>e.kind!=='cardio'&&(regions.includes('full')||regions.some(r=>e.groups.includes(r))));
    const order=[...pool.slice(variant-1),...pool.slice(0,variant-1)];
    const count=regions.includes('full')?6:Math.max(3,Math.min(7,regions.length*2));
    for(const e of order)if(selected.length<count&&!selected.includes(e))selected.push(e);
    // Include the user's single kettlebell where the target permits it.
    const kb=order.find(e=>e.equipment==='kettlebell');
    if(kb&&!selected.some(e=>e.equipment==='kettlebell')&&selected.length>targets.length)selected[selected.length-1]=kb;
  }
  const exercises=selected.map(e=>{
    const sets=2+Math.floor(level/4),reps=Math.min(16,e.reps+level-Math.floor(level/4)),holdSeconds=e.holdSeconds?Math.min(45,e.holdSeconds+level*2):undefined;
    return {...e,sets:Math.min(4,sets),reps,holdSeconds,rest:60,tempo:level>=10?'slow':'normal',cycleSeconds:level>=12?6:level>=10?5:4,level};
  });
  const seconds=exercises.reduce((n,e)=>n+e.sets*((e.holdSeconds||e.reps*e.cycleSeconds)*(e.eachSide?2:1))+e.sets*e.rest,0)-60;
  return {regions,variant,level,exercises,estimatedMinutes:Math.max(1,Math.round(seconds/60)),key:trackKey(config)};
}
export function recordCompletion(track,result){
  const {sessionId,date,confirmed,total,feedback}=result;
  if(!sessionId||!/^\d{4}-\d{2}-\d{2}$/.test(date||'')||!(total>0)||confirmed!==total||!['good','hard','pain'].includes(feedback)||(track.sessionIds||[]).includes(sessionId))return {accepted:false};
  track.sessionIds=[...(track.sessionIds||[]),sessionId];track.completed=Number(track.completed||0)+1;track.lastCompletedDate=date;
  const before=Number(track.level||0);
  if(feedback==='pain')track.level=Math.max(0,before-1);
  else if(feedback==='good'&&track.lastCreditDate!==date){track.level=Math.min(12,before+1);track.lastCreditDate=date}
  return {accepted:true,advanced:track.level>before,level:track.level};
}
export function migrateWorkout(state){
  const old=state.workoutConfig||{};
  const ids=(old.customIds||old.customRoutine?.map(e=>e.id)||[]).filter(id=>EXERCISES.some(e=>e.id===id));
  state.workoutConfig={...old,schema:5,presetId:typeof old.presetId==='string'?old.presetId:'user-week',doseMode:old.schema>=5&&old.doseMode==='goal'?'goal':'fit',targetMinutes:[30,40,50,60].includes(old.targetMinutes)?old.targetMinutes:30,sundayMinutes:[30,40,50,60].includes(old.sundayMinutes)?old.sundayMinutes:40,bridgeVariant:old.bridgeVariant==='glute'?'glute':'reverse',planDay:clamp(old.planDay||1,1,7),regions:normalizeRegions(old.regions),variant:clamp(old.variant||1,1,3),mode:old.schema>=4&&['preset','weekly','cardio','auto','custom'].includes(old.mode)?old.mode:'preset',customIds:[...new Set(ids)]};
  state.savedPresets=Array.isArray(state.savedPresets)?state.savedPresets.slice(0,30):[];
  state.trainingTracks=state.trainingTracks&&typeof state.trainingTracks==='object'?state.trainingTracks:{};
  return state;
}
