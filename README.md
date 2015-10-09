# Medium
CSP-style channel library using ES7 async/await keywords.

More documentation is coming, but the core functionality is ~160LOC, so just 
read it.

####Installation

```javascript
npm install medium
```

####Why another CSP library?
There is currently only one with any traction ([js-csp](https://github.com/ubolonton/js-csp)), so another interpretation is a chance to view the subject from a different angle. Specifically, Medium tries to take CSP further into the future by embracing ES7 async/await as well as the trend towards choosing promises over callbacks. Relying on promises means that we can easily interact with other generator libraries, such as Koa.

####What the heck is CSP? What are channels?
I am hoping to write a bit more on this sometime, but for now, there are loads of great articles by smarter people than me, explaining the ins and outs, as well as the motivation of using "Communicating Sequential Processes".

* [CSP and transducers in JavaScript](http://phuu.net/2014/08/31/csp-and-transducers.html)
* [Taming the Asynchronous Beast with CSP Channels in JavaScript](http://jlongster.com/Taming-the-Asynchronous-Beast-with-CSP-in-JavaScript)
* Check out the documentation at the above mentioned js-csp library. Different implementation, but the API and core principles are quite aligned.

##API 

###chan(numOrBuffer, xducer=null, opts={})
###put(ch, val)
###take(ch)
###go(async function)
###sleep(ms)
###close(ch)
###clone(ch)
###any(ch1, ch2, ch3, ...)
###repeat(async function, seed=null)
###repeatTake(ch, async function, seed=null)
###buffers
- unbuffered()
- fixed(num)
- sliding(num)
- dropping(num)

More documentation is coming soon. 

