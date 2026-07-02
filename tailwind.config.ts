import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}", "./components/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        careOrange: "#ff661e",
        panelGray: "#f1f1f1",
        cardCream: "#fbf7ef",
      },
      borderRadius: {
        panel: "12px",
      },
      boxShadow: {
        panel: "0 4px 4px rgba(0, 0, 0, 0.2)",
      },
    },
  },
  plugins: [],
};

export default config;
