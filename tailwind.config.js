/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            fontFamily: {
                sans: ['Inter', 'sans-serif'],
            },
            colors: {
                company: {
                    green: '#4ade80', // Verde claro
                    blue: '#3b82f6',  // Azul corporativo
                    dark: '#1e293b',
                    light: '#f8fafc',
                    // Warm grays
                    'warm-gray': {
                        50: '#f9fafb',
                        100: '#f3f4f6',
                        200: '#e5e7eb',
                        300: '#d1d5db',
                    }
                },
                // Service specific colors
                service: {
                    consult: '#e0f2fe', // sky-100
                    nail: '#dcfce7',    // green-100
                    fungus: '#fef9c3',  // yellow-100
                    ortho: '#f3e8ff',   // purple-100
                    other: '#f1f5f9',   // slate-100
                }
            }
        },
    },
    plugins: [],
}
