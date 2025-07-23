const react = require('eslint-plugin-react')
const js = require("@eslint/js");
const ts = require('typescript-eslint');

module.exports = [
    {
        "ignores": ["scripts/*", "config/*", 'src/client/*', '*config*'],
    },
    js.configs.recommended,
    ...ts.configs.recommended,
    {
        "files": ["src/**/*.ts", "src/**/*.tsx"],
        "plugins": { react, '@typescript-eslint': ts.plugin },
    }
];