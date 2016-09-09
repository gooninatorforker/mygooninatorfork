var path = require('path');

module.exports = {
  entry: 'src_gooninate/main',
  output: {
    filename: 'js/gooninate.js'
  },
  module: {
    loaders: [
      {
        test: /\.js$/,
        loader: 'babel-loader',
        query: {
          presets: ['es2015', 'react']
        }
      }
    ]
  },
  externals: {
    "parse": "Parse"
  },
  resolveLoader: {
    modulesDirectories: ['node_modules']
  },
  resolve: {
    extensions: ['.js'] ,
    root: [
      path.resolve('./'),
      path.resolve('./src_gooninate'),
      path.resolve('./node_modules')
    ]
  }
};