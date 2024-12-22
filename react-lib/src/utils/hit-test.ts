let hitTestSource: unknown;
let hitTestSourceRequested = false;

export default function hitTest(
  renderer: THREE.WebGLRenderer,
  reticle: THREE.Mesh,
  frame: any
) {
  if (frame) {
    const referenceSpace = renderer.xr.getReferenceSpace();
    const session = renderer.xr.getSession();

    if (hitTestSourceRequested === false && session) {
      session.requestReferenceSpace('viewer').then((space) => {
        // Note: requestHitTestSource() is experimental and has limited browser support
        session.requestHitTestSource!({ space })?.then((source) => {
          hitTestSource = source;
        });
      });

      session.addEventListener('end', () => {
        hitTestSourceRequested = false;
        hitTestSource = null;
      });

      hitTestSourceRequested = true;
    }

    if (hitTestSource) {
      const hitTestResults = frame.getHitTestResults(hitTestSource);

      if (hitTestResults.length) {
        const hit = hitTestResults[0];

        reticle.visible = true;
        reticle.matrix.fromArray(hit.getPose(referenceSpace).transform.matrix);
      } else {
        reticle.visible = false;
      }
    }
  }
  return true;
}
