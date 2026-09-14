import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';

export default tseslint.config(
  {ignores:['dist/**','coverage/**','artifacts/**','node_modules/**','src/generated/**']},
  {
    files:['scripts/**/*.ts','src/**/*.{ts,tsx}','tests/**/*.{ts,tsx}','vite.config.ts','vitest.config.ts'],
    languageOptions:{parser:tseslint.parser,parserOptions:{ecmaVersion:'latest',sourceType:'module',ecmaFeatures:{jsx:true}}},
    plugins:{'react-hooks':reactHooks,'react-refresh':reactRefresh},
    rules:{
      'react-hooks/rules-of-hooks':'error',
      'react-hooks/exhaustive-deps':'error',
      'react-refresh/only-export-components':['warn',{
        allowConstantExport:true,
        allowExportNames:['researchModes','recentResearch','badgeVariants','buttonVariants','tabsListVariants','toggleVariants'],
      }],
    },
  },
  {files:['src/main.tsx'],rules:{'react-refresh/only-export-components':'off'}},
);
