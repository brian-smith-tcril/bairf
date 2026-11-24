// Prototype page build. Run from the code worktree so loaders and packages resolve from its node_modules.
const path = require('path');
const { createRequire } = require('module');

const code = '/var/home/bsmith/code/reviews/frontend-app-learning-2159/code';
const req = createRequire(path.join(code, 'package.json'));
const webpack = req('webpack');

module.exports = {
  mode: 'development',
  devtool: false,
  context: __dirname,
  entry: path.join(__dirname, 'src/harness.tsx'),
  output: { path: path.join(__dirname, 'dist'), filename: 'bundle.js' },
  resolve: {
    extensions: ['.tsx', '.ts', '.jsx', '.js'],
    alias: { '@src': path.join(code, 'src') },
    modules: [path.join(code, 'node_modules')],
  },
  resolveLoader: { modules: [path.join(code, 'node_modules')] },
  module: {
    rules: [
      {
        test: /\.[jt]sx?$/,
        exclude: /node_modules/,
        loader: 'babel-loader',
        options: {
          babelrc: false,
          configFile: false,
          presets: [
            [req.resolve('@babel/preset-env'), { targets: 'last 1 chrome version' }],
            [req.resolve('@babel/preset-react'), { runtime: 'automatic' }],
            req.resolve('@babel/preset-typescript'),
          ],
        },
      },
      { test: /\.(svg|png|jpg|gif)$/, type: 'asset/inline' },
    ],
  },
  plugins: [
    new webpack.NormalModuleReplacementPlugin(/\.scss$/, path.join(__dirname, 'src/empty.js')),
    new webpack.DefinePlugin({ 'process.env': JSON.stringify({ NODE_ENV: 'development' }) }),
  ],
  performance: { hints: false },
  stats: 'errors-warnings',
};
