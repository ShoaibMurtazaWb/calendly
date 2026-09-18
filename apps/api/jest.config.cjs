/** @type {import('jest').Config} */
module.exports = {
  moduleFileExtensions: ["js", "json", "ts"],
  rootDir: ".",
  testRegex: ".*\\.spec\\.ts$",
  transform: {
    "^.+\\.ts$": [
      "ts-jest",
      {
        tsconfig: "tsconfig.spec.json",
      },
    ],
  },
  testEnvironment: "node",
  moduleNameMapper: {
    "^@sched/api-contract$": "<rootDir>/../../packages/api-contract/src/index.ts",
  },
};
