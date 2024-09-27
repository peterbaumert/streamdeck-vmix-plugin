module.exports = {
	printWidth: 180,
	semi: true,
	trailingComma: "none",
	useTabs: true,
	plugins: [require.resolve("@trivago/prettier-plugin-sort-imports")],
	importOrder: ["<THIRD_PARTY_MODULES>", "^[./]"],
	importOrderParserPlugins: ["typescript", '["decorators", { "decoratorsBeforeExport": true }]'],
	importOrderSeparation: true,
	importOrderSortSpecifiers: true,
	importOrderCaseInsensitive: true,
	overrides: [
		{
			files: "**/*.md",
			options: {
				useTabs: false,
				tabWidth: 4
			}
		}
	]
};
