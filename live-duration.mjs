import {normalizeProgress} from './session-progress.mjs';
import {infinitePlan,reconcileSessionPlan} from './session-plan.mjs';

/** Resize the Normal baseline, then reconcile the current absolute intensity. */
export function applyLiveDuration(session,nextNormalPlan){
 if(![30,40,50,60].includes(nextNormalPlan?.targetMinutes))throw new RangeError('Unsupported workout duration.');
 if(infinitePlan(session.plan)||infinitePlan(nextNormalPlan)||!['prep','work','rest','stopped'].includes(session.phase))throw new RangeError('This session cannot change duration.');
 if(session.plan.targetMinutes===nextNormalPlan.targetMinutes&&session.plan.intensityPolicy===2)return normalizeProgress(structuredClone(session));
 return reconcileSessionPlan(session,nextNormalPlan);
}
