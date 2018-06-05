/* FILENAME: visualizer.js
 * AUTHOR: Hank Wikle
 * LAST MODIFIED: 5 June 2018
 * DESCRIPTION: Live audio visualizer for Ozomatli performance at Interplanetary Festival 06/07/2018
*/

import {
  util,
  ColorMap,
  Model
} from "https://unpkg.com/@redfish/as-app3d?module";
//import {util, ColorMap, Model} from '../node_modules/@redfish/as-app3d/docs/dist/as-app3d.esm.js';

//Model = AS.Model;
//util = AS.util;

let abs = Math.abs;
let sin = Math.sin;
let max = Math.max;

const SAMPLE_RATE = 44100;
//const FFT_SIZE = 2*BINS;
const CANVAS_HEIGHT = 100;
const CANVAS_WIDTH = 500;

const MOUSE_SIZE = 5;
const IMPULSE_ENERGY = 9.34;
const COMPUTE_DIFFUSION = false;
const DIFFUSION_RATE = 0.13;
const DIFFUSION_ITERATIONS = 1;
const EVAPORATION = 0.38;
const COMPUTE_WAVES = true;
const WAVE_ITERATIONS = true;
const ENERGIZE_FIELD = false;
const POWER_FREQ_1 = 2.31;
const POWER_SCALE = 0.2;
const SURFACE_TENSION = 44.35;
const FRICTION = 0.8;
const RANDOMIZE_POWER = false;

//var FREQS = []; // Choose one frequency per band on water tower, evenly spaced

//for (let i=0; i<BINS; i++)
//    FREQS.push(i*SAMPLE_RATE/FFT_SIZE);

const INIT_ENERGY = 100;
const DIFFUSION_AMT = 0.5;
const MAX_Y = CANVAS_HEIGHT / 2;

util.toWindow({ Model, util });

export class Visualizer extends Model {
  setup(buffer) {
    this.ticks = 0;
    this.patchBreeds("nodes");
    this.patches.own(
      "energy displaceX displaceY temp energyVelocity storedEnergy"
    );
    this.nodes.own("phase restY waveNum");
    //this.freqs = freqs;
    this.buffer = buffer;
    this.numWaves = this.buffer.length;
    this.cmap = ColorMap.Rgb256;

    this.patches.ask(p => {
      if (abs(p.y) < MAX_Y && p.y % this.numWaves === 0) {
        p.sprout(1, this.nodes, n => {
          n.restY = n.y;
          n.waveNum = n.y / this.numWaves;
        });
      }
    });
    this.nodes.ask(n => {
      n.phase = n.x; //* freqs[n.waveNum];
      n.hide(); //ht - hide turtle
      // ask patch at -1 0 [ask one-of turtles-here [create-link-with aNode (self)]]
    });
  }

  step() {
    this.nodes.ask(n => {
      n.energy += n.y - n.restY;
      n.y = n.restY + this.buffer[n.waveNum] * sin(this.ticks + n.phase); // Correct use of this?
    });

    this.patches.diffuse("energy", DIFFUSION_AMT);

    let s = "";
    for (let i = 0; i < this.buffer.length; i++) s = s + `${this.buffer[i]} `;
    console.log(s);

    let maxEnergy = 300;

    this.patches.scaleColors(this.cmap, "energy", 0, maxEnergy);
    this.ticks++; // ++ in JS?
  }
}

/*const usingPuppeteer = navigator.userAgent === 'Puppeteer';

if (usingPuppeteer)
    util.randomSeed(); // Do I need this?

const options = Model.defaultWorld(125); // What should the default world be?
const model = new Visualizer(options);
model.setup();

const {world, patches, links, nodes} = model;
util.toWindow({world, patches, links, nodes, model});

util.yieldLoop(() => model.step(), 500); // How do I infinitely loop?

if (usingPuppeteer) { // Do I need this?
    window.modelDone = model.modelDone = true;
    window.modelSample = model.modelSample = modelIO.sampleJSON(model);
}*/
