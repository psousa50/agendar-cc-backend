const path = require("path")
const webpack = require("webpack")

module.exports = {
  entry: {
    main: ["webpack-hot-middleware/client?reload=true&overlay=true", "./dist/client/index"],
  },
  mode: "development",
  output: {
    chunkFilename: "[name].js",
    filename: "[name].js",
    path: path.join(__dirname, "../../dist/client/static"),
    publicPath: "/static/",
  },
  optimization: {
    splitChunks: {
      cacheGroups: {
        vendor: {
          test: /node_modules/,
          chunks: "initial",
          name: "_vendor",
          enforce: true,
        },
      },
    },
  },
  resolve: {
    extensions: [".ts", ".tsx", ".js", ".jsx"],
  },
  plugins: [new webpack.HotModuleReplacementPlugin(), new webpack.NoEmitOnErrorsPlugin()],
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: [
          {
            loader: "ts-loader",
            options: {
              configFile: "tsconfig.webpack.json",
            },
          },
        ],
        exclude: /node_modules/,
        include: path.join(__dirname, "src"),
      },
      {
        test: /\.css$/,
        use: [
          { loader: "style-loader" },
          {
            loader: "css-loader",
            options: {
              importLoaders: 1,
              modules: {
                localIdentName: "[name]__[local]___[hash:base64:5]",
              },
            },
          },
        ],
        include: path.join(__dirname, "src"),
      },
    ],
  },
}
