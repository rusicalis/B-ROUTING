export const APPEARANCE_MODES=[{id:'dark',name:'다크 모드'},{id:'light',name:'라이트 모드'}];
export function normalizeAppearance(settings={}){return settings.uiMode==='light'?'light':'dark'}
export function appearancePalette(mode){const id=mode==='light'?'light':'dark';return {id,accent:'#ed3b2f',background:id==='dark'?'#0d0f13':'#f1f2f4',panel:id==='dark'?'#171b22':'#ffffff',text:id==='dark'?'#f5f6f7':'#15181e',muted:id==='dark'?'#a9b2bf':'#59616d',line:id==='dark'?'#363d48':'#cfd3da',selected:id==='dark'?'#ed3b2f':'#15181e'}}
