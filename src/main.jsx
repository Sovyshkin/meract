import { createRoot } from "react-dom/client";

import App from "./app/App.jsx";
import "./app/index.css";
import "./styles/mobile-fixes.css";

createRoot(document.getElementById("root")).render(<App />);
