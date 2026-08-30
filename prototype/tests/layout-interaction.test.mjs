import test from "node:test";
import assert from "node:assert/strict";
import { createDefaultElements, snapDelta, constrainPosition, moveElement, resetLayout, restoreLayout } from "../layout-interaction.js";

test("default elements distinguish draggable groups from locked boundaries", () => {
  const elements=createDefaultElements();
  assert.equal(elements.title.draggable,true);
  assert.equal(elements["visual-elements"].draggable,true);
  assert.equal(elements.cutline.draggable,false);
  assert.equal(elements.cutline.locked,true);
  assert.equal(elements.artboard.locked,true);
});

test("screen movement snaps to an 8px grid before converting to SVG units", () => {
  assert.deepEqual(snapDelta({x:19,y:5},2),{x:8,y:4});
  assert.deepEqual(snapDelta({x:-9,y:-17},1),{x:-8,y:-16});
});

test("position constraint keeps a minimum visible part inside artboard", () => {
  const position=constrainPosition({x:500,y:500},{x:20,y:20,width:40,height:30},{width:148,height:105},8);
  assert.deepEqual(position,{x:120,y:77});
});

test("locked element cannot move", () => {
  const elements=createDefaultElements();
  assert.deepEqual(moveElement(elements,"cutline",{x:16,y:8}),elements);
});

test("reset and one restore operation preserve a snapshot", () => {
  const elements=createDefaultElements();
  elements.title.position={x:16,y:8};
  const {next,undo}=resetLayout(elements);
  assert.deepEqual(next.title.position,{x:0,y:0});
  assert.deepEqual(restoreLayout(next,undo).title.position,{x:16,y:8});
});
