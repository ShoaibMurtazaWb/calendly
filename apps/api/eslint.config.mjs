import base from "@sched/eslint-config/base";

export default [
  ...base,
  { ignores: ["dist/**", "jest.config.cjs"] },
];
