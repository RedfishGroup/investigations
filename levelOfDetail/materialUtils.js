import * as THREE from 'three'
import { ShaderMaterial } from 'three'

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

        const depthScalar = 1 / (256 * 256)
        const depthThreshold = 0.000003

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

        this.depthScalar = depthScalar
        this.depthThreshold = depthThreshold
    }
}

export class TilePickingMaterial extends THREE.ShaderMaterial {
    constructor(options = {}) {
        const side = options.side || THREE.FrontSide
        const wireframe = false
        const transparent = false

        const depthScalar = 1 / (256 * 256)
        const depthThreshold = 0.000003

        const vertexShader = `
            precision highp float;

            attribute float zoomIndex;

            varying float vZoomIndex;

            void main() {
                vZoomIndex = zoomIndex;

                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.);
            }
        `

        const fragmentShader =
            `
            precision highp float;

            varying float vZoomIndex;

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
                gl_FragColor = packNumberToRGBA(vZoomIndex*` +
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

        this.depthScalar = depthScalar
        this.depthThreshold = depthThreshold
    }
}

export class TileNeedsUpdateMaterial extends THREE.ShaderMaterial {
    constructor(options) {
        const side = options.side || THREE.FrontSide
        const wireframe = false
        const transparent = false

        const depthScalar = 1 / (256 * 256)
        const depthThreshold = 0.000003

        const vertexShader = `
            precision highp float;

            attribute float zoomIndex;

            varying float vZoomIndex;

            void main() {
                vZoomIndex = zoomIndex;

                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.);
            }
        `

        const fragmentShader =
            `
            precision highp float;

            varying float vZoomIndex;

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
                gl_FragColor = packNumberToRGBA(vZoomIndex*` +
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

        this.depthScalar = depthScalar
        this.depthThreshold = depthThreshold
    }
}
