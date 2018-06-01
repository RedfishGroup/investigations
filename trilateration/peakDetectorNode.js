/* FILENAME: peakDetectorNode.js
 * AUTHOR: Hank Wikle
 * LAST MODIFIED: 1 June 2018
 * DESCRIPTION: Implements custom audio node for peak detection using the Smoothed Z-Score Algorithm
 *              adapted from https://stackoverflow.com/a/22640362/6029703
 */

'use strict';

const IN_BUFFER_LENGTH = 256;
var peaks = 0;

function peakDetectorNode(context, lag, zscore, influence, verbose=false) {
    let threshold = 0;
    let mu = 0;
    let lagWindow = new Array(lag).fill(0);

    console.log('Threshold:', threshold);
    console.log('Mu:', mu);
    console.log('Lag window:', lagWindow);

    this.node = context.createScriptProcessor(IN_BUFFER_LENGTH, 1, 1);
    this.node.onaudioprocess = function(e) {
        if (verbose)
            console.log('           Beginning peak detection...');

        // Get input and output buffers
        var input = e.inputBuffer.getChannelData(0);
        var output = e.outputBuffer.getChannelData(0);
        
        // Smoothed Z-Score algorithm
       
        for (let i=0; i<IN_BUFFER_LENGTH; i++) {
            if (verbose) {
                console.log('           Lag Window:', lagWindow);
                console.log('           mu:', mu);
                console.log('           threshold:', threshold);
            }

            // Rectify signal

            let absAmp = Math.abs(input[i]);
            
            if (absAmp - mu > threshold) {
                output[i] = 1;
                //lagWindow.push(influence * absAmp + (1 - influence) * lagWindow[lag-1]);
                lagWindow.push(absAmp);
                console.log('Pushed:', lagWindow);
                peaks += 1;
                console.log('Peaks found:', peaks);
                //console.log('mu:', mu);
                //console.log('lagWindow:', lagWindow);
                if (verbose)
                    console.log('           Peak found:', context.currentTime);
            } else {
                output[i] = 0;
                lagWindow.push(absAmp);
                //console.log('No peak found');
            }

            lagWindow.shift();

            let meanStd = mean(lagWindow);
            mu = meanStd[0];
            threshold = zscore * meanStd[1];
            if (meanStd[1] === 0) {
                console.log('Lag window:', lagWindow);
                console.log('Mean:', mu);
                console.log('Std:', meanStd[1]);
                throw new Error('Std is zero');
            }
        }
    }
}

AudioContext.prototype.createPeakDetector = function(lag, threshold, influence, verbose) {
    return new peakDetectorNode(this, lag, threshold, influence, verbose);
}

function mean(v) {
    let total = 0;

    for (let i=0; i<v.length; i++)
        total += v[i];

    let mu = total / v.length;

    let sqTotal = 0;

    for (let i=0; i<v.length; i++)
        sqTotal += Math.pow(v[i] - mu, 2);

    let std = Math.sqrt(sqTotal / v.length);
    let result = [mu, std];

    return result;
}

