"use strict";

// Do this as the first thing so that any code reading it knows the right env.
process.env.BABEL_ENV = "production";
process.env.NODE_ENV = "production";

// MEMORY OPTIMIZATION: Force garbage collection more aggressively
if (global.gc) {
  setInterval(() => {
    global.gc();
  }, 10000); // GC every 10 seconds
}

// Makes the script crash on unhandled rejections instead of silently
// ignoring them. In the future, promise rejections that are not handled will
// terminate the Node.js process with a non-zero exit code.
process.on("unhandledRejection", (err) => {
  throw err;
});

// Ensure environment variables are read.
require("../config/env");

const path = require("path");
const chalk = require("react-dev-utils/chalk");
const fs = require("fs-extra");
// REMOVED: const bfj = require('bfj'); // This was memory intensive
const webpack = require("webpack");
const configFactory = require("../config/webpack.config");
const paths = require("../config/paths");
const checkRequiredFiles = require("react-dev-utils/checkRequiredFiles");
const formatWebpackMessages = require("react-dev-utils/formatWebpackMessages");
// Removed unused imports for memory optimization
const printHostingInstructions = require("react-dev-utils/printHostingInstructions");
const printBuildError = require("react-dev-utils/printBuildError");

// Keep minimal FileSizeReporter for compatibility
const FileSizeReporter = require("react-dev-utils/FileSizeReporter");
const measureFileSizesBeforeBuild = () => null; // Stub function
const useYarn = fs.existsSync(paths.yarnLockFile);

// Removed file size warning constants (not needed without reporting)

const isInteractive = process.stdout.isTTY;

// Warn and crash if required files are missing
if (!checkRequiredFiles([paths.appHtml, paths.appIndexJs])) {
  process.exit(1);
}

// Removed stats JSON functionality to save memory

// Generate configuration
const config = configFactory("production");

// MEMORY OPTIMIZATION: Modify webpack config for lower memory usage
config.optimization = {
  ...config.optimization,
  // Reduce parallelism to save memory
  minimize: true,
  // Process chunks sequentially instead of parallel
  splitChunks: {
    ...config.optimization.splitChunks,
    maxAsyncRequests: 5, // Reduced from default
    maxInitialRequests: 3, // Reduced from default
  },
};

// MEMORY OPTIMIZATION: Reduce webpack stats verbosity
config.stats = "errors-warnings"; // Instead of 'normal'
config.performance = {
  ...config.performance,
  hints: false, // Disable performance hints to save memory
};

// We require that you explicitly set browsers and do not fall back to
// browserslist defaults.
const { checkBrowsers } = require("react-dev-utils/browsersHelper");
checkBrowsers(paths.appPath, isInteractive)
  .then(() => {
    // MEMORY OPTIMIZATION: Skip file size measurement in memory-constrained environments
    if (process.env.SKIP_SIZE_REPORTING === "true") {
      return null;
    }
    // First, read the current file sizes in build directory.
    // This lets us display how much they changed later.
    return measureFileSizesBeforeBuild(paths.appBuild);
  })
  .then((previousFileSizes) => {
    // previousFileSizes will be null since we skip measurement
    // Remove all content but keep the directory so that
    // if you're in it, you don't end up in Trash
    fs.emptyDirSync(paths.appBuild);
    // Merge with the public folder
    copyPublicFolder();
    // Start the webpack build
    return build(previousFileSizes);
  })
  .then(
    ({ stats, previousFileSizes, warnings }) => {
      if (warnings.length) {
        console.log(chalk.yellow("Compiled with warnings.\n"));
        console.log(warnings.join("\n\n"));
        console.log(
          "\nSearch for the " +
            chalk.underline(chalk.yellow("keywords")) +
            " to learn more about each warning."
        );
        console.log(
          "To ignore, add " +
            chalk.cyan("// eslint-disable-next-line") +
            " to the line before.\n"
        );
      } else {
        console.log(chalk.green("Compiled successfully.\n"));
      }

      // File size reporting removed to save memory
      console.log();

      const appPackage = require(paths.appPackageJson);
      const publicUrl = paths.publicUrlOrPath;
      const publicPath = config.output.publicPath;
      const buildFolder = path.relative(process.cwd(), paths.appBuild);
      printHostingInstructions(
        appPackage,
        publicUrl,
        publicPath,
        buildFolder,
        useYarn
      );
    },
    (err) => {
      const tscCompileOnError = process.env.TSC_COMPILE_ON_ERROR === "true";
      if (tscCompileOnError) {
        console.log(
          chalk.yellow(
            "Compiled with the following type errors (you may want to check these before deploying your app):\n"
          )
        );
        printBuildError(err);
      } else {
        console.log(chalk.red("Failed to compile.\n"));
        printBuildError(err);
        process.exit(1);
      }
    }
  )
  .catch((err) => {
    if (err && err.message) {
      console.log(err.message);
    }
    process.exit(1);
  });

// Create the production build and print the deployment instructions.
function build(previousFileSizes) {
  console.log("Creating an optimized production build...");

  const compiler = webpack(config);
  return new Promise((resolve, reject) => {
    compiler.run((err, stats) => {
      let messages;
      if (err) {
        if (!err.message) {
          return reject(err);
        }

        let errMessage = err.message;

        // Add additional information for postcss errors
        if (Object.prototype.hasOwnProperty.call(err, "postcssNode")) {
          errMessage +=
            "\nCompileError: Begins at CSS selector " +
            err["postcssNode"].selector;
        }

        messages = formatWebpackMessages({
          errors: [errMessage],
          warnings: [],
        });
      } else {
        // MEMORY OPTIMIZATION: Use minimal stats instead of full stats
        messages = formatWebpackMessages(
          stats.toJson({
            all: false,
            warnings: true,
            errors: true,
            // Exclude memory-intensive stats
            assets: false,
            chunks: false,
            modules: false,
            children: false,
          })
        );
      }
      if (messages.errors.length) {
        // Only keep the first error. Others are often indicative
        // of the same problem, but confuse the reader with noise.
        if (messages.errors.length > 1) {
          messages.errors.length = 1;
        }
        return reject(new Error(messages.errors.join("\n\n")));
      }
      if (
        process.env.CI &&
        (typeof process.env.CI !== "string" ||
          process.env.CI.toLowerCase() !== "false") &&
        messages.warnings.length
      ) {
        // Ignore sourcemap warnings in CI builds. See #8227 for more info.
        const filteredWarnings = messages.warnings.filter(
          (w) => !/Failed to parse source map/.test(w)
        );
        if (filteredWarnings.length) {
          console.log(
            chalk.yellow(
              "\nTreating warnings as errors because process.env.CI = true.\n" +
                "Most CI servers set it automatically.\n"
            )
          );
          return reject(new Error(filteredWarnings.join("\n\n")));
        }
      }

      const resolveArgs = {
        stats,
        previousFileSizes,
        warnings: messages.warnings,
      };

      // Stats JSON generation removed to save memory
      return resolve(resolveArgs);
    });
  });
}

function copyPublicFolder() {
  fs.copySync(paths.appPublic, paths.appBuild, {
    dereference: true,
    filter: (file) => file !== paths.appHtml,
  });
}
