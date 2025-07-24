"use strict";

// Do this as the first thing so that any code reading it knows the right env.
process.env.BABEL_ENV = "production";
process.env.NODE_ENV = "production";

// AGGRESSIVE MEMORY OPTIMIZATION: Force GC more frequently and limit heap
if (global.gc) {
  setInterval(() => {
    global.gc();
  }, 5000); // More frequent GC
}

// Set memory limits if not already set - KEEP YOUR ORIGINAL 400
process.env.NODE_OPTIONS =
  process.env.NODE_OPTIONS || "--max-old-space-size=400";

// Makes the script crash on unhandled rejections instead of silently
// ignoring them. In the future, promise rejections that are not handled will
// terminate the Node.js process with a non-zero exit code.
process.on("unhandledRejection", (err) => {
  throw err;
});

// Ensure environment variables are read.
require("../config/env");

const path = require("path");
const fs = require("fs-extra");
const webpack = require("webpack");
const configFactory = require("../config/webpack.config");
const paths = require("../config/paths");
const checkRequiredFiles = require("react-dev-utils/checkRequiredFiles");
const formatWebpackMessages = require("react-dev-utils/formatWebpackMessages");

// REMOVED: All non-essential imports (chalk, file size reporter, hosting instructions)
// These consume memory and aren't critical for the build

const useYarn = fs.existsSync(paths.yarnLockFile);

// Warn and crash if required files are missing
if (!checkRequiredFiles([paths.appHtml, paths.appIndexJs])) {
  process.exit(1);
}

// Generate configuration
const config = configFactory("production");

// EMERGENCY: Disable minification to save memory (makes bundle larger but uses less RAM)
config.optimization.minimize = false;

// ONLY CHANGE: Disable source maps (biggest single memory saver)
config.devtool = false;

// ONLY CHANGE: Minimal stats
config.stats = false;
config.performance = false;

// Keep everything else as default - don't mess with Terser settings

// Skip browser checking in memory-constrained environments
const shouldSkipBrowserCheck = process.env.SKIP_BROWSER_CHECK === "true";

const buildProcess = shouldSkipBrowserCheck
  ? Promise.resolve()
  : require("react-dev-utils/browsersHelper").checkBrowsers(
      paths.appPath,
      false
    );

buildProcess
  .then(() => {
    // Remove all content but keep the directory
    fs.emptyDirSync(paths.appBuild);
    // Merge with the public folder
    copyPublicFolder();
    // Start the webpack build
    return build();
  })
  .then(
    ({ warnings }) => {
      if (warnings.length) {
        console.log("Compiled with warnings.");
        // Only show first warning to save memory
        console.log(warnings[0]);
      } else {
        console.log("Compiled successfully.");
      }

      // Minimal output instead of detailed hosting instructions
      const buildFolder = path.relative(process.cwd(), paths.appBuild);
      console.log(`\nBuild completed. Files are ready in ${buildFolder}/`);

      // Force cleanup
      if (global.gc) {
        global.gc();
      }
    },
    (err) => {
      console.log("Failed to compile.");
      console.log(err.message || err);
      process.exit(1);
    }
  )
  .catch((err) => {
    if (err && err.message) {
      console.log(err.message);
    }
    process.exit(1);
  });

// Simplified build function
function build() {
  console.log("Creating optimized production build...");

  const compiler = webpack(config);
  return new Promise((resolve, reject) => {
    compiler.run((err, stats) => {
      // Force cleanup after each major operation
      if (global.gc) global.gc();

      let messages;
      if (err) {
        if (!err.message) {
          return reject(err);
        }
        messages = formatWebpackMessages({
          errors: [err.message],
          warnings: [],
        });
      } else {
        // ULTRA-MINIMAL stats to save memory
        messages = formatWebpackMessages(
          stats.toJson({
            all: false,
            warnings: true,
            errors: true,
            // Exclude everything else
          })
        );
      }

      if (messages.errors.length) {
        // Only keep the first error
        messages.errors.length = 1;
        return reject(new Error(messages.errors[0]));
      }

      // Simplified CI warning handling
      if (process.env.CI && messages.warnings.length) {
        const filteredWarnings = messages.warnings.filter(
          (w) => !/Failed to parse source map/.test(w)
        );
        if (filteredWarnings.length) {
          return reject(new Error("Build warnings treated as errors in CI"));
        }
      }

      // Minimal resolve data
      return resolve({
        warnings: messages.warnings.slice(0, 3), // Limit warnings shown
      });
    });
  });
}

function copyPublicFolder() {
  // Simple sync copy - less memory overhead than complex filtering
  try {
    fs.copySync(paths.appPublic, paths.appBuild, {
      dereference: true,
      filter: (file) => file !== paths.appHtml,
    });
  } catch (err) {
    console.log("Error copying public folder:", err.message);
  }
}
