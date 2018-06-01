/* FILENAME: audio.js
 * AUTHOR: Hank Wikle
 * LAST MODIFIED: 1 June 2018
 * DESCRIPTION: Finds the time values of peaks in the given audio file (unfinished).
 *
 * NEXT STEPS: Learn how to use buffers/streaming, clean up global variables
 */

'use strict';

const LAG = 5;
const ZSCORE = 50;
const INFLUENCE = 0.5;
const SAMPLE_RATE = 44100;
const BUFFER_LENGTH = SAMPLE_RATE;
const VERBOSE = false;

window.onload = function() {

    // Set up Web Audio context and retrieve HTML audio object
    
    if (VERBOSE)
        console.log('Reading file...');

    let reader = new FileReader();
    let audio = document.getElementById('input').files[0];
    reader.readAsArrayBuffer(audio);
    
    if (VERBOSE)
        console.log('Initializing context...');

    //let offCtx = new OfflineAudioContext(1, BUFFER_LENGTH, SAMPLE_RATE);
    let onCtx = new AudioContext();
    //let source = offCtx.createBufferSource();
    let source = onCtx.createBufferSource();
    //let detector = offCtx.createPeakDetector(LAG, ZSCORE, INFLUENCE, VERBOSE); 
    let debug = onCtx.createDebugNode();

    //source.connect(detector.node);
    source.connect(debug.node);

    reader.onload = function() {
        if (VERBOSE)
            console.log('   Decoding audio...');
        
        /*offCtx.decodeAudioData(this.result, function(buffer) {
            if (VERBOSE)
                console.log('   Audio decoded successfully!');
            source.buffer = buffer;
            source.start();
            if (VERBOSE)
                console.log('       Rendering audio...');
            offCtx.startRendering().then(function(renderedBuffer) {
                if (VERBOSE)
                    console.log('       Rendering completed successfully!');
                let peaks = renderedBuffer;
            });
        }); */ 

        onCtx.decodeAudioData(this.result, function(buffer) {
            console.log('Decoding audio...');
            source.buffer = buffer;
            source.start();
        }); 
    };
}

function sum(v) {
    let total = 0;
    for (let i=0; i<v.length; i++)
        total += v[i];

    return total;
}
