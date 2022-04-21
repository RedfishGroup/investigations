import * as THREE from 'three'

const depthScalar = 1 / (256 * 256)
const depthScalarString = '1. / (256. * 256.)'
const inverseDepthScalar = 256 * 256
const inverseDepthScalarString = '256. * 256.'
const depthThreshold = 0.000003

const packNumberToRGBA = `      
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
`
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
        
            ${packNumberToRGBA}
        
            void main() {
                gl_FragColor = packNumberToRGBA(distance(cameraPosition, vPosition)*` +
            depthScalarString +
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

            ${packNumberToRGBA}

            void main() {
                gl_FragColor = packNumberToRGBA(vtileIndex*` +
            depthScalarString +
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

            ${packNumberToRGBA}

            void main() {
                gl_FragColor = packNumberToRGBA(vZoomLevel*` +
            depthScalarString +
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
            height: { value: options.height || 1 },
            scale: { value: options.scale || 1 },
            fov: { value: options.fov || 1 },
        }

        const vertexShader = `
            precision highp float;

            varying vec4 vScreenCoords;
            varying mat4 vProjectionMatrix;

            void main() {
                vec4 screenCoords = projectionMatrix * modelViewMatrix * vec4(position, 1.);

                vScreenCoords = screenCoords;
                vProjectionMatrix = projectionMatrix;

                gl_Position = screenCoords;
            }
        `

        const fragmentShader = `
            precision highp float;

            uniform float fov;
            uniform float scale;
            uniform float height;
            uniform sampler2D depthTexture;

            varying vec4 vScreenCoords;
            varying mat4 vProjectionMatrix;

            // depth packing and unpacking functions

            ${packNumberToRGBA}

            // error calculation functions
            float getPixelError(const in float d) {
                float theta = fov / height;
                float epsilon = 2. * d * tan(theta / 2.);
                return epsilon;
            }

            float zoomCorrection(const in float error) {
                float PI = 3.141592;
                float radiusOfEarth = 6378100.;
                float error2 = abs(error);
                float newZoom = log2((2.*PI*radiusOfEarth) / (256. * error2));
                newZoom = round(newZoom);
                return newZoom;
            }

            void main() {
                mat4 clampTex = mat4(0.5,0.0,0.0,0.0,
                                     0.0,0.5,0.0,0.0,
                                     0.0,0.0,0.5,0.0,
                                     0.5,0.5,0.5,1.0);

                vec4 clampedCoords = clampTex * vScreenCoords;

                float depth = unpackRGBAToNumber(texture2DProj(depthTexture, clampedCoords)) * ${inverseDepthScalarString};
                float error = getPixelError(depth * scale);
                float newZoom = zoomCorrection(error);

                gl_FragColor = packNumberToRGBA(newZoom * ${depthScalarString});
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

    setFov(fov) {
        this.uniforms.fov = { value: fov }
        this.uniformsNeedUpdate = true
    }

    setDepthTexture(texture) {
        if (texture && texture.isTexture) {
            this.uniforms.depthTexture = new THREE.Uniform(texture)
            this.uniformsNeedUpdate = true
        }
    }
}

export class TileIndexColorMaterial extends THREE.ShaderMaterial {
    constructor(options = {}) {
        const side = options.side || THREE.FrontSide
        const wireframe = false
        const transparent = false

        const vertexShader = `
            precision highp float;

            attribute float tileIndex;

            varying float vTileIndex;

            void main() {
                vTileIndex = tileIndex;

                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.);
            }
        `

        const fragmentShader = `
            precision highp float;

            varying float vTileIndex;

            const float scale = 50.;
            const vec3 colors[6] = vec3[6](
                vec3(1., 0., 0.), vec3(1., 0.5, 0.), vec3(1., 1., 0.),
                vec3(0., 1., 0.5), vec3(0., 0.5, 1.), vec3(0.5, 0., 1.)
            );

            vec3 getColor(const in float tileIndex) {
                int length = colors.length();
                float p = float(length) * (mod(tileIndex, scale) / scale);

                int indexStart = int(floor(p));
                int indexEnd = indexStart + 1;
                if(indexEnd >= length) {
                    indexEnd = 0;
                }

                float percent = (p) - floor(p);

                return mix(colors[indexStart], colors[indexEnd], percent);
            }

            void main() {
                gl_FragColor = vec4(getColor(vTileIndex), 1.);
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

export class DepthColorShaderMaterial extends THREE.ShaderMaterial {
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

        const fragmentShader = `
            precision highp float;

            varying vec3 vPosition;

            const float scale = 30.;
            const vec3 colors[6] = vec3[6](
                vec3(1., 0., 0.), vec3(1., 0.5, 0.), vec3(1., 1., 0.),
                vec3(0., 1., 0.5), vec3(0., 0.5, 1.), vec3(0.5, 0., 1.)
            );

            vec3 getColor(const in float tileIndex) {
                int length = colors.length();
                float p = float(length) * (mod(tileIndex, scale) / scale);

                int indexStart = int(floor(p));
                int indexEnd = indexStart + 1;
                if(indexEnd >= length) {
                    indexEnd = 0;
                }

                float percent = (p) - floor(p);

                return mix(colors[indexStart], colors[indexEnd], percent);
            }

            void main() {
                gl_FragColor = vec4(getColor(distance(cameraPosition, vPosition)), 1.);
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

export class RidgeLineShaderMaterial extends THREE.ShaderMaterial {
    constructor(options) {
        const side = options.side || THREE.FrontSide
        const wireframe = false
        const transparent = false

        const uniforms = {
            depthTexture: new THREE.Uniform(
                options.depthTexture || new THREE.Texture()
            ),
            height: { value: options.height || 1 },
            width: { value: options.width || 1 },
        }

        const vertexShader = `
            precision highp float;

            varying vec4 vScreenCoords;
            varying mat4 vProjectionMatrix;

            void main() {
                vec4 screenCoords = projectionMatrix * modelViewMatrix * vec4(position, 1.);

                vScreenCoords = screenCoords;
                vProjectionMatrix = projectionMatrix;

                gl_Position = screenCoords;
            }
        `

        const fragmentShader = `
            precision highp float;

            uniform float height;
            uniform float width;
            uniform sampler2D depthTexture;

            varying vec4 vScreenCoords;
            varying mat4 vProjectionMatrix;

            // depth packing and unpacking functions
            ${packNumberToRGBA}

            const float scale = 30.;
            const vec3 colors[6] = vec3[6](
                vec3(1., 0., 0.), vec3(1., 0.5, 0.), vec3(1., 1., 0.),
                vec3(0., 1., 0.5), vec3(0., 0.5, 1.), vec3(0.5, 0., 1.)
            );

            vec3 getColor(const in float tileIndex) {
                int length = colors.length();
                float p = float(length) * (mod(tileIndex, scale) / scale);

                int indexStart = int(floor(p));
                int indexEnd = indexStart + 1;
                if(indexEnd >= length) {
                    indexEnd = 0;
                }

                float percent = (p) - floor(p);

                return mix(colors[indexStart], colors[indexEnd], percent);
            }

            mat4 clampTex = mat4(0.5,0.0,0.0,0.0,
                0.0,0.5,0.0,0.0,
                0.0,0.0,0.5,0.0,
                0.5,0.5,0.5,1.0);

            float laplaceFilter(const in vec4 uv, const in float width, const in float height) {
                float k = ${inverseDepthScalarString};

                float pix = 1.0; 

                vec4 up = clampTex * vec4(uv.x, uv.y +  pix / height, uv.zw);
                vec4 down = clampTex * vec4(uv.x, uv.y -  pix / height, uv.zw);
                vec4 left = clampTex * vec4(uv.x - pix / width, uv.y, uv.zw);
                vec4 right = clampTex * vec4(uv.x + pix / width, uv.y, uv.zw);
                vec4 center = clampTex * vec4(uv.x, uv.y, uv.zw);

                float upDepth = log(unpackRGBAToNumber(texture2DProj(depthTexture, up)) * k);
                float downDepth = log(unpackRGBAToNumber(texture2DProj(depthTexture, down)) * k);
                float leftDepth = log(unpackRGBAToNumber(texture2DProj(depthTexture, left)) * k);
                float rightDepth = log(unpackRGBAToNumber(texture2DProj(depthTexture, right)) * k);
                float centerDepth = log(unpackRGBAToNumber(texture2DProj(depthTexture, center)) * k);

                float result = abs(upDepth + downDepth + leftDepth + rightDepth - 4.0 * centerDepth);
                return result;
            }
         
            float sobelFilter(const in vec4 uv, const in float width, const in float height) {
                float k = ${inverseDepthScalarString};
                float pix = 1.0; 

                vec4 up = clampTex * vec4(uv.x, uv.y + pix / height, uv.zw);
                vec4 down = clampTex * vec4(uv.x, uv.y - pix / height, uv.zw);
                vec4 left = clampTex * vec4(uv.x - pix / width, uv.y, uv.zw);
                vec4 right = clampTex * vec4(uv.x + pix / width, uv.y, uv.zw);
                vec4 ul = clampTex * vec4(uv.x - pix / width, uv.y + pix / height, uv.zw);
                vec4 ur = clampTex * vec4(uv.x + pix / width, uv.y + pix / height, uv.zw);
                vec4 dl = clampTex * vec4(uv.x - pix / width, uv.y - pix / height, uv.zw);
                vec4 dr = clampTex * vec4(uv.x + pix / width, uv.y - pix / height, uv.zw);
                vec4 center = clampTex * vec4(uv.x, uv.y, uv.zw);

                float upDepth = log(unpackRGBAToNumber(texture2DProj(depthTexture, up)) * k);
                float downDepth = log(unpackRGBAToNumber(texture2DProj(depthTexture, down)) * k);
                float leftDepth = log(unpackRGBAToNumber(texture2DProj(depthTexture, left)) * k);
                float rightDepth = log(unpackRGBAToNumber(texture2DProj(depthTexture, right)) * k);
                float ulDepth = log(unpackRGBAToNumber(texture2DProj(depthTexture, ul)) * k);
                float urDepth = log(unpackRGBAToNumber(texture2DProj(depthTexture, ur)) * k);
                float dlDepth = log(unpackRGBAToNumber(texture2DProj(depthTexture, dl)) * k);
                float drDepth = log(unpackRGBAToNumber(texture2DProj(depthTexture, dr)) * k);
                float centerDepth = log(unpackRGBAToNumber(texture2DProj(depthTexture, center)) * k);

                float sobelX = abs(upDepth + 2.0 * centerDepth + downDepth - ulDepth - 2.0 * leftDepth - dlDepth);
                float sobelY = abs(ulDepth + 2.0 * centerDepth + urDepth -leftDepth - 2.0 * downDepth - drDepth);

                float sobelMagnitude = sqrt(sobelX * sobelX + sobelY * sobelY);

                return sobelMagnitude;
            }

            void main() {
                vec4 center = clampTex * vScreenCoords;
                float centerDepth2 = unpackRGBAToNumber(texture2DProj(depthTexture, center)) * ${inverseDepthScalarString};

                float foo = sobelFilter(vScreenCoords, width, height);
                vec3 color = 5.0*foo*vec3(1.0, 1.0, 1.0) + 0.4*getColor(centerDepth2);
                gl_FragColor = vec4(color, 1.0);
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
}

/**
 * Unpacks a value at pixel that has been RGBA encoded
 *
 * @param {int} x - pixel x value from 0 to 1
 * @param {int} y - pixel y value from 0 to 1
 * @param {Uint8Array} data - array data from render
 * @param {int} width - width of array
 * @param {int} height - height of array
 *
 * @returns {float} - unpacked value
 */
export function unpackPixel(x, y, data, width, height) {
    let indexX = Math.floor(x * width)
    let indexY = Math.floor(y * height)
    let index = 4 * (indexX + indexY * width)

    let r = data[index]
    let g = data[index + 1]
    let b = data[index + 2]
    let a = data[index + 3]

    let UnpackDownscale = 1 / 256
    let UnpackFactors = new THREE.Vector4(
        1 / (256 * 256 * 256),
        1 / (256 * 256),
        1 / 256,
        1
    ).multiplyScalar(UnpackDownscale)

    return new THREE.Vector4(r, g, b, a).dot(UnpackFactors) / depthScalar
}

/**
 * Renders pixels to a Uint8Array
 *
 * @param {THREE.WebGLRenderer} renderer
 * @param {THREE.Scene} scene
 * @param {CalibratedCamera} camera - either calibrated camera or THREE.Camera with width and height values
 *
 * @returns {Uint8Array}
 */
export function renderToUint8Array(renderer, scene, camera) {
    renderer.render(scene, camera)
    let gl = renderer.getContext()
    let data = new Uint8Array(camera.width * camera.height * 4)
    gl.readPixels(
        0,
        0,
        camera.width,
        camera.height,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        data
    )

    return data
}
