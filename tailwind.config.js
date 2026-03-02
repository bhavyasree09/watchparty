/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Quicksand', 'sans-serif'],
      },
      colors: {
        cute: {
          pink: '#ffb6c1',
          blue: '#add8e6',
          yellow: '#ffffe0',
          mint: '#98ff98',
          lavender: '#e6e6fa',
          peach: '#ffdab9',
          dark: '#4a4a4a',
          text: '#5c5c5c',
          bg: '#fff0f5',
        }
      },
      boxShadow: {
        'cute': '0 10px 25px -5px rgba(255, 182, 193, 0.4), 0 8px 10px -6px rgba(255, 182, 193, 0.2)',
        'cute-inner': 'inset 0 2px 4px 0 rgba(255, 182, 193, 0.2)',
      }
    },
  },
  plugins: [],
}
