const merge = require('webpack-merge');
const ngAnnotatePlugin = require('ng-annotate-webpack-plugin');
const common = require('./webpack.common.js');
const UglifyJsPlugin = require('uglifyjs-webpack-plugin')
const CompressionPlugin = require("compression-webpack-plugin")

module.exports = merge(common, {
  plugins: [
    new ngAnnotatePlugin({
      add: true
    }),
    new CompressionPlugin({
      // test: ""
    })
  ],
  optimization: {
    minimizer: [
      new UglifyJsPlugin({
        cache: true,
        parallel: true,
        sourceMap: false,
        uglifyOptions: {
          mangle: {
            reserved: ["$super"]
          }
        }
      })
    ]
  },
  mode: 'production'
});
