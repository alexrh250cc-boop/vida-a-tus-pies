/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                company: {
                    green: '#4ade80', // Verde claro
                    blue: '#3b82f6',  // Azul corporativo
                    dark: '#1e293b',
                    light: '#f8fafc'
                }
            }
        },
    },
    plugins: [],
}
