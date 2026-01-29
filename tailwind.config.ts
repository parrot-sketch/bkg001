import type { Config } from "tailwindcss";

export default {
	darkMode: ["class"],
	content: [
		"./pages/**/*.{js,ts,jsx,tsx,mdx}",
		"./components/**/*.{js,ts,jsx,tsx,mdx}",
		"./app/**/*.{js,ts,jsx,tsx,mdx}",
	],
	theme: {
    	extend: {
    		colors: {
    			brand: {
    				primary: '#1E3A5F',
    				secondary: '#bea032',
    				isabelline: '#F4F1E8',
    				almond: '#E8DCC6',
    				powder: '#B0D4E8',
    				dusk: '#6B8FA3'
    			},
    			background: 'hsl(var(--background))',
    			foreground: 'hsl(var(--foreground))',
    			card: {
    				DEFAULT: 'hsl(var(--card))',
    				foreground: 'hsl(var(--card-foreground))'
    			},
    			popover: {
    				DEFAULT: 'hsl(var(--popover))',
    				foreground: 'hsl(var(--popover-foreground))'
    			},
    			primary: {
    				DEFAULT: 'hsl(var(--primary))',
    				foreground: 'hsl(var(--primary-foreground))'
    			},
    			secondary: {
    				DEFAULT: 'hsl(var(--secondary))',
    				foreground: 'hsl(var(--secondary-foreground))'
    			},
    			muted: {
    				DEFAULT: 'hsl(var(--muted))',
    				foreground: 'hsl(var(--muted-foreground))'
    			},
    			accent: {
    				DEFAULT: 'hsl(var(--accent))',
    				foreground: 'hsl(var(--accent-foreground))'
    			},
    			destructive: {
    				DEFAULT: 'hsl(var(--destructive))',
    				foreground: 'hsl(var(--destructive-foreground))'
    			},
    			border: 'hsl(var(--border))',
    			input: 'hsl(var(--input))',
    			ring: 'hsl(var(--ring))',
    			chart: {
    				'1': 'hsl(var(--chart-1))',
    				'2': 'hsl(var(--chart-2))',
    				'3': 'hsl(var(--chart-3))',
    				'4': 'hsl(var(--chart-4))',
    				'5': 'hsl(var(--chart-5))'
    			},
    			'yale-blue': {
    				'100': '#000c10',
    				'200': '#001721',
    				'300': '#002331',
    				'400': '#002f41',
    				'500': '#003b53',
    				'600': '#0078a7',
    				'700': '#00b5fd',
    				'800': '#54ceff',
    				'900': '#a9e7ff',
    				DEFAULT: '#003b53'
    			},
    			'dark-teal': {
    				'100': '#001417',
    				'200': '#00272f',
    				'300': '#003b46',
    				'400': '#004e5e',
    				'500': '#005f73',
    				'600': '#00a3c4',
    				'700': '#13d8ff',
    				'800': '#62e5ff',
    				'900': '#b0f2ff',
    				DEFAULT: '#005f73'
    			},
    			'dark-cyan': {
    				'100': '#021d1e',
    				'200': '#043b3b',
    				'300': '#065859',
    				'400': '#087577',
    				'500': '#0a9396',
    				'600': '#0ed3d7',
    				'700': '#39eff2',
    				'800': '#7bf4f7',
    				'900': '#bdfafb',
    				DEFAULT: '#0a9396'
    			},
    			'pearl-aqua': {
    				'100': '#153229',
    				'200': '#2a6551',
    				'300': '#3f977a',
    				'400': '#61bd9e',
    				'500': '#94d2bd',
    				'600': '#a9dbca',
    				'700': '#bee4d7',
    				'800': '#d4ede5',
    				'900': '#e9f6f2',
    				DEFAULT: '#94d2bd'
    			},
    			'golden-orange': {
    				'100': '#301f00',
    				'200': '#603e00',
    				'300': '#905d00',
    				'400': '#c07d00',
    				'500': '#ee9b00',
    				'600': '#ffb327',
    				'700': '#ffc65d',
    				'800': '#ffd993',
    				'900': '#ffecc9',
    				DEFAULT: '#ee9b00'
    			},
    			'burnt-caramel': {
    				'100': '#281400',
    				'200': '#512901',
    				'300': '#793d01',
    				'400': '#a25202',
    				'500': '#ca6702',
    				'600': '#fd850d',
    				'700': '#fda349',
    				'800': '#fec286',
    				'900': '#fee0c2',
    				DEFAULT: '#ca6702'
    			},
    			'rusty-spice': {
    				'100': '#250c01',
    				'200': '#4a1801',
    				'300': '#702402',
    				'400': '#953102',
    				'500': '#bb3e03',
    				'600': '#f95104',
    				'700': '#fc7c41',
    				'800': '#fda880',
    				'900': '#fed3c0',
    				DEFAULT: '#bb3e03'
    			},
    			'oxidized-iron': {
    				'100': '#230604',
    				'200': '#460d07',
    				'300': '#69130b',
    				'400': '#8c190f',
    				'500': '#ae2012',
    				'600': '#e72b1a',
    				'700': '#ed6053',
    				'800': '#f3958d',
    				'900': '#f9cac6',
    				DEFAULT: '#ae2012'
    			},
    			'brown-red': {
    				'100': '#1f0708',
    				'200': '#3e0e0f',
    				'300': '#5d1417',
    				'400': '#7c1b1e',
    				'500': '#9b2226',
    				'600': '#cf2e33',
    				'700': '#dc6165',
    				'800': '#e89698',
    				'900': '#f3cacc',
    				DEFAULT: '#9b2226'
    			}
    		},
    		borderRadius: {
    			lg: 'var(--radius)',
    			md: 'calc(var(--radius) - 2px)',
    			sm: 'calc(var(--radius) - 4px)'
    		},
    		keyframes: {
    			'accordion-down': {
    				from: {
    					height: '0'
    				},
    				to: {
    					height: 'var(--radix-accordion-content-height)'
    				}
    			},
    			'accordion-up': {
    				from: {
    					height: 'var(--radix-accordion-content-height)'
    				},
    				to: {
    					height: '0'
    				}
    			}
    		},
    		animation: {
    			'accordion-down': 'accordion-down 0.2s ease-out',
    			'accordion-up': 'accordion-up 0.2s ease-out'
    		}
    	}
    },
	plugins: [
		require("tailwindcss-animate"),
		require("@tailwindcss/typography"),
	],
} satisfies Config;
