// Anatomical GIF references only; media remains © Gym visual and is not bundled.
// A paired repetition contains the complete left-and-right cycle shown in its GIF.
const exercise=(id,name,groups,equipment,gif,cues,extra={})=>({
 id,name,groups:groups.split(','),equipment,animation:id,cues,cue:cues[1],
 sets:2,reps:equipment==='kettlebell'?6:8,rest:30,cycleSeconds:4,jumping:false,
 ...(equipment==='kettlebell'?{weight:12,count:1}:{}),...extra,
});
const rows=[
 ['archer-pushup','아처 푸시업 · 양쪽 한 쌍','chest,shoulders,triceps','bodyweight','3294-A9qxk2F',[
  '손을 넓게 짚고 몸통을 곧게 유지합니다. 왼쪽과 오른쪽을 마치면 한 쌍 1회입니다.',
  '한쪽 팔꿈치를 굽혀 그쪽으로 가슴을 낮추고 반대 팔은 길게 편 상태를 유지합니다.',
  '바닥을 밀어 가운데로 돌아온 뒤 반대쪽을 진행하며 어깨가 불편한 깊이까지 내리지 않습니다.',
 ],{advanced:true,pairedReps:true}],
 ['pushup-rotation','푸시업 후 사이드 플랭크','chest,shoulders,triceps,core','bodyweight','0664-KhHJ338',[
  '손과 발로 바닥을 짚고 머리부터 발뒤꿈치까지 곧게 만듭니다.',
  '푸시업을 한 뒤 한 손을 위로 뻗으며 몸통을 옆으로 열어 사이드 플랭크를 만듭니다.',
  '골반이 처지지 않게 손을 바닥으로 되돌립니다. 같은 방향을 마친 뒤 반대쪽을 진행합니다.',
 ],{eachSide:true,advanced:true}],
 ['hindu-pushup','모디파이드 힌두 푸시업','chest,shoulders,triceps','bodyweight','3217-epOSYUZ',[
  '손과 발을 바닥에 두고 엉덩이를 높여 역 V자 자세로 준비합니다.',
  '팔꿈치를 굽히며 가슴을 바닥 가까이 앞으로 통과시키고 팔을 펴 가슴을 듭니다.',
  '목을 뒤로 꺾지 않고 엉덩이를 뒤로 올려 준비 자세로 돌아옵니다.',
 ],{advanced:true}],
 ['floor-triceps-dip','맨몸 플로어 딥스','triceps,shoulders','bodyweight','0815-7aVz15j',[
  '바닥에 앉아 무릎을 굽히고 양손은 엉덩이 뒤에 둡니다.',
  '발과 손으로 지지하며 엉덩이를 살짝 띄우고 팔꿈치를 뒤로 굽힙니다.',
  '손바닥으로 밀어 팔꿈치를 펴며 어깨가 편안한 얕은 범위에서 반복합니다.',
 ]],
 ['plank-triceps-extension','플랭크 삼두 익스텐션','triceps,shoulders,core','bodyweight','0137-U6G2gk9',[
  '팔꿈치와 아래팔을 바닥에 대고 다리를 뻗어 몸을 일직선으로 만듭니다.',
  '손바닥으로 바닥을 밀어 양쪽 팔꿈치를 펴고 손으로 지지하는 플랭크가 됩니다.',
  '복부를 고정한 채 양쪽 아래팔을 천천히 내려 준비 자세로 돌아옵니다.',
 ],{advanced:true}],
 ['side-lying-biceps-curl','사이드 라잉 바디 컬','biceps,core','bodyweight','1769-gscGLOU',[
  '옆으로 누워 무릎을 조금 굽히고 아래쪽 팔을 몸통 아래에 둡니다.',
  '아래쪽 팔꿈치를 바닥에 둔 채 팔을 굽혀 상체를 조금 들어 올립니다.',
  '목을 당기거나 반동을 쓰지 않고 천천히 내려온 뒤 반대쪽을 진행합니다.',
 ],{eachSide:true}],
 ['prone-swimmer','프론 스위머 · 양쪽 한 쌍','back,lowerback,legs,core','bodyweight','3433-SP3hUez',[
  '엎드려 팔을 머리 위로 뻗습니다. 왼쪽과 오른쪽 교대를 마치면 한 쌍 1회입니다.',
  '반대쪽 팔과 다리를 작게 들어 올리고 부드럽게 교대합니다.',
  '배를 가볍게 조이고 목을 길게 유지하며 허리를 크게 젖히지 않습니다.',
 ],{pairedReps:true}],
 ['forearm-plank-rotation','포어암 플랭크 회전','shoulders,core','bodyweight','0464-CosupLu',[
  '팔꿈치를 어깨 아래에 두고 다리를 뻗어 포어암 플랭크를 만듭니다.',
  '한쪽 아래팔로 바닥을 밀며 몸통을 옆으로 열고 반대 팔을 위로 뻗습니다.',
  '골반을 제어하며 두 아래팔 지지로 돌아옵니다. 같은 방향을 마친 뒤 반대쪽을 진행합니다.',
 ],{eachSide:true}],
 ['russian-twist','러시안 트위스트 · 양쪽 한 쌍','core','bodyweight','0687-XVDdcoj',[
  '무릎을 굽혀 앉고 발을 바닥에 둡니다. 왼쪽과 오른쪽을 마치면 한 쌍 1회입니다.',
  '등을 길게 세워 몸통을 조금 기울이고 양손을 모아 몸통과 함께 좌우로 회전합니다.',
  '골반과 발을 안정시키고 손만 휘두르거나 허리를 둥글게 말지 않습니다.',
 ],{pairedReps:true}],
 ['reverse-crunch','리버스 크런치','core','bodyweight','0872-nCU1Ekp',[
  '등을 대고 누워 팔을 몸 옆에 두고 무릎을 굽혀 듭니다.',
  '복부로 골반을 가볍게 말아 올리며 무릎을 가슴 쪽으로 가져옵니다.',
  '다리를 휘두르지 않고 골반을 천천히 바닥에 내려놓습니다.',
 ]],
 ['heel-touch','힐 터치 · 양쪽 한 쌍','core','bodyweight','0006-qaZVsGk',[
  '누워 무릎을 세우고 발을 바닥에 둡니다. 왼쪽과 오른쪽을 마치면 한 쌍 1회입니다.',
  '어깨를 조금 든 상태에서 몸통을 옆으로 굽혀 같은 쪽 뒤꿈치를 향해 손을 뻗습니다.',
  '목을 길게 유지하며 가운데로 돌아와 반대쪽 뒤꿈치를 향해 반복합니다.',
 ],{pairedReps:true}],
 ['bicycle-crunch','바이시클 크런치 · 양쪽 한 쌍','core','bodyweight','0003-1ZFqTDN',[
  '누워 손을 머리 옆에 가볍게 두고 무릎을 듭니다. 양쪽 교대가 한 쌍 1회입니다.',
  '한쪽 무릎을 당기며 반대쪽 어깨를 그 무릎 쪽으로 돌리고 다른 다리는 길게 뻗습니다.',
  '머리를 손으로 당기지 않고 복부를 조절하며 반대쪽으로 교대합니다.',
 ],{pairedReps:true}],
 ['side-lying-leg-raise','사이드 라잉 힙 어브덕션','legs','bodyweight','0710-7WaDzyL',[
  '옆으로 누워 아래쪽 팔로 머리를 편안히 받치고 두 다리를 길게 뻗습니다.',
  '골반을 포개고 위쪽 다리를 곧게 유지한 채 옆으로 들어 올립니다.',
  '몸통이 뒤로 넘어가지 않게 천천히 내린 뒤 반대쪽을 진행합니다.',
 ],{eachSide:true}],
 ['side-lying-adduction','사이드 라잉 힙 어덕션','legs','bodyweight','3667-c8f5cSY',[
  '옆으로 누워 아래쪽 다리를 뻗고 위쪽 무릎을 굽혀 그 발을 몸 앞 바닥에 둡니다.',
  '골반을 안정시킨 채 아래쪽 다리를 곧게 유지하며 조금 들어 올립니다.',
  '반동 없이 천천히 내리고 같은 쪽을 마친 뒤 반대쪽을 진행합니다.',
 ],{eachSide:true}],
 ['curtsey-lunge','커트시 런지 · 양쪽 한 쌍','legs,core','bodyweight','3769-gUjqdei',[
  '발을 골반너비로 벌리고 섭니다. 왼쪽과 오른쪽을 마치면 한 쌍 1회입니다.',
  '한 발을 반대쪽 뒤로 대각선으로 보내며 양 무릎을 편안한 깊이까지 굽힙니다.',
  '앞다리로 바닥을 밀어 서고 반대쪽을 진행하며 앞무릎이 안으로 무너지지 않게 합니다.',
 ],{pairedReps:true}],
 ['forward-lunge','포워드 런지 · 양쪽 한 쌍','legs,core','bodyweight','3470-kMzUs9Y',[
  '골반너비로 섭니다. 왼쪽과 오른쪽으로 한 번씩 나가면 한 쌍 1회입니다.',
  '한 발을 앞으로 디디며 양 무릎을 굽히고 앞발 전체로 체중을 받습니다.',
  '앞발로 바닥을 밀어 제자리로 돌아온 뒤 반대쪽으로 진행합니다.',
 ],{pairedReps:true}],
 ['single-calf-raise','싱글 레그 카프 레이즈','legs','bodyweight','1387-0jp9Rlz',[
  '한 발로 서고 다른 무릎은 살짝 굽혀 발을 바닥에서 뗍니다.',
  '서 있는 발의 앞부분으로 바닥을 고르게 눌러 뒤꿈치를 들어 올립니다.',
  '발목이 기울지 않게 천천히 내리고 균형을 유지할 수 있는 범위에서 양쪽을 진행합니다.',
 ],{eachSide:true}],
 ['cross-body-crunch','크로스 바디 크런치','core','bodyweight','0262-rbu5UUb',[
  '누워 무릎을 세우고 손을 머리 옆에 가볍게 둡니다.',
  '한쪽 무릎을 당기며 반대쪽 어깨를 그 무릎 방향으로 돌려 들어 올립니다.',
  '허리를 크게 비틀거나 목을 당기지 않고 돌아옵니다. 같은 방향을 마친 뒤 반대쪽을 진행합니다.',
 ],{eachSide:true}],
 ['kb-figure-eight','케틀벨 피겨 에이트','legs,core,lowerback','kettlebell','0532-L4ay0PW',[
  '발을 넓게 벌리고 엉덩이를 뒤로 보내 한 손으로 케틀벨을 잡습니다. 8자 한 바퀴가 1회입니다.',
  '등을 중립으로 유지하며 다리 사이 뒤쪽에서 반대 손으로 케틀벨을 안전하게 넘깁니다.',
  '반대 다리 뒤쪽에서도 손을 바꿔 8자를 완성하며 손잡이를 확실히 잡은 뒤 놓습니다.',
 ],{advanced:true}],
 ['kb-lunge-pass','케틀벨 런지 패스 스루','legs,core','kettlebell','0536-WKMQzCD',[
  '한 손으로 케틀벨을 들고 서서 앞으로 한 발을 디뎌 런지 자세를 만듭니다.',
  '몸통을 안정시킨 채 앞쪽 허벅지 아래로 케틀벨을 보내 반대 손으로 잡습니다.',
  '앞발로 바닥을 밀어 서고 케틀벨을 제어하며 같은 앞다리를 마친 뒤 반대쪽을 진행합니다.',
 ],{eachSide:true,advanced:true}],
 ['kb-swing','케틀벨 투핸드 스윙','legs,back,lowerback,core','kettlebell','0549-UHJlbu3',[
  '스윙 동작에 익숙할 때 선택합니다. 양손으로 케틀벨을 잡고 발을 어깨너비로 둡니다.',
  '엉덩이를 뒤로 보내 케틀벨을 다리 사이로 받은 뒤 엉덩이를 펴 가슴 높이까지 보냅니다.',
  '팔로 들어 올리지 않고 발은 바닥에 둔 채 힙 힌지로 되받으며 반동을 제어합니다.',
 ],{advanced:true}],
 ['kb-floor-seated-press','케틀벨 바닥 원암 시티드 프레스','shoulders,triceps,core','kettlebell','0546-BkxB8LW',[
  '바닥에 앉아 다리를 넓게 뻗고 케틀벨 한 개를 한쪽 어깨 앞에 둡니다.',
  '몸통을 곧게 유지하며 한 손으로 케틀벨을 머리 위로 밀어 올립니다.',
  '허리를 과하게 젖히지 않고 어깨 앞으로 천천히 내린 뒤 반대쪽을 진행합니다.',
 ],{eachSide:true}],
 ['kb-push-press','케틀벨 원암 푸시 프레스','shoulders,triceps,legs,core','kettlebell','0540-osdXT3K',[
  '푸시 프레스에 익숙할 때 선택합니다. 케틀벨 한 개를 한쪽 어깨 앞에서 받칩니다.',
  '무릎을 조금 굽혔다 펴는 힘을 팔의 밀기에 연결해 케틀벨을 머리 위로 보냅니다.',
  '점프하지 않고 발을 바닥에 둡니다. 어깨 앞으로 제어해 내린 뒤 양쪽을 진행합니다.',
 ],{eachSide:true,advanced:true}],
 ['kb-windmill','케틀벨 원암 윈드밀','shoulders,core,lowerback,legs','kettlebell','0554-9Tkqa9O',[
  '윈드밀에 익숙하고 12kg을 안정적으로 지지할 때 선택합니다. 한 손으로 케틀벨을 위에 둡니다.',
  '케틀벨 쪽 팔을 수직으로 유지하며 엉덩이를 옆뒤로 보내고 빈손을 반대쪽 다리 방향으로 내립니다.',
  '어깨와 허리가 편안한 범위에서 몸통을 일으키며 케틀벨을 제어한 뒤 양쪽을 진행합니다.',
 ],{eachSide:true,advanced:true}],
 ['kb-hang-clean','케틀벨 원암 행 클린','legs,back,shoulders,biceps,core','kettlebell','0535-LHWF7us',[
  '클린 기술에 익숙할 때 선택합니다. 한 손으로 케틀벨을 잡고 엉덩이를 뒤로 보냅니다.',
  '엉덩이와 무릎을 펴는 힘으로 케틀벨을 몸 가까이 올리고 손을 돌려 어깨 앞에 받칩니다.',
  '손목에 케틀벨을 부딪치거나 점프하지 않고 제어해 내려놓으며 양쪽을 진행합니다.',
 ],{eachSide:true,advanced:true}],
];

export const EXTRA_EXERCISES=rows.map(([id,name,groups,equipment,gif,cues,extra])=>exercise(id,name,groups,equipment,gif,cues,extra));
export const EXTRA_MEDIA=rows.map(([id,name,groups,equipment,gif,cues,extra])=>({
 id,provider:'gif',url:'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/'+gif+'.gif',
 frames:[],source:'© Gym visual',sourceUrl:'https://gymvisual.com/',
 note:extra?.pairedReps?'왼쪽과 오른쪽을 모두 마친 한 쌍을 1회로 셉니다.':'',
}));
