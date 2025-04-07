/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // NextGen Ministry color palette
        nextgen: {
          blue: '#30cee4',     // Light blue primary
          orange: '#fb7610',   // Orange accent
          'blue-light': '#5cd7e9',
          'blue-dark': '#1ca7bc',
          'orange-light': '#fc9544',
          'orange-dark': '#e66300',
        },
        // Original colors kept for backward compatibility
        primary: '#30cee4',   // Updated to NextGen light blue
        secondary: '#fb7610', // Updated to NextGen orange
        accent: '#fb7610',    // Updated to NextGen orange
        dark: {
          DEFAULT: '#0F172A',
          lighter: '#1E293B',
          light: '#334155',
        },
        // Indigo shades maintained for existing components
        indigo: {
          50: '#eef2ff',
          100: '#e0e7ff',
          200: '#c7d2fe',
          300: '#a5b4fc',
          400: '#818cf8',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
          800: '#3730a3',
          900: '#312e81',
          950: '#1e1b4b',
        },
      },
      blur: {
        '3xl': '64px',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'noise': "url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADIAAAAyAQAAAAA2RLUcAAAAAnRSTlMAAHaTzTgAAAAZSURBVHgBYwAB/////w8GBgYGBqawIgDpiwl/vK4ElAAAAABJRU5ErkJggg==')",
      },
      backgroundColor: {
        'dark': '#0D1117',
      },
      // Add gradients specific to NextGen
      gradientColorStops: theme => ({
        'nextgen-gradient-start': '#30cee4',
        'nextgen-gradient-end': '#fb7610',
      }),
    },
  },
  plugins: [],
}