import jsdoc from "eslint-plugin-jsdoc";
import prettier from "eslint-plugin-prettier";
import typescriptEslint from "@typescript-eslint/eslint-plugin";
import globals from "globals";
import tsParser from "@typescript-eslint/parser";
import path from "node:path";
import { fileURLToPath } from "node:url";
import js from "@eslint/js";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
	baseDirectory: __dirname,
	recommendedConfig: js.configs.recommended,
	allConfig: js.configs.all
});

export default [{
	ignores: [
		"**/.github/",
		"**/dist/",
		"**/node_modules/",
		"**/types/",
		"**/.git/",
		"**/.github/",
		"**/.vscode/",
		"**/io.baumert.vmix.sdPlugin/",
		"**/node_modules/",
		"**/package.json",
		"**/package-lock.json",
		"**/*.ts"
	],
}, {
	plugins: {
		jsdoc,
		prettier,
		"@typescript-eslint": typescriptEslint,
	},

	languageOptions: {
		globals: {
			...globals.node,
		},

		parser: tsParser,
	},

	rules: {
		indent: ["warn", "tab", {
			SwitchCase: 1,
		}],

		"jsdoc/check-tag-names": ["warn", {
			definedTags: ["jest-environment"],
		}],

		"jsdoc/no-undefined-types": 1,

		"jsdoc/require-jsdoc": ["warn", {
			contexts: [
				"ClassDeclaration",
				"PropertyDefinition",
				"MethodDefinition",
				"TSEnumDeclaration",
				"TSEnumMember",
				"TSPropertySignature",
				"TSTypeAliasDeclaration",
			],
		}],

		"@typescript-eslint/explicit-member-accessibility": ["error", {
			accessibility: "explicit",

			overrides: {
				constructors: "no-public",
			},
		}],

		"@typescript-eslint/explicit-function-return-type": "warn",

		"@typescript-eslint/member-ordering": ["warn", {
			default: {
				memberTypes: [
					"public-static-field",
					"public-abstract-field",
					"public-field",
					"protected-static-field",
					"protected-abstract-field",
					"protected-field",
					"private-static-field",
					"private-field",
					"public-constructor",
					"protected-constructor",
					"private-constructor",
					"signature",
					"call-signature",
					"public-static-get",
					"public-static-set",
					"public-abstract-get",
					"public-abstract-set",
					"public-get",
					"public-set",
					"protected-static-get",
					"protected-static-set",
					"protected-abstract-get",
					"protected-abstract-set",
					"protected-get",
					"protected-set",
					"private-static-get",
					"private-static-set",
					"private-get",
					"private-set",
					"public-static-method",
					"public-abstract-method",
					"public-method",
					"protected-static-method",
					"protected-abstract-method",
					"protected-method",
					"private-static-method",
					"private-method",
				],

				order: "alphabetically",
			},
		}],

		"@typescript-eslint/sort-type-constituents": "warn",
	},
}, {
	files: ["{src,tests}/**/__mocks__/*.ts", "{src,tests}/**/__tests__/*test.ts"],

	rules: {
		"jsdoc/require-jsdoc": ["warn", {
			contexts: ["MethodDefinition"],
		}],

		"@typescript-eslint/explicit-function-return-type": "off",
		"@typescript-eslint/no-explicit-any": "off",
	},
}];
