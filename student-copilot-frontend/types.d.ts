declare module 'tailwindcss/lib/util/flattenColorPalette' {
  const flattenColorPalette: (colors: unknown) => Record<string, string>
  export default flattenColorPalette
}
