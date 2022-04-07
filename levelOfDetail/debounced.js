/**
 *
 *  Returns a debounced function that will wrap a function
 *  such that it will not be called more often than throttleRate
 *  and when it is called will call with the most recent arguments
 *
 * @export
 * @param {Function} fn
 * @param {Number} throttleRate
 * @returns a throttled and debounced function
 */

export function debounced(
    fn,
    throttleRate = 100,
    maxRetries = 10,
    showErrors = false
) {
    let timerID
    let callTime = 0 //eager call first time
    let callArgs
    let retry = 0
    let awaiting = false

    async function debouncedFunction(...args) {
        let currentTime = Date.now()
        let callDelay = Math.max(throttleRate - (currentTime - callTime), 0)
        callArgs = args

        if (timerID) {
            clearTimeout(timerID)
        }
        if (!awaiting) {
            timerID = setTimeout(async () => {
                try {
                    awaiting = true
                    await fn(...callArgs)
                    awaiting = false
                    retry = 0
                    timerID = null
                } catch (error) {
                    let msg = error.message
                    awaiting = false
                    if (showErrors) console.error(error)
                    // does the below code ever get called?
                    if (msg && msg.startsWith('retry')) {
                        retry += 1
                        console.log('debounced function retrying: ', retry)
                        if (retry < maxRetries) {
                            await debouncedFunction(...callArgs)
                        } else {
                            retry = 0
                        }
                    }
                } finally {
                    callTime = Date.now()
                }
            }, callDelay)
        }
    }

    // debouncedFunction.retry = function() {
    //     return retry
    // }

    return debouncedFunction
}

// add a standard retry throw
debounced.retry = function () {
    throw new Error('retry')
}
