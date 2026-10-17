# ionic-bower

Bower repository for [Ionic Framework](http://github.com/driftyco/ionic)

### Usage

Include `js/ionic.bundle.js` to get ionic and all of its dependencies.

Alternatively, include the individual ionic files with the dependencies separately.

### Versions

To install the latest stable version, `bower install driftyco/ionic-bower#v1.1.1`

To install the latest nightly release, `bower install driftyco/ionic-bower#master`

### iOS input clone cleanup

`ionic.views.Scroll.scrollTo()` restores cloned text inputs after a scroll
that finishes without an animation, including a target clamped to the current
scroll limit. Cleanup waits for pending clone rendering and skips an active
animation, drag, or deceleration. Animated scrolling retains its existing
completion cleanup.

Run the regression tests with Node.js 18 or newer:

```sh
node --test tests/input-clone.test.js
```

Both `ionic.js` and `ionic.bundle.js` contain the core implementation and must
remain synchronized. Rebuild their minified distributions with UglifyJS 3.4.10
available through `node_modules` or `NODE_PATH`:

```sh
node scripts/build-minified.js
```

The equivalent temporary login-scoped patch was verified on an iPhone on
2026-10-17, including repeated keyboard closing, reopening, and typing. The
packaged library still requires validation after rebuilding the application.
