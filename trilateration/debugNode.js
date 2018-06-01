/* FILENAME: debugNode.js
 * AUTHOR: Hank Wikle
 * LAST MODIFIED: 1 June 2018
 * DESCRIPTION: Custom audio node for debugging
 */

const DEBUG_BUFFER_LEN = 256;

function debugNode(context, verbose) {
    console.log('DebugNode instantiated');
    this.node = context.createScriptProcessor(DEBUG_BUFFER_LEN, 1, 1);
    this.node.onaudioprocess = function(e) {
        var input = e.inputBuffer.getChannelData(0);
        var output = e.outputBuffer.getChannelData(0);

        if (verbose) {
           for (i=0; i<input.length; i++)
                if (input[i] != 0)
                    console.log(input[i]);
        }
    }
}

AudioContext.prototype.createDebugNode = function(verbose=true) {
    return new debugNode(this, verbose);
}
