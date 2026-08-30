export function markDesignSpecEdited(designSpec) {
  designSpec.design_spec_revision = Number(designSpec.design_spec_revision || 0) + 1;
}

export function recordRenderedSvg(designState, svgString) {
  designState.svgString = svgString;
}
