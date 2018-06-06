/* FILENAME: visualizer.js
 * AUTHOR: Hank Wikle
 * LAST MODIFIED: 6 June 2018
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

export class Visualizer extends Model {
  setup(buffer) {
    this.ticks = 0;
    this.patches.own("energy");
    this.turtles.own("waveNum", "frequency", "power");
    this.numWaves = buffer.length;
    this.buffer = buffer;
    this.cmap = ColorMap.Jet;
    this.diffusionRate = 0.8;
    this.dissipationRate = 0.02;

    this.turtles.create(this.buffer.length, t => {
        t.setxy(Math.random() * (this.world.maxX - this.world.minX) + this.world.minX,
            Math.random() * (this.world.maxX - this.world.minX) + this.world.minX);
        t.waveNum = t.id;
        t.frequency = (t.waveNum + 1) * SAMPLE_RATE / FFT_SIZE;
    });

    this.patches.ask(p => {
        p.energy = 0;
      });

  }

  step() {
    this.turtles.ask(t => {
      t.power = (this.buffer[t.waveNum] * Math.log(t.frequency)/Math.log(16*SAMPLE_RATE/FFT_SIZE));
      t.patch.energy += t.power;
    });

    this.patches.diffuse("energy", this.diffusionRate);
    this.patches.ask(p => {
        p.energy *= 1 - this.dissipationRate;
    });
    
    let maxEnergy = 500;
    this.patches.scaleColors(ColorMap.Jet, "energy", 0, 500);
    this.ticks++;
  }
}

util.toWindow({ Model, util });
