/* FILENAME: visualizer.js
 * AUTHOR: Hank Wikle
 * LAST MODIFIED: 7 June 2018
 * DESCRIPTION: Live audio visualizer for Ozomatli performance at Interplanetary Festival 06/07/2018
*/

import {
  util,
  ColorMap,
  Model,
  SpriteSheet,
} from 'https://backspaces.github.io/as-app3d/dist/as-app3d.esm.js';

const paths = [
  ['./pngs/Alibi.png', 1.0],
  ['./pngs/Amd.png', 1.0],
  ['./pngs/Axle.png', 1.5],
  ['./pngs/Biocultura.png', 1.5],
  ['./pngs/Currents.png', 2.0],
  ['./pngs/EMA.png', 1.0],
  ['./pngs/Evoke.png', 1.5],
  ['./pngs/MillerOmegaProgram.png', 2.8],
  ['./pngs/FormAndConcept.png', 1.5],
  ['./pngs/Heliotown.png', 1.5],
  ['./pngs/HotelSantaFe.png', 1.0],
  ['./pngs/IAIA.png', 1.0],
  ['./pngs/JCC.png', 2.0],
  ['./pngs/JenniferBrianMurphy.png', 2.7],
  ['./pngs/LaserTalks.png', 1.0],
  ['./pngs/MakeSantaFe.png', 1.0],
  ['./pngs/MeowWolf.png', 1.0],
  ['./pngs/PasaTiempo.png', 1.0],
  ['./pngs/RailyardArtsDistrict.png', 2.0],
  ['./pngs/RailyardParkConservancy.png', 1.0],
  ['./pngs/SFArtsCommission.png', 1.0],
  ['./pngs/SFCC.png', 1.0],
  ['./pngs/SFChildrensMuseum.png', 1.0],
  ['./pngs/SFFarmersMarket.png', 1.5],
  ['./pngs/SFI.png', 2.5],
  ['./pngs/SFR.png', 1.0],
  ['./pngs/SiteSantaFe.png', 1.0],
  ['./pngs/ThomaFoundation.png', 1.0],
  ['./pngs/UnitedTherapeutics.png', 2.8],
  ['./pngs/VioletCrown.png', 1.0],
];

const sprites = [];

let abs = Math.abs;
let sin = Math.sin;
let max = Math.max;

const BINS = 16;
const SAMPLE_RATE = 44100;
const FFT_SIZE = 2 * BINS;
const NUM_WAVES = 10;
const CANVAS_HEIGHT = 100;
const CANVAS_WIDTH = 500;
const MAX_Y = 10;
const GAIN = 1;

util.toWindow({ Model, util });

export class Visualizer extends Model {
  async startup() {
    let path, larger;
    for ([path, larger] of paths) {
      const img = await util.imagePromise(path);
      const sprite = this.spriteSheet.newSprite(img, 'black');
      sprites.push([sprite, larger]);
    }
    window.sprites = sprites;
  }

  setup(buffer) {
    this.ticks = 0;
    this.patches.own('energy', 'energyVelocity');
    this.turtles.own('waveNum', 'frequency', 'power', 'speed');
    this.numWaves = buffer.length;
    this.buffer = buffer;
    this.cmap = ColorMap.gradientColorMap(256, [
      [0, 0, 127],
      [0, 0, 255],
      [0, 127, 255],
      [0, 255, 255],
      [127, 255, 127],
      [40, 0, 40],
      [0, 0, 0],
      [40, 0, 40],
      [127, 255, 127],
      [255, 255, 0],
      [255, 127, 0],
      [255, 0, 0],
      [127, 0, 0],
    ]);

    this.diffusionRate = 0.01;
    this.dissipationRate = 0.01;
    this.speed = 0.0;
    this.friction = 0.99;
    this.surfaceTension = 70;
    this.energyLimit = 1000;
    this.ampScalar = 100;
    this.k = 1 - 0.01 * this.surfaceTension;
    this.totalEnergy = 0;
    this.goalEnergy = 100;
    this.ticks = 0;
    this.sinTick = 0.1;
    this.showTurtles = true;
    this.randomNoise = 1;
    this.currentSprite = 0;
    this.ticksPerSprite = 100;

    this.maskSize = 0;
    this.maskHeading = 0;
    this.maskX = 0;
    this.maskY = 0;

    this.turtleHeading = 0;

    this.turtles.create(this.buffer.length, t => {
      //this.turtles.create(1, t => {
      t.setxy(
        ((t.id + 0.5) / this.buffer.length) *
          (this.world.maxX - this.world.minX) +
          this.world.minX,
        0
        // (t.id / this.buffer.length) * (this.world.maxX - this.world.minX) +
        //   this.world.minX
      );
      //t.setxy(Math.random() * (this.world.maxX - this.world.minX) + this.world.minX,
      //    Math.random() * (this.world.maxX - this.world.minX) + this.world.minX);
      t.waveNum = t.id;
      //t.setxy((this.world.maxX - this.world.minX) / 16 * t.waveNum, (this.world.maxX - this.world.minX) / 16 * t.waveNum);
      t.frequency = ((t.waveNum + 1) * SAMPLE_RATE) / FFT_SIZE;
      //   t.size = 10;

      t.heading = 90;
    });

    this.turtles.create(1, t => {
      t.setxy(this.scaleX(0.69), this.scaleY(1 - 0.3858));
      t.isSprite = true;
      t.size = 10;
      t.heading = 0;
    });

    this.turtles.create(1, t => {
      t.setxy(0, 0);
      t.name = 'mask';
      t.size = 100;
      t.z = 20;
      t.color = 'black';
      t.setShape('square');
    });

    this.patches.ask(p => {
      p.energy = 0;
      p.energyVelocity = 0;
    });

    this.turtles.setDefault('atEdge', 'bounce');
  }

  scaleX(f) {
    return f * (this.world.maxX - this.world.minX) + this.world.minX;
  }

  scaleY(f) {
    return f * (this.world.maxY - this.world.minY) + this.world.minY;
  }

  randomHeadings() {
    this.turtles.ask(t => {
      if (!t.isSprite && !t.name === 'mask') t.heading = Math.random() * 360;
    });
  }

  alignHeadings() {
    this.turtles.ask(t => {
      if (!t.isSprite && !t.name === 'mask') t.heading = this.turtleHeading;
    });
  }

  step() {
    this.ticks++;
    this.turtles.ask(t => {
      if (t.isSprite) {
        if (this.ticks % this.ticksPerSprite == 0) {
          this.currentSprite++;
          if (this.currentSprite >= sprites.length) this.currentSprite = 0;
          t.setSprite(sprites[this.currentSprite][0]);
          t.size = 20 * sprites[this.currentSprite][1];
          t.z = 3;
        }
      } else if (t.name === 'mask') {
        t.size = this.maskSize;
        t.x = this.maskX;
        t.y = this.maskY;
        t.heading = this.maskHeading;
      } else {
        //t.power = (this.buffer[t.waveNum] * Math.log(t.frequency)/Math.log(16*SAMPLE_RATE/FFT_SIZE));
        t.power = this.buffer[t.waveNum]; // * t.frequency;
        t.power *= Math.pow(t.power, 1) * this.ampScalar;
        t.power *= Math.cos(this.ticks * this.sinTick);
        t.size = this.showTurtles
          ? (this.buffer[t.waveNum] / 255.0) * 50 + 1
          : 0;
        t.patch.energy += t.power;
        //if (t.power !== 0)
        //     t.power = 0;
        t.forward((this.speed * t.frequency) / 10000);
      }
    });

    this.k = 1 - 0.01 * this.surfaceTension;

    this.patches.diffuse('energy', this.diffusionRate);
    this.patches.ask(p => {
      let neighborEnergy = 0;

      for (let i = 0; i < p.neighbors.length; i++)
        neighborEnergy += p.neighbors[i].energy;

      p.energyVelocity =
        this.friction *
        (p.energyVelocity +
          this.k * (neighborEnergy - p.energy * p.neighbors.length));
      //p.energyVelocity = (neighborEnergy - p.energy * p.neighbors.length) + p.energyVelocity;
      //this.totalEnergy += (
    });

    /*for (let i=0; i<this.turtles.length; i++)
          this.totalEnergy +=*/

    this.patches.ask(p => {
      p.energy += p.energyVelocity;
      if (this.randomNoise > 0)
        p.energy += (Math.random() / 2 - 0.5) * this.randomNoise;
      p.energy *= 1 - this.dissipationRate;

      if (Math.abs(p.energy) > this.energyLimit) {
        if (p.energy > 0) p.energy = this.energyLimit;
        else p.energy = -1 * this.energyLimit;
      }
    });

    this.patches.scaleColors(
      this.cmap,
      'energy',
      -1 * this.energyLimit,
      this.energyLimit
    );

    this.patches.ask(p => {
      if (
        p.x > this.scaleX(0.589) &&
        p.x < this.scaleX(0.792) &&
        p.y < this.scaleY(1 - 0.308) &&
        p.y > this.scaleY(1 - 0.463)
      )
        p.color = 0;
    });
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
