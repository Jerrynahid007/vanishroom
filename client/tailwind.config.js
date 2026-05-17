/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        fire: {
          400: '#FF6B35',
          500: '#FF4500',
          600: '#CC3700',
          700: '#992900',
          800: '#661B00',
        },
        ash: {
          100: '#F5F5F5',
          200: '#E0E0E0',
          300: '#C0C0C0',
          400: '#A0A0A0',
          500: '#787878',
          600: '#555555',
          700: '#3A3A3A',
          800: '#1A1A1A',
          900: '#0F0F0F',
        },
        void: '#0B0B0B',
        surface: '#1A1A1A',
        border: '#2A2A2A',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        'fluid-xl': 'clamp(1.5rem, 4vw, 2.5rem)',
        'fluid-2xl': 'clamp(2rem, 5vw, 3.5rem)',
      },
      boxShadow: {
        fire: '0 0 12px rgba(255,69,0,0.35)',
        'fire-lg': '0 0 24px rgba(255,69,0,0.5)',
        'fire-sm': '0 0 8px rgba(255,69,0,0.2)',
      },
      backgroundImage: {
        'fire-gradient': 'linear-gradient(135deg, #FF4500, #FF8C00)',
        'fire-gradient-hover': 'linear-gradient(135deg, #FF6B35, #FFA500)',
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-out',
        'slide-up': 'slideUp 0.2s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
        'shake': 'shake 0.4s ease-out',
        'pulse-soft': 'pulseSoft 2s ease-in-out infinite',
        'pulse-fast': 'pulseFast 1s ease-in-out infinite',
        'heartbeat': 'heartbeat 1s ease-in-out infinite',
        'float-up': 'floatUp 0.3s ease-out',
        'spin-slow': 'spin 3s linear infinite',
        'ember-in': 'emberIn 0.6s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.9)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        slideDown: {
          '0%': { opacity: '0', transform: 'translateY(-44px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '20%': { transform: 'translateX(-5px)' },
          '40%': { transform: 'translateX(5px)' },
          '60%': { transform: 'translateX(-5px)' },
          '80%': { transform: 'translateX(5px)' },
        },
        pulseSoft: {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.05)' },
        },
        pulseFast: {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.08)' },
        },
        heartbeat: {
          '0%, 100%': { transform: 'scale(1)', filter: 'drop-shadow(0 0 4px rgba(255,59,48,0.4))' },
          '50%': { transform: 'scale(1.1)', filter: 'drop-shadow(0 0 10px rgba(255,59,48,0.8))' },
        },
        floatUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        emberIn: {
          '0%': { opacity: '0', transform: 'scale(0.5)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
      },
    },
  },
  plugins: [],
}
