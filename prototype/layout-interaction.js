const DRAGGABLE_IDS=["title","step-1","step-2","step-3","footer","visual-elements"];

export function createDefaultElements(){
  const elements=Object.fromEntries(DRAGGABLE_IDS.map(id=>[id,{id,position:{x:0,y:0},draggable:true,locked:false}]));
  elements.cutline={id:"cutline",position:{x:0,y:0},draggable:false,locked:true};
  elements.artboard={id:"artboard",position:{x:0,y:0},draggable:false,locked:true};
  return elements;
}

export function snapDelta(screenDelta,pixelsPerSvgUnit=1,grid=8){
  const scale=Math.max(.01,pixelsPerSvgUnit);
  return {x:Math.round(screenDelta.x/grid)*grid/scale,y:Math.round(screenDelta.y/grid)*grid/scale};
}

export function constrainPosition(position,bbox,artboard,minVisible=8){
  return {
    x:Math.min(artboard.width-minVisible-bbox.x,Math.max(minVisible-bbox.x-bbox.width,position.x)),
    y:Math.min(artboard.height-minVisible-bbox.y,Math.max(minVisible-bbox.y-bbox.height,position.y))
  };
}

export function moveElement(elements,id,position){
  const target=elements[id];
  if(!target?.draggable||target.locked)return elements;
  return {...elements,[id]:{...target,position:{x:position.x,y:position.y}}};
}

export function resetLayout(elements){
  const undo=structuredClone(elements);
  const next=Object.fromEntries(Object.entries(elements).map(([id,item])=>[id,{...item,position:{x:0,y:0}}]));
  return {next,undo};
}

export function restoreLayout(elements,undo){return undo?structuredClone(undo):elements;}
