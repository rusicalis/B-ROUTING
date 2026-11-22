/** Keep an execution session independent from the next selection in Settings. */
export function configForSession(session){
 const p=session.plan||{},c=structuredClone(session.config||{}),key=session.trackKey||p.key||'';
 const mode=c.mode||(p.kind==='cardio'||key.startsWith('cardio:')?'cardio':key.startsWith('custom:')?'custom':key.startsWith('weekly:')?'weekly':p.compact||p.presetId?'preset':'auto');
 const target=p.targetMinutes||c.targetMinutes||[30,40,50,60].reduce((best,n)=>Math.abs(n-(p.estimatedMinutes||30))<Math.abs(best-(p.estimatedMinutes||30))?n:best,30);
 return {...c,mode,presetId:p.presetId||c.presetId||'user-week',planDay:p.day||c.planDay||1,targetMinutes:target,regions:structuredClone(c.regions||p.regions||['full']),variant:p.variant||c.variant||1,customIds:c.customIds|| (mode==='custom'?key.slice('custom:'.length).split('|').filter(Boolean):[]),doseMode:p.doseMode||c.doseMode||'fit',bridgeVariant:p.bridgeVariant||c.bridgeVariant||'reverse',intensity:session.intensity||p.intensity||c.intensity||'normal'};
}
export function sameRoutineConfig(a,b){
 const shape=c=>{const mode=c.mode==='weekly'?'weekly':c.mode||'preset',base=[mode,c.targetMinutes||30];if(mode==='preset')return [...base,c.presetId||'user-week',c.planDay||1,c.doseMode||'fit',c.bridgeVariant||'reverse'];if(mode==='weekly')return [...base,c.planDay||1];if(mode==='custom')return [...base,c.customIds||[]];if(mode==='auto')return [...base,[...(c.regions||['full'])].sort(),c.variant||1];return base};
 return JSON.stringify(shape(a))===JSON.stringify(shape(b));
}
