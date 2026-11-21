// Choose the action of the single image play control, independently from animation state.
export function imagePlaybackAction(session,hasPending=false){
 const phase=session?.phase;if(phase==='prep')return 'wait';if(phase==='feedback')return 'feedback';if(['work','rest'].includes(phase))return 'toggle';if(hasPending)return 'resume';return 'start';
}
// A progression track may contain different duration/volume prescriptions.
export function samePlaybackPlan(a,b){
 if(!a?.exercises?.length||!b?.exercises?.length)return false;
 const shape=p=>({key:p.key||null,kind:p.kind||null,day:p.day||null,level:p.level||0,targetMinutes:p.targetMinutes||null,exercises:p.exercises.map(e=>[e.id,e.sets,e.reps||0,e.holdSeconds||null,e.workSeconds||null,e.cycleSeconds||4,!!e.eachSide]),blocks:p.blocks||null});
 return JSON.stringify(shape(a))===JSON.stringify(shape(b));
}
