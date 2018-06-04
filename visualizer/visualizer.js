/* FILENAME: visualizer.js
 * AUTHOR: Hank Wikle
 * LAST MODIFIED: 4 June 2018
 * DESCRIPTION: Live audio visualizer for Ozomatli performance at Interplanetary Festival 06/07/2018
*/

// How do I include this code in my html file?

Model = ASapp3d.Model;
modelIO = ASapp3d.modelIO;
util = ASapp3d.util;

let abs = Math.abs;
let sin = Math.sin;
let max = Math.max;

const SAMPLE_RATE = 44100;
//const FFT_SIZE = 2*BINS;
const NUM_WAVES = 10;
const CANVAS_HEIGHT = 100;
const CANVAS_WIDTH = 500;

//var FREQS = []; // Choose one frequency per band on water tower, evenly spaced

//for (let i=0; i<BINS; i++)
//    FREQS.push(i*SAMPLE_RATE/FFT_SIZE);

const INIT_ENERGY = 100;
const DIFFUSION_AMT = 0.5;
const MAX_Y = CANVAS_HEIGHT / 2;

util.toWindow({Model, modelIO, util});

class Visualizer extends Model {
    setup(buffer) {
        this.ticks = 0;
        this.patchBreeds('nodes');
        this.patches.own('energy');
        this.nodes.own('phase restY waveNum');
        this.numWaves = buffer.length;
        //this.freqs = freqs;
        this.buffer = buffer;

        this.patches.ask(p => {
            if ((abs(p.y) < MAX_Y) && (p.y % this.numWaves === 0)) {
                p.sprout(1, this.nodes, n => {
                    n.restY = n.y;
                    n.waveNum = n.y / this.numWaves;
                });
                p.energy = util.randomInt(INIT_ENERGY) - INIT_ENERGY / 2; // Guessed at this function
            }
        });
        this.nodes.ask(n => {
            n.phase = n.x //* freqs[n.waveNum];
            n.hide(); //ht - hide turtle
            // ask patch at -1 0 [ask one-of turtles-here [create-link-with aNode (self)]]
        });
    }

    step() {
        this.nodes.ask(n => {
            n.energy += n.y - n.restY;
            n.y = n.restY + this.buffer[n.waveNum] * sin(this.ticks + n.phase); // Correct use of this?
        });

        this.patches.diffuse('energy', DIFFUSION_AMT);
        
        let s ='';
        for (let i=0; i<this.buffer.length; i++)
           s = s + `${this.buffer[i]} `;
        console.log(s);

        /*let maxEnergy = max(...patches.energy);

        this.patches.ask(p => {
            p.color = scaleColor('red', p.energy, -1*maxEnergy, maxEnergy); // Does this function exist?  }); */
        this.ticks++; // ++ in JS?
     }
}

const usingPuppeteer = navigator.userAgent === 'Puppeteer';

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
}
