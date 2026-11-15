export function guideTiming(exercise,context={},previewPhase=0,previewSide=0){
 const cycle=Math.max(.6,Number(exercise.cycleSeconds)||4),perSide=exercise.holdSeconds||exercise.workSeconds||(exercise.reps||1)*cycle,elapsed=Math.max(0,Number(context.setElapsed)||0),working=context.phase==='work';
 const ended=working&&elapsed>=perSide*(exercise.eachSide?2:1),hold=!!exercise.holdSeconds;
 const side=working?(exercise.alternating?Math.floor(elapsed/cycle)%2:exercise.eachSide&&elapsed>=perSide?1:0):previewSide;
 const phase=hold?.5:ended?0:working?(elapsed%cycle)/cycle:Math.max(0,Math.min(.99999,previewPhase));
 const step=hold?1:phase<.2?0:phase<.7?1:2;
 const label=ended?'세트 가이드 완료':hold?'자세 유지':['준비 자세','동작 자세','처음 자세로'][step];
 return {phase,side,step,imageIndex:hold||step===1?1:0,label,ended,remaining:hold?Math.max(0,perSide-elapsed%perSide):Math.max(0,cycle-phase*cycle)};
}
