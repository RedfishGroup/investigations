import * as THREE from 'three'

const depthScalar = '1. / (256. * 256.)'
const inverseDepthScalar = '256. * 256.'
const depthThreshold = 0.000003

export class ElevationShaderMaterial extends THREE.ShaderMaterial {
    constructor(options = {}) {
        const side = options.side || THREE.FrontSide
        const wireframe = options.wireframe || false
        const transparent = options.transparent || false

        const uniforms = {
            min: { value: options.min || 0 },
            max: { value: options.max || 1 },
            color: new THREE.Uniform(
                new THREE.Color(options.color || 0xffffff)
            ),
        }

        const vertexShader = `
            precision highp float;
    
            attribute float elevation;
    
            varying vec3 vPosition;
            varying float vElevation;
    
            void main() {
              vPosition = position;
              vElevation = elevation;
    
              gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.);
            }`
        const fragmentShader = `
            precision highp float;
    
            uniform float min;
            uniform float max;
            uniform vec3 color;
    
            varying vec3 vPosition;
            varying float vElevation;
    
            void main() {
                float scale = (vElevation - min) / (max - min);
                gl_FragColor = vec4(color.r * scale, color.g * scale, color.b * scale, 1.);
            }
        `

        super({
            side,
            uniforms,
            wireframe,
            transparent,
            vertexShader,
            fragmentShader,
        })
    }

    setMin(min) {
        if (!isNaN(min)) {
            this.uniforms.min = { value: min }
            this.uniformsNeedUpdate = true
        }
    }

    setMax(max) {
        if (!isNaN(max)) {
            this.uniforms.max = { value: max }
            this.uniformsNeedUpdate = true
        }
    }

    setColor(color) {
        if (color) {
            this.uniforms.color = new THREE.Uniform(new THREE.Color(color))
            this.uniformsNeedUpdate = true
        }
    }
}

export class DepthShaderMaterial extends THREE.ShaderMaterial {
    constructor(options = {}) {
        const side = options.side || THREE.FrontSide
        const wireframe = false
        const transparent = false

        const vertexShader = `
            precision highp float;

            varying vec3 vPosition;

            void main() {
                vPosition = position;

                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.);
            }
        `

        const fragmentShader =
            `
            precision highp float;
        
            varying vec3 vPosition;
        
            const float PackUpscale = 256. / 255.; // fraction -> 0..1 (including 1)
            const float UnpackDownscale = 255. / 256.; // 0..1 -> fraction (excluding 1)
        
            const vec3 PackFactors = vec3(256. * 256. * 256., 256. * 256., 256.);
            const vec4 UnpackFactors = UnpackDownscale / vec4(PackFactors, 1.);
        
            const float ShiftRight8 = 1. / 256.;
        
            vec4 packDepthToRGBA(const in float v) {
                vec4 r = vec4(fract(v * PackFactors), v);
                r.yzw -= r.xyz * ShiftRight8; // tidy overflow
                return r * PackUpscale;
            }
        
            float unpackRGBAToDepth(const in vec4 v) {
                return dot(v, UnpackFactors);
            }
        
            void main() {
                gl_FragColor = packDepthToRGBA(distance(cameraPosition, vPosition)*` +
            depthScalar +
            `);
            }
        `

        super({
            side,
            wireframe,
            transparent,
            vertexShader,
            fragmentShader,
        })
    }
}

export class TilePickingMaterial extends THREE.ShaderMaterial {
    constructor(options = {}) {
        const side = options.side || THREE.FrontSide
        const wireframe = false
        const transparent = false

        const vertexShader = `
            precision highp float;

            attribute float tileIndex;

            varying float vtileIndex;

            void main() {
                vtileIndex = tileIndex;

                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.);
            }
        `

        const fragmentShader =
            `
            precision highp float;

            varying float vtileIndex;

            const float PackUpscale = 256. / 255.; // fraction -> 0..1 (including 1)
            const float UnpackDownscale = 255. / 256.; // 0..1 -> fraction (excluding 1)
        
            const vec3 PackFactors = vec3(256. * 256. * 256., 256. * 256., 256.);
            const vec4 UnpackFactors = UnpackDownscale / vec4(PackFactors, 1.);
        
            const float ShiftRight8 = 1. / 256.;
        
            vec4 packNumberToRGBA(const in float v) {
                vec4 r = vec4(fract(v * PackFactors), v);
                r.yzw -= r.xyz * ShiftRight8; // tidy overflow
                return r * PackUpscale;
            }
        
            float unpackRGBAToNumber(const in vec4 v) {
                return dot(v, UnpackFactors);
            }

            void main() {
                gl_FragColor = packNumberToRGBA(vtileIndex*` +
            depthScalar +
            `);
            }
        `

        super({
            side,
            wireframe,
            transparent,
            vertexShader,
            fragmentShader,
        })
    }
}

export class ZoomPickingMaterial extends THREE.ShaderMaterial {
    constructor(options = {}) {
        const side = options.side || THREE.FrontSide
        const wireframe = false
        const transparent = false

        const vertexShader = `
            precision highp float;

            attribute float zoom;

            varying float vZoomLevel;

            void main() {
                vZoomLevel = zoom;

                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.);
            }
        `

        const fragmentShader =
            `
            precision highp float;

            varying float vZoomLevel;

            const float PackUpscale = 256. / 255.; // fraction -> 0..1 (including 1)
            const float UnpackDownscale = 255. / 256.; // 0..1 -> fraction (excluding 1)
        
            const vec3 PackFactors = vec3(256. * 256. * 256., 256. * 256., 256.);
            const vec4 UnpackFactors = UnpackDownscale / vec4(PackFactors, 1.);
        
            const float ShiftRight8 = 1. / 256.;
        
            vec4 packNumberToRGBA(const in float v) {
                vec4 r = vec4(fract(v * PackFactors), v);
                r.yzw -= r.xyz * ShiftRight8; // tidy overflow
                return r * PackUpscale;
            }
        
            float unpackRGBAToNumber(const in vec4 v) {
                return dot(v, UnpackFactors);
            }

            void main() {
                gl_FragColor = packNumberToRGBA(vZoomLevel*` +
            depthScalar +
            `);
            }
        `

        super({
            side,
            wireframe,
            transparent,
            vertexShader,
            fragmentShader,
        })
    }
}

export class TileNeedsUpdateMaterial extends THREE.ShaderMaterial {
    constructor(options) {
        const side = options.side || THREE.FrontSide
        const wireframe = false
        const transparent = false

        const uniforms = {
            depthTexture: new THREE.Uniform(
                options.depthTexture || new THREE.Texture()
            ),
            zoomTexture: new THREE.Uniform(
                options.zoomTexture || new THREE.Texture()
            ),
        }

        const vertexShader = `
            precision highp float;

            varying vec4 vScreenCoords;
            varying mat4 vProjectionMatrix;

            void main() {
                vec4 screenCoords = projectionMatrix * modelViewMatrix * vec4(position, 1.);

                vScreenCoords = screenCoords;

                gl_Position = screenCoords;
            }
        `

        const fragmentShader =
            `
            precision highp float;

            uniform float scale;
            uniform float cameraHeight;
            uniform sampler2D depthTexture;
            uniform sampler2D zoomTexture;

            varying vec4 vScreenCoords;
            varying mat4 vProjectionMatrix;

            // depth packing and unpacking functions
            const float PackUpscale = 256. / 255.; // fraction -> 0..1 (including 1)
            const float UnpackDownscale = 255. / 256.; // 0..1 -> fraction (excluding 1)
        
            const vec3 PackFactors = vec3(256. * 256. * 256., 256. * 256., 256.);
            const vec4 UnpackFactors = UnpackDownscale / vec4(PackFactors, 1.);
        
            const float ShiftRight8 = 1. / 256.;
        
            vec4 packNumberToRGBA(const in float v) {
                vec4 r = vec4(fract(v * PackFactors), v);
                r.yzw -= r.xyz * ShiftRight8; // tidy overflow
                return r * PackUpscale;
            }
        
            float unpackRGBAToNumber(const in vec4 v) {
                return dot(v, UnpackFactors);
            }

            // error calculation functions
            // error in meters per pixel at the equator
            const float zoomError[21] = float[21](
                156412., 78206., 39103., 19551.,
                9776., 4888., 2444., 1222., 610.984,
                305.492, 152.746, 76.373, 38.187,
                19.093, 9.547, 4.773, 2.387, 1.193,
                0.596, 0.298, 0.149
            );

            float getPixelError(const in float d) {
                float vfov = 2. * atan(1. / vProjectionMatrix[2][2]);
                float theta = vfov / cameraHeight;
                float epsilon = 2. * d * atan(theta / 2.);
                return epsilon * scale;
            }

            float zoomCorrection(const in float error, const in int zoom) {
                float z_err = zoomError[zoom];

                float correction;
                if(error > z_err) {
                    //
                } else if(error < z_err) {
                    //
                } else {
                    //
                }

                return correction;
            }

            void main() {
                mat4 clampTex = mat4(0.5,0.0,0.0,0.0,
                                     0.0,0.5,0.0,0.0,
                                     0.0,0.0,0.5,0.0,
                                     0.5,0.5,0.5,1.0);

                vec4 clampedCoords = clampTex * vScreenCoords;

                float depth = unpackRGBAToNumber(texture2DProj(depthTexture, clampedCoords))*` +
            inverseDepthScalar +
            `;
                float zoom = unpackRGBAToNumber(texture2DProj(zoomTexture, clampedCoords))*` +
            inverseDepthScalar +
            `;
                gl_FragColor = vec4(zoom*10./256., zoom*10./256., zoom*10./256., 1.);
            }
        `

        super({
            side,
            uniforms,
            wireframe,
            transparent,
            vertexShader,
            fragmentShader,
        })
    }

    setDepthTexture(texture) {
        if (texture && texture.isTexture) {
            this.uniforms.depthTexture = new THREE.Uniform(texture)
            this.uniformsNeedUpdate = true
        }
    }

    setZoomTexture(texture) {
        if (texture && texture.isTexture) {
            this.uniforms.zoomTexture = new THREE.Uniform(texture)
            this.uniformsNeedUpdate = true
        }
    }
}
