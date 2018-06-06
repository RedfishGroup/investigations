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

let abs = Math.abs;
let sin = Math.sin;
let max = Math.max;

const BINS = 16;
const SAMPLE_RATE = 44100;
const FFT_SIZE = 2*BINS;
const NUM_WAVES = 10;
const CANVAS_HEIGHT = 100;
const CANVAS_WIDTH = 500;
const MAX_Y = 10;
const GAIN = 1;

var FREQS = []; // Choose one frequency per band on water tower, evenly spaced

for (let i=1; i<BINS + 1; i++)
    FREQS.push(i*SAMPLE_RATE/FFT_SIZE);

const INIT_ENERGY = 100;

export class Visualizer extends Model {
  setup(buffer) {
    this.ticks = 0;
    this.patchBreeds("nodes");
    this.patches.own("energy");
    this.nodes.own("phase restY waveNum");
    this.numWaves = buffer.length;
    this.freqs = FREQS;
    this.buffer = buffer;
    this.cmap = ColorMap.Jet;
    //this.cmap = "red";

    this.patches.ask(p => {
      if (abs(p.y) < MAX_Y && p.y % this.numWaves === 0) {
        p.sprout(1, this.nodes, n => {
          n.restY = n.y;
          n.waveNum = n.y / this.numWaves;
        });
        p.energy = util.randomInt(INIT_ENERGY) - INIT_ENERGY / 2; // Guessed at this function
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
      n.energy = Math.random() * 300;
      n.y = n.restY + this.buffer[n.waveNum] * sin(this.ticks + n.phase); // Correct use of this?
    });

    this.patches.forEach(p => {
        p.energy = 10 * Math.floor(this.buffer[Math.abs(p.x)] / 10);
    });

    let maxEnergy = 300;
    this.patches.scaleColors(ColorMap.Jet, "energy", 0, maxEnergy);
    this.ticks++; // ++ in JS?
  }
}

util.toWindow({ Model, util });
