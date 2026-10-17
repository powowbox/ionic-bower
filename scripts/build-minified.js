'use strict';

const fs = require('node:fs');
const path = require('node:path');
const uglify = require('uglify-js');

for (const name of ['ionic', 'ionic.bundle']) {
  const file = path.join(__dirname, '..', 'js', name + '.js');
  const result = uglify.minify(fs.readFileSync(file, 'utf8'), {
    output: { comments: /^!|@license|@preserve/ }
  });
  if (result.error) {
    throw result.error;
  }
  fs.writeFileSync(file.replace(/\.js$/, '.min.js'), result.code + '\n');
}
