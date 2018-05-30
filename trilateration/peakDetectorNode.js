/* FILENAME: peakDetectorNode.js
 * AUTHOR: Hank Wikle
 * LAST MODIFIED: 30 May 2018
 * DESCRIPTION: Implements custom audio node for peak detection
 */

/*
class PeakDetectorNode extends AudioNode {
    connect() {
        console.log('connected!');
        super.connect.apply(this, arguments);
    }
}
*/

function peakDetectorNode(context, lag, zscore, influence) {
    this.lag = lag;
    this.zscore = zscore;
    this.influence = influence;
    this.threshold;
    this.mean;
    this.filteredInput = [];

    this.node = context.createScriptProcessor(256, 1, 1);
    this.node.onaudioprocess = function(e) {
        let input = e.inputBuffer.getChannelData(0);
        let output = e.outputBuffer.getChannelData(0);

        if (this.buffer.length == 5 && Math.abs(input - this.mean) > this.threshold) {
            output[0] = 1;
            this.filteredInput.push(influence * input - (1 - influence) * filteredInput[-1]);
            this.filteredInput.shift();
        } else {
            output[0] = 0;
            this.filteredInput.push(input);

            if (this.filteredInput.length > 5) {
                this.filteredInput.shift();
            }
        }

        meanStd = mean(filteredInput);
        this.mean = meanStd[0];
        this.threshold = this.threshold * meanStd[1];
    }
}

AudioContext.prototype.createPeakDetector = function(lag, threshold, influence) {
    return new peakDetectorNode(this, lag, threshold, influence);
}

function mean(v) {
    let total = 0;

    for (let i=0; i<v.length; i++)
        total += v[i];

    let mean = total / v.length;

    let sqTotal = 0;

    for (let i=0; i<v.length; i++)
        sqTotal += Math.pow((v[i] - mean), 2);

    let std = sqTotal / v.length;
    result = [mean, std];

    return result;
}

