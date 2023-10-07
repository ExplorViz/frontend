import * as THREE from 'three';
import type { ApplicationLabelData } from 'workers/landscape-data-worker/label-generator';

export function createLabelMaterial(
  texture: THREE.Texture,
  color: THREE.Color
): THREE.Material {
  const material = new THREE.MeshBasicMaterial({
    map: texture,
    side: THREE.FrontSide,
    transparent: true,
  });

  material.onBeforeCompile = (shader) => {
    // Modify shader to use custom UV coordinates per instance:
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <uv_pars_vertex>',
        `#include <uv_pars_vertex>
        attribute vec3 labelLayoutData;`
      )
      .replace(
        '#include <uv_vertex>',
        `#include <uv_vertex>
        float labelWidth = labelLayoutData.x;
        float labelHeight = labelLayoutData.y;
        float labelYOffset = labelLayoutData.z;
        vec2 customUV = MAP_UV * vec2(labelWidth, labelHeight) + vec2(0.0, labelYOffset);
        vMapUv = ( mapTransform * vec3( customUV, 1 ) ).xy;`
      );

    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <map_pars_fragment>',
        `#include <map_pars_fragment>
        uniform vec3 textColor;`
      )
      .replace(
        '#include <map_fragment>',
        `float textAlpha = texture2D(map, vMapUv).r;
        vec4 sampledDiffuseColor = vec4(textColor, textAlpha);
        diffuseColor *= sampledDiffuseColor;`
      );

    // TODO: Make uniforms accessible outside of this scope (?)
    shader.uniforms['textColor'] = { value: color };
  };

  return material;
}

export function createLabelLayoutDataAttribute(
  data: ApplicationLabelData['classes' | 'components']
): THREE.InstancedBufferAttribute {
  const shaderData = new Float32Array(
    Array.from(data.layout.values())
      .map((label) => [label.relWidth, label.height, label.bottom])
      .flat()
  );

  const attribute = new THREE.InstancedBufferAttribute(
    shaderData,
    3,
    undefined,
    1
  );
  attribute.needsUpdate = true;

  return attribute;
}

export function createLabelTexture(imageData: ImageData): THREE.Texture {
  const texture = new THREE.Texture(imageData);
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.anisotropy = 4;
  texture.needsUpdate = true;

  return texture;
}
