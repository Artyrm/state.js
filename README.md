# Welcome to state.js

This is the version 5.0.0.
The previous stable release was 4.1.8.

To see the example code in action, click [here](https://cdn.rawgit.com/steelbreeze/state.js/master/examples/test.html).

If you're using state.js I'd love to hear about it; please e-mail me at mesmo@steelbreeze.net

## Version 5
Version 5 is a complete re-write from version 4.x.x:
- Much better performance by pre-computing all steps required during a state change. A clean/diry state is maintained  and re-computing possible if the machine strucutre changes.
- The API has changed to a fluent style enabling transitions to be defined in a more natural way.
- The code is authored in TypeScript; this hopefully will lead to better quality code. State machines using state.js can be authored in JavaScript of TypeScript.

## Introduction
State.js is a JavaScript implementation of a state machine library that supports most of the UML 2 state machine semantics.

State.js provides a hierarchical state machine capable of managing orthogonal regions; a variety of pseudo state kinds are implemented including initial, shallow & deep history, choice, junction and terminate.

## Versioning
The versions are in the form {major}.{minor}.{build}
* Major changes introduce significant new behaviour and will update the public API.
* Minor changes introduce features, bug fixes, etc, but note that they also may break the public API.
* Build changes can introduce features, though usually are fixes and performance enhancements; these will never break the public API.

## Documentation
* [User guide](https://github.com/steelbreeze/state.js/wiki/User-guide): and introduction to the core concepts in state.js and a getting stated guide.
* [API reference](https://github.com/steelbreeze/state.js/blob/master/docs/state-5.0.0.md): a detailed reference manual for the public application programming interface.
* Design document: a description of the internals of state.js and the design decisions made.

## Building state.js
There is no build, download a copy of state.js and use it in your site or project.
### Installing with node.js
state.js is available as a node packaged module; to install type:
`npm install state.js`

## Licence
State.js is dual-licenecd under the MIT and GPL v3 licences.
