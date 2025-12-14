export default {
  plugins: {
    'postcss-import': {},
    'tailwindcss': {},
    'postcss-preset-env': {
      stage: 3,
      features: {
        'nesting-rules': true,
        'custom-properties': false,
      },
    },
    'autoprefixer': {},
  },
}
